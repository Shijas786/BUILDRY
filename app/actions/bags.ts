'use server'

import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { BagsSDK, sendBundleAndConfirm } from '@bagsfm/bags-sdk'
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
  const friendly = (s: string) => {
    if (s.includes('duplicate public keys')) {
      return 'Bags rejected the fee split: the same wallet was listed twice as a fee claimer. Your PLATFORM_TREASURY_WALLET must be a different address than the wallet launching the token (or unset PLATFORM_TREASURY_WALLET to give 100% of fees to the creator).'
    }
    return s
  }

  const a = fromObj(e.data)
  if (a) return friendly(a)
  const b = fromObj(e.response?.data)
  if (b) return friendly(b)
  if (e.message && !/^Request failed with status \d+$/.test(e.message)) return friendly(e.message)
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

function bagsSdk(): BagsSDK {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const apiKey = process.env.BAGS_API_KEY
  if (!apiKey) throw new Error('Missing Bags API Key on server')
  return new BagsSDK(apiKey, new Connection(rpcUrl, 'confirmed'), 'confirmed')
}

function buildFeeClaimers(walletPk: PublicKey): { user: PublicKey; userBps: number }[] {
  const platformWalletBase58 = process.env.PLATFORM_TREASURY_WALLET?.trim()
  const platformFeeRaw = Number(process.env.PLATFORM_FEE_BPS ?? 100)
  const platformFeeBps = Number.isFinite(platformFeeRaw)
    ? Math.max(0, Math.min(10000, Math.floor(platformFeeRaw)))
    : 100

  const feeClaimers: { user: PublicKey; userBps: number }[] = []
  if (platformWalletBase58 && platformFeeBps > 0) {
    try {
      const platformWalletPk = new PublicKey(platformWalletBase58)
      // Bags rejects duplicate pubkeys in claimers; treasury cannot match the creator wallet.
      if (!platformWalletPk.equals(walletPk)) {
        feeClaimers.push({ user: platformWalletPk, userBps: platformFeeBps })
      }
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
  return feeClaimers
}

/**
 * Bags Token Launch v2: metadata + fee-share config API step. The wallet must sign & submit
 * the returned bundles (Jito) and transactions before calling `prepareBagsLaunchDeployTx`.
 */
export async function prepareBagsLaunchFeeShare(
  name: string,
  symbol: string,
  description: string,
  imageUrl: string,
  walletBase58: string
) {
  try {
    const bags = bagsSdk()
    const walletPk = new PublicKey(walletBase58)
    const feeClaimers = buildFeeClaimers(walletPk)

    await assertTokenImageUrlReachable(imageUrl)

    const metadata = await bags.tokenLaunch.createTokenInfoAndMetadata({
      name,
      symbol,
      description,
      imageUrl: imageUrl.trim(),
    })

    const feeConfig = await bags.config.createBagsFeeShareConfig({
      feeClaimers,
      payer: walletPk,
      baseMint: new PublicKey(metadata.tokenMint),
    })

    const feeShareBundlesBase64 = (feeConfig.bundles ?? []).map((bundle) =>
      bundle.map((tx) => Buffer.from(tx.serialize()).toString('base64'))
    )
    const feeShareTransactionsBase64 = (feeConfig.transactions ?? []).map((tx) =>
      Buffer.from(tx.serialize()).toString('base64')
    )

    if (
      feeShareBundlesBase64.every((b) => b.length === 0) &&
      feeShareTransactionsBase64.length === 0
    ) {
      throw new Error(
        'Bags returned no fee-share transactions to sign. Try again or contact Bags support.'
      )
    }

    return {
      success: true as const,
      tokenMint: metadata.tokenMint,
      metadataUrl: metadata.tokenMetadata,
      meteoraConfigKey: feeConfig.meteoraConfigKey.toBase58(),
      feeShareBundlesBase64,
      feeShareTransactionsBase64,
    }
  } catch (err: unknown) {
    console.error('prepareBagsLaunchFeeShare:', err)
    return { success: false as const, error: formatBagsLaunchError(err) }
  }
}

/** After fee-share txs confirm on-chain, build the final token launch transaction for the wallet to sign. */
export async function prepareBagsLaunchDeployTx(
  metadataUrl: string,
  tokenMint: string,
  walletBase58: string,
  meteoraConfigKeyBase58: string,
  initialBuyLamports = 0
) {
  try {
    const bags = bagsSdk()
    const walletPk = new PublicKey(walletBase58)
    const launchTx = await bags.tokenLaunch.createLaunchTransaction({
      metadataUrl,
      tokenMint: new PublicKey(tokenMint),
      launchWallet: walletPk,
      initialBuyLamports,
      configKey: new PublicKey(meteoraConfigKeyBase58),
    })
    const transactionBase64 = Buffer.from(launchTx.serialize()).toString('base64')
    return { success: true as const, transactionBase64, tokenMint }
  } catch (err: unknown) {
    console.error('prepareBagsLaunchDeployTx:', err)
    return { success: false as const, error: formatBagsLaunchError(err) }
  }
}

const FALLBACK_JITO_TIP_SOL = 0.015

/** Suggested Jito tip (lamports) for fee-share bundles; used when building the tip tx on the client. */
export async function getBagsJitoTipLamports() {
  try {
    const bags = bagsSdk()
    const rec = await bags.solana.getJitoRecentFees().catch(() => null)
    const pct = rec && typeof rec === 'object' ? (rec as { landed_tips_95th_percentile?: number }).landed_tips_95th_percentile : undefined
    if (typeof pct === 'number' && pct > 0) {
      return { success: true as const, lamports: Math.floor(pct * LAMPORTS_PER_SOL) }
    }
  } catch {
    /* use fallback */
  }
  return {
    success: true as const,
    lamports: Math.floor(FALLBACK_JITO_TIP_SOL * LAMPORTS_PER_SOL),
  }
}

/** Relay wallet-signed Jito bundle txs through Bags (API key stays server-side). */
export async function submitBagsSignedJitoBundle(signedTransactionsBase64: string[]) {
  try {
    if (!signedTransactionsBase64.length) {
      return { success: false as const, error: 'No transactions in bundle' }
    }
    const bags = bagsSdk()
    const txs = signedTransactionsBase64.map((b64) =>
      VersionedTransaction.deserialize(Buffer.from(b64, 'base64'))
    )
    const bundleId = await sendBundleAndConfirm(txs, bags)
    return { success: true as const, bundleId }
  } catch (err: unknown) {
    console.error('submitBagsSignedJitoBundle:', err)
    return { success: false as const, error: formatBagsLaunchError(err) }
  }
}

/** Fire after the launch transaction confirms so the feed reflects a real deployment. */
export async function recordLaunchMilestonePost(
  userId: string,
  name: string,
  symbol: string,
  description: string
) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return { success: true as const, skipped: true as const }
  }
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
    return { success: true as const, skipped: false as const }
  } catch (postErr) {
    console.error('recordLaunchMilestonePost:', postErr)
    return { success: false as const, error: 'Could not save launch post' }
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
