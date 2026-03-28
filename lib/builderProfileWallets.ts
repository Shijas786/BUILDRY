import { normalizeEvmWallet, normalizeSolWallet } from '@/lib/walletNormalize'

export type VerifiedWalletRow = { chain: 'sol' | 'evm'; address: string; verified_at?: number }

export function parseVerifiedWallets(raw: unknown): VerifiedWalletRow[] {
  if (!Array.isArray(raw)) return []
  const out: VerifiedWalletRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const chain = o.chain
    const address = o.address
    if (chain !== 'sol' && chain !== 'evm') continue
    if (typeof address !== 'string') continue
    const norm = chain === 'sol' ? normalizeSolWallet(address) : normalizeEvmWallet(address)
    if (!norm) continue
    const verified_at = typeof o.verified_at === 'number' ? o.verified_at : undefined
    out.push({ chain, address: norm, verified_at })
  }
  return out
}

/** Primary Solana + EVM for reputation APIs: first verified of each chain, else legacy fields. */
export function primaryWalletsFromProfile(profile: Record<string, unknown> | null | undefined): {
  sol_wallet: string | null
  evm_wallet: string | null
} {
  const rows = parseVerifiedWallets(profile?.verified_wallets)
  const firstSol = rows.find((r) => r.chain === 'sol')?.address
  const firstEvm = rows.find((r) => r.chain === 'evm')?.address
  return {
    sol_wallet: normalizeSolWallet(firstSol) || normalizeSolWallet(profile?.sol_wallet as string) || null,
    evm_wallet: normalizeEvmWallet(firstEvm) || normalizeEvmWallet(profile?.evm_wallet as string) || null,
  }
}
