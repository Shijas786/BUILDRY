import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { createTipTransaction } from '@bagsfm/bags-sdk'
import {
  getBagsJitoTipLamports,
  prepareBagsLaunchDeployTx,
  submitBagsSignedJitoBundle,
} from '@/app/actions/bags'

export type BagsFeeSharePrepSuccess = {
  success: true
  tokenMint: string
  metadataUrl: string
  meteoraConfigKey: string
  feeShareBundlesBase64: string[][]
  feeShareTransactionsBase64: string[]
}

type WalletLaunchMethods = {
  publicKey: PublicKey
  sendTransaction: (
    transaction: VersionedTransaction,
    connection: Connection,
    options?: { skipPreflight?: boolean; maxRetries?: number }
  ) => Promise<string>
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>
  signAllTransactions?: (transactions: VersionedTransaction[]) => Promise<VersionedTransaction[]>
}

const COMMITMENT = 'confirmed' as const

/**
 * Sign & submit fee-share setup (Jito bundles + optional single txs), then fetch the deploy transaction from Bags.
 * Matches https://docs.bags.fm/how-to-guides/launch-token (steps 2 → 3).
 */
export async function runBagsLaunchWalletFlow(
  prep: BagsFeeSharePrepSuccess,
  wallet: WalletLaunchMethods,
  connection: Connection,
  initialBuyLamports = 0
): Promise<{ transactionBase64: string; tokenMint: string }> {
  const hasNonEmptyBundle = prep.feeShareBundlesBase64.some((b) => b.length > 0)
  if (hasNonEmptyBundle && !wallet.signAllTransactions) {
    throw new Error(
      'This wallet cannot sign multiple transactions at once. Bags fee setup requires signAllTransactions (e.g. Phantom).'
    )
  }

  const tipRes = await getBagsJitoTipLamports()
  const tipLamports =
    tipRes.success && tipRes.lamports > 0
      ? tipRes.lamports
      : Math.floor(0.015 * LAMPORTS_PER_SOL)

  for (const bundle of prep.feeShareBundlesBase64) {
    if (!bundle.length) continue
    const bundleTxs = bundle.map((b64) => VersionedTransaction.deserialize(Buffer.from(b64, 'base64')))
    const blockhash = bundleTxs[0]?.message.recentBlockhash
    if (!blockhash) throw new Error('Fee-share bundle is missing a blockhash; try preparing the launch again.')

    const tipTx = await createTipTransaction(connection, COMMITMENT, wallet.publicKey, tipLamports, {
      blockhash,
    })
    const toSign = [tipTx, ...bundleTxs]
    const signed = await wallet.signAllTransactions!(toSign)
    const serialized = signed.map((tx) => Buffer.from(tx.serialize()).toString('base64'))
    const submitted = await submitBagsSignedJitoBundle(serialized)
    if (!submitted.success) {
      throw new Error(submitted.error || 'Failed to submit Jito bundle to Bags')
    }
  }

  for (const b64 of prep.feeShareTransactionsBase64) {
    const tx = VersionedTransaction.deserialize(Buffer.from(b64, 'base64'))
    let signature: string
    if (wallet.sendTransaction) {
      signature = await wallet.sendTransaction(tx, connection)
    } else {
      const signed = await wallet.signTransaction(tx)
      signature = await connection.sendRawTransaction(signed.serialize())
    }
    await connection.confirmTransaction(signature, COMMITMENT)
  }

  const deploy = await prepareBagsLaunchDeployTx(
    prep.metadataUrl,
    prep.tokenMint,
    wallet.publicKey.toBase58(),
    prep.meteoraConfigKey,
    initialBuyLamports
  )
  if (!deploy.success || !deploy.transactionBase64) {
    throw new Error(deploy.error || 'Failed to build launch transaction after fee-share setup.')
  }
  return { transactionBase64: deploy.transactionBase64, tokenMint: deploy.tokenMint }
}
