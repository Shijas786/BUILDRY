'use server'

import { Connection, PublicKey } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

/** Surface Bags/axios bodies; SDK often only sets message to "Request failed with status 400". */
function formatBagsLaunchError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return err instanceof Error ? err.message : 'Failed to prepare launch transaction'
  }
  const e = err as Error & {
    status?: number
    data?: unknown
    response?: { status?: number; data?: unknown }
  }
  const fromObj = (d: unknown): string | null => {
    if (d == null) return null
    if (typeof d === 'string') return d.trim() || null
    if (typeof d === 'object') {
      const o = d as Record<string, unknown>
      if (typeof o.error === 'string' && o.error.trim()) return o.error.trim()
      if (typeof o.message === 'string' && o.message.trim()) return o.message.trim()
      try {
        return JSON.stringify(d)
      } catch {
        return null
      }
    }
    return null
  }
  const a = fromObj(e.data)
  if (a) return a
  const b = fromObj(e.response?.data)
  if (b) return b
  if (e.message && !/^Request failed with status \d+$/.test(e.message)) return e.message
  const status = e.status ?? e.response?.status
  if (status === 400) {
    return 'Bags API rejected the request (400). Often the token image URL is not publicly reachable, or the API key / fee wallet env is wrong. Check Vercel logs for details.'
  }
  return e.message || 'Failed to prepare launch transaction'
}

/** Bags servers must fetch this URL; Firebase private URLs and some CDNs fail. */
async function assertTokenImageUrlReachable(imageUrl: string): Promise<void> {
  const trimmed = imageUrl.trim()
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Token image must be a valid URL.')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Token image must use https:// so Bags can fetch it.')
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const r = await fetch(trimmed, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Range: 'bytes=0-8191', Accept: 'image/*,*/*' },
    })
    clearTimeout(timer)
    if (!r.ok && r.status !== 206) {
      throw new Error(
        `Token image URL returned HTTP ${r.status}. Use a direct public image (e.g. GitHub avatar, imgur, or a public Firebase Storage URL).`
      )
    }
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Token image URL timed out. Try a smaller or faster-hosted image.')
    }
    throw err
  }
}

export async function prepareLaunchTransaction(
  name: string,
  symbol: string,
  description: string,
  imageUrl: string,
  walletBase58: string,
  userId?: string
) {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const apiKey = process.env.BAGS_API_KEY
    if (!apiKey) throw new Error('Missing Bags API Key on server')

    const connection = new Connection(rpcUrl, 'confirmed')
    const bags = new BagsSDK(apiKey, connection)
    const walletPk = new PublicKey(walletBase58)
    const platformWalletBase58 = process.env.PLATFORM_TREASURY_WALLET?.trim()
    const platformFeeRaw = Number(process.env.PLATFORM_FEE_BPS ?? 100)
    const platformFeeBps = Number.isFinite(platformFeeRaw)
      ? Math.max(0, Math.min(10000, Math.floor(platformFeeRaw)))
      : 100

    const feeClaimers: { user: PublicKey; userBps: number }[] = []
    if (platformWalletBase58 && platformFeeBps > 0) {
      try {
        const platformWalletPk = new PublicKey(platformWalletBase58)
        feeClaimers.push({ user: platformWalletPk, userBps: platformFeeBps })
      } catch {
        throw new Error(
          'PLATFORM_TREASURY_WALLET is not a valid Solana address. Fix it in env or remove it to launch without a platform fee.'
        )
      }
    }
    feeClaimers.push({
      user: walletPk,
      userBps: 10000 - (feeClaimers[0]?.userBps || 0),
    })

    await assertTokenImageUrlReachable(imageUrl)

    // 1. Create Metadata via Bags Pipeline
    const metadata = await bags.tokenLaunch.createTokenInfoAndMetadata({
      name,
      symbol,
      description,
      imageUrl: imageUrl.trim(),
    })

    // 2. Configure Fee Share (small platform cut + majority to creator)
    const feeConfig = await bags.config.createBagsFeeShareConfig({
      feeClaimers,
      payer: walletPk,
      baseMint: new PublicKey(metadata.tokenMint),
    })

    // 3. Assemble Final Deployment Transaction
    const launchTx = await bags.tokenLaunch.createLaunchTransaction({
      metadataUrl: metadata.tokenMetadata,
      tokenMint: new PublicKey(metadata.tokenMint),
      launchWallet: walletPk,
      initialBuyLamports: 0,
      configKey: feeConfig.meteoraConfigKey
    })

    // Serialize to pass to the client securely
    const serializedTx = Buffer.from(launchTx.serialize()).toString('base64')

    if (userId && isFirebaseAdminConfigured && adminDb) {
      try {
        const now = Date.now()
        await adminDb.collection(FS.POSTS).add({
          author_id: userId,
          content: `Just launched $${symbol} — ${name}! ${description}`,
          post_type: 'launch',
          images: [],
          milestone_title: `Launched $${symbol}`,
          milestone_category: 'launch',
          project_id: null,
          link_url: null,
          likes_count: 0,
          comments_count: 0,
          created_at: now,
        })
      } catch (postErr) {
        console.error('Auto-post on launch failed:', postErr)
      }
    }

    return {
      success: true,
      transactionBase64: serializedTx,
      tokenMint: metadata.tokenMint,
    }
  } catch (err: unknown) {
    console.error('Bags Server Action Error:', err)
    return { success: false, error: formatBagsLaunchError(err) }
  }
}

/** Serialized legacy transactions for the connected wallet to sign and send (creator fee claim). */
export async function prepareClaimFeeTransactions(walletBase58: string, tokenMint: string) {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const apiKey = process.env.BAGS_API_KEY
    if (!apiKey) throw new Error('Missing Bags API Key on server')

    const connection = new Connection(rpcUrl, 'confirmed')
    const bags = new BagsSDK(apiKey, connection)
    const walletPk = new PublicKey(walletBase58)
    const mintPk = new PublicKey(tokenMint)

    const txs = await bags.fee.getClaimTransactions(walletPk, mintPk)
    const transactionsBase64 = txs.map((tx) =>
      Buffer.from(
        tx.serialize({ requireAllSignatures: false, verifySignatures: false })
      ).toString('base64')
    )

    return { success: true as const, transactionsBase64 }
  } catch (err: any) {
    console.error('prepareClaimFeeTransactions:', err)
    return {
      success: false as const,
      error: err.message || 'Failed to prepare claim transactions',
    }
  }
}
