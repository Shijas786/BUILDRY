import type { Commitment, Connection } from '@solana/web3.js'

const DEFAULT_TIMEOUT_MS = 180_000
const DEFAULT_POLL_MS = 2000

/**
 * Poll getSignatureStatuses until the tx reaches commitment (or timeout).
 * `connection.confirmTransaction(signature)` uses a 30s cap for "confirmed" — public RPCs
 * and mainnet congestion often need longer; HTTP-only endpoints may not get WS updates reliably.
 */
export async function confirmSignaturePolling(
  connection: Connection,
  signature: string,
  options?: { commitment?: Commitment; timeoutMs?: number; pollMs?: number }
): Promise<void> {
  const commitment = options?.commitment ?? 'confirmed'
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS
  const deadline = Date.now() + timeoutMs

  const meetsCommitment = (st: string | undefined): boolean => {
    if (!st) return false
    if (commitment === 'finalized') return st === 'finalized'
    if (commitment === 'confirmed') return st === 'confirmed' || st === 'finalized'
    return st === 'processed' || st === 'confirmed' || st === 'finalized'
  }

  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    })
    const s = value[0]
    if (s?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(s.err)}`)
    }
    if (meetsCommitment(s?.confirmationStatus)) {
      return
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }

  throw new Error(
    `Transaction was not confirmed in ${(timeoutMs / 1000).toFixed(0)} seconds. Look up this signature on Solana Explorer: ${signature}`
  )
}

/** Connection config for launch/trade flows where 30s default confirm is too tight. */
export const SOLANA_LAUNCH_CONNECTION_CONFIG = {
  commitment: 'confirmed' as const,
  confirmTransactionInitialTimeout: DEFAULT_TIMEOUT_MS,
}
