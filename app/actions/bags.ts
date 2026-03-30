'use server'

import { Connection, PublicKey } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

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
      const platformWalletPk = new PublicKey(platformWalletBase58)
      feeClaimers.push({ user: platformWalletPk, userBps: platformFeeBps })
    }
    feeClaimers.push({
      user: walletPk,
      userBps: 10000 - (feeClaimers[0]?.userBps || 0),
    })

    // 1. Create Metadata via Bags Pipeline
    const metadata = await bags.tokenLaunch.createTokenInfoAndMetadata({
      name,
      symbol,
      description,
      imageUrl,
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
  } catch (err: any) {
    console.error('Bags Server Action Error:', err)
    return { success: false, error: err.message || 'Failed to prepare launch transaction' }
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
