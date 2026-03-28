import { PublicKey } from '@solana/web3.js'

/** Returns canonical base58 or null if invalid / empty. */
export function normalizeSolWallet(s: string | null | undefined): string | null {
  if (!s || !String(s).trim()) return null
  const t = String(s).trim()
  try {
    return new PublicKey(t).toBase58()
  } catch {
    return null
  }
}

/** Returns checksummed lowercase 0x + 40 hex or null. */
export function normalizeEvmWallet(s: string | null | undefined): string | null {
  if (!s || !String(s).trim()) return null
  const t = String(s).trim().toLowerCase()
  if (!/^0x[a-f0-9]{40}$/.test(t)) return null
  return t
}

export function claimDocId(chain: 'sol' | 'evm', address: string): string {
  return `${chain}_${address}`
}
