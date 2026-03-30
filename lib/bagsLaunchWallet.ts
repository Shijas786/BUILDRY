'use client'

import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { createTipTransaction } from '@bagsfm/bags-sdk'
import { confirmSignaturePolling } from '@/lib/solanaConfirm'

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

/** Pass these from the same client module that imports `@/app/actions/bags` so Next binds server actions reliably. */
export type BagsLaunchServerActions = {
  getBagsJitoTipLamports: () => Promise<
    | { success: true; lamports: number }
    | { success: false; error?: string }
    | undefined
    | null
  >
  submitBagsSignedJitoBundle: (
    signedTransactionsBase64: string[]
  ) => Promise<
    | { success: true; bundleId: string }
    | { success: false; error?: string }
    | undefined
    | null
  >
  prepareBagsLaunchDeployTx: (
    metadataUrl: string,
    tokenMint: string,
    walletBase58: string,
    meteoraConfigKeyBase58: string,
    initialBuyLamports?: number
  ) => Promise<
    | { success: true; transactionBase64: string; tokenMint: string }
    | { success: false; error?: string }
    | undefined
    | null
  >
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
  initialBuyLamports: number,
  server: BagsLaunchServerActions
): Promise<{ transactionBase64: string; tokenMint: string }> {
  const hasNonEmptyBundle = prep.feeShareBundlesBase64.some((b) => b.length > 0)
  if (hasNonEmptyBundle && !wallet.signAllTransactions) {
    throw new Error(
      'This wallet cannot sign multiple transactions at once. Bags fee setup requires signAllTransactions (e.g. Phantom).'
    )
  }

  const tipRes = await server.getBagsJitoTipLamports().catch(() => null)
  const tipLamports =
    tipRes && tipRes.success && tipRes.lamports > 0
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
    const submitted = await server.submitBagsSignedJitoBundle(serialized).catch(() => null)
    if (!submitted || typeof submitted !== 'object' || !submitted.success) {
      throw new Error(
        (submitted && 'error' in submitted && submitted.error) ||
          'Failed to submit Jito bundle to Bags (no response from server).'
      )
    }
  }

  for (const b64 of prep.feeShareTransactionsBase64) {
    const tx = VersionedTransaction.deserialize(Buffer.from(b64, 'base64'))
    let signature: string
    if (wallet.sendTransaction) {
      signature = await wallet.sendTransaction(tx, connection, { maxRetries: 5 })
    } else {
      const signed = await wallet.signTransaction(tx)
      signature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 5 })
    }
    await confirmSignaturePolling(connection, signature, { commitment: COMMITMENT })
  }

  const deploy = await server
    .prepareBagsLaunchDeployTx(
      prep.metadataUrl,
      prep.tokenMint,
      wallet.publicKey.toBase58(),
      prep.meteoraConfigKey,
      initialBuyLamports
    )
    .catch(() => null)
  if (!deploy || typeof deploy !== 'object' || !deploy.success || !deploy.transactionBase64) {
    throw new Error(
      (deploy && 'error' in deploy && deploy.error) ||
        'Failed to build launch transaction after fee-share setup (no response from server).'
    )
  }
  return { transactionBase64: deploy.transactionBase64, tokenMint: deploy.tokenMint }
}
