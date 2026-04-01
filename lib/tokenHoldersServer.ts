import { Connection, PublicKey } from '@solana/web3.js'
import { normalizeSolWallet } from '@/lib/walletNormalize'
import type { BuildryWalletMeta } from '@/lib/buildrySolWalletDirectory'

type SplParsed = { program: string; parsed: { type?: string; info?: { owner?: string } } }

export type TokenHolderRow = {
  rank: number
  owner: string
  balanceUi: number
  /** SPL token account (ATA or vault), for Solscan */
  tokenAccount: string
  buildry?: BuildryWalletMeta
}

function splTokenOwnerFromParsed(data: SplParsed | undefined): string | null {
  if (!data?.program?.includes('spl-token')) return null
  const inner = data.parsed
  if (inner?.type !== 'account' || typeof inner.info?.owner !== 'string') return null
  return normalizeSolWallet(inner.info.owner)
}

/**
 * Top SPL token accounts by balance for a mint (RPC returns max ~20).
 * Resolves owner wallet from each token account.
 */
export async function fetchTokenHoldersFromRpc(mint: string): Promise<Omit<TokenHolderRow, 'rank' | 'buildry'>[]> {
  const rpcUrl =
    process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')
  const mintPk = new PublicKey(mint)

  const { value: pairs } = await connection.getTokenLargestAccounts(mintPk)
  if (!pairs.length) return []

  const infos = await connection.getMultipleParsedAccounts(pairs.map((p) => p.address))

  const rows: Omit<TokenHolderRow, 'rank' | 'buildry'>[] = []
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]
    const info = infos.value[i]
    const parsed =
      info?.data && typeof info.data === 'object' && 'parsed' in info.data && 'program' in info.data
        ? (info.data as SplParsed)
        : undefined
    const owner = splTokenOwnerFromParsed(parsed)
    if (!owner) continue
    const ui = pair.uiAmount ?? (pair.amount ? Number(pair.amount) / 10 ** pair.decimals : 0)
    rows.push({
      owner,
      balanceUi: ui,
      tokenAccount: pair.address.toBase58(),
    })
  }

  const merged = new Map<string, Omit<TokenHolderRow, 'rank' | 'buildry'>>()
  for (const r of rows) {
    const prev = merged.get(r.owner)
    if (!prev) merged.set(r.owner, { ...r })
    else
      merged.set(r.owner, {
        owner: r.owner,
        balanceUi: prev.balanceUi + r.balanceUi,
        tokenAccount: prev.tokenAccount,
      })
  }
  const list = Array.from(merged.values()).sort((a, b) => b.balanceUi - a.balanceUi)
  return list
}

export function attachBuildryMeta(
  rows: Omit<TokenHolderRow, 'rank' | 'buildry'>[],
  lookup: Map<string, BuildryWalletMeta>
): TokenHolderRow[] {
  return rows.map((r, i) => {
    const norm = normalizeSolWallet(r.owner)
    const buildry = norm ? lookup.get(norm) : undefined
    return {
      rank: i + 1,
      ...r,
      ...(buildry ? { buildry } : {}),
    }
  })
}
