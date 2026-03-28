'use server'

import { Connection, PublicKey } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'
import { getServiceSupabase } from '@/lib/supabaseService'

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
    const platformFeeRaw = Number(process.env.PLATFORM_FEE_BPS ?? 150)
    const platformFeeBps = Number.isFinite(platformFeeRaw)
      ? Math.max(0, Math.min(10000, Math.floor(platformFeeRaw)))
      : 150

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

    if (userId) {
      try {
        const supabase = getServiceSupabase()
        if (supabase) {
          await supabase.from('posts').insert({
            author_id: userId,
            content: `Just launched $${symbol} — ${name}! ${description}`,
            post_type: 'launch',
            milestone_title: `Launched $${symbol}`,
            milestone_category: 'launch',
          })
        }
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
