'use client'

import { Connection, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { createTipTransaction } from '@bagsfm/bags-sdk'
import { confirmSignaturePolling } from '@/lib/solanaConfirm'

function firstSignerSignatureBase58(tx: VersionedTransaction): string | null {
  const s = tx.signatures[0]
  if (!s || s.every((b) => b === 0)) return null
  return bs58.encode(s)
}

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
 * Bags doc step 2 (fee-share): sign Jito bundle(s) = tip tx + bundle txs via `signAllTransactions`,
 * submit through server `submitBagsSignedJitoBundle` (`sendBundleAndConfirm`), then sign & send each
 * `feeShareTransactionsBase64` (batch-signed when possible). After all confirm, server builds step 3
 * `createLaunchTransaction` — see `prepareBagsLaunchDeployTx`.
 * https://docs.bags.fm/how-to-guides/launch-token
 */
export type BagsLaunchWalletFlowResult = {
  tokenMint: string
  /** Jito bundle id from Bags `sendBundleAndConfirm` for the final tip + launch txs */
  launchBundleId: string
  /** Fee-payer signature of the launch `VersionedTransaction` (second tx in the bundle), for Solscan links */
  launchSignature: string | null
}

export async function runBagsLaunchWalletFlow(
  prep: BagsFeeSharePrepSuccess,
  wallet: WalletLaunchMethods,
  connection: Connection,
  initialBuyLamports: number,
  server: BagsLaunchServerActions
): Promise<BagsLaunchWalletFlowResult> {
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

  // Multiple fee-share txs used to mean N separate wallet popups. If the wallet supports
  // signAllTransactions, sign them all at once, then submit + confirm in order (same as before on-chain).
  const singles = prep.feeShareTransactionsBase64.map((b64) =>
    VersionedTransaction.deserialize(Buffer.from(b64, 'base64'))
  )
  if (singles.length > 0) {
    const batchSign = singles.length > 1 && typeof wallet.signAllTransactions === 'function'
    if (batchSign) {
      const signed = await wallet.signAllTransactions!(singles)
      for (const stx of signed) {
        const signature = await connection.sendRawTransaction(stx.serialize(), { maxRetries: 5 })
        await confirmSignaturePolling(connection, signature, { commitment: COMMITMENT })
      }
    } else {
      for (const tx of singles) {
        let signature: string
        if (wallet.sendTransaction) {
          signature = await wallet.sendTransaction(tx, connection, { maxRetries: 5 })
        } else {
          const signed = await wallet.signTransaction(tx)
          signature = await connection.sendRawTransaction(signed.serialize(), { maxRetries: 5 })
        }
        await confirmSignaturePolling(connection, signature, { commitment: COMMITMENT })
      }
    }
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

  // Bags Token Launch v2 — final step: Jito bundle = tip tx + `createLaunchTransaction` (same as official guide).
  if (!wallet.signAllTransactions) {
    throw new Error(
      'Final launch uses a Jito bundle (tip + launch transaction). Use a wallet that supports signAllTransactions (e.g. Phantom).'
    )
  }

  const launchUnsigned = VersionedTransaction.deserialize(Buffer.from(deploy.transactionBase64, 'base64'))
  const launchBlockhash = launchUnsigned.message.recentBlockhash
  if (!launchBlockhash) {
    throw new Error('Launch transaction is missing a blockhash; try preparing the launch again.')
  }

  const launchTipRes = await server.getBagsJitoTipLamports().catch(() => null)
  const launchTipLamports =
    launchTipRes && launchTipRes.success && launchTipRes.lamports > 0
      ? launchTipRes.lamports
      : Math.floor(0.015 * LAMPORTS_PER_SOL)

  const launchTipTx = await createTipTransaction(
    connection,
    COMMITMENT,
    wallet.publicKey,
    launchTipLamports,
    { blockhash: launchBlockhash }
  )

  const signedLaunchBundle = await wallet.signAllTransactions([launchTipTx, launchUnsigned])
  const serializedLaunch = signedLaunchBundle.map((tx) => Buffer.from(tx.serialize()).toString('base64'))
  const launchSubmit = await server.submitBagsSignedJitoBundle(serializedLaunch).catch(() => null)
  if (!launchSubmit || typeof launchSubmit !== 'object' || !launchSubmit.success) {
    throw new Error(
      (launchSubmit && 'error' in launchSubmit && launchSubmit.error) ||
        'Failed to submit launch Jito bundle to Bags (no response from server).'
    )
  }

  const launchSignature = firstSignerSignatureBase58(signedLaunchBundle[1]) ?? null

  return {
    tokenMint: deploy.tokenMint,
    launchBundleId: launchSubmit.bundleId,
    launchSignature,
  }
}
