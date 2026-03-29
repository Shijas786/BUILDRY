import axios from 'axios'

const ZERION_API = 'https://api.zerion.io/v1'

/** Zerion `relationships.chain.data.id` → our profile row slug(s) + label. */
const ZERION_CHAIN_TO_PROFILE: Record<string, { slugs: string[]; name: string }> = {
  ethereum: { slugs: ['etherscan-mainnet', 'eth-mainnet'], name: 'Ethereum' },
  base: { slugs: ['base-mainnet'], name: 'Base' },
  arbitrum: { slugs: ['arb-mainnet'], name: 'Arbitrum One' },
  optimism: { slugs: ['opt-mainnet'], name: 'OP Mainnet' },
  polygon: { slugs: ['polygon-mainnet'], name: 'Polygon' },
  linea: { slugs: ['linea-mainnet'], name: 'Linea' },
  scroll: { slugs: ['scroll-mainnet'], name: 'Scroll' },
  'zksync-era': { slugs: ['zksync-mainnet'], name: 'zkSync Era' },
  zksync: { slugs: ['zksync-mainnet'], name: 'zkSync Era' },
  blast: { slugs: ['blast-mainnet'], name: 'Blast' },
  'arbitrum-nova': { slugs: ['arb-nova-mainnet'], name: 'Arbitrum Nova' },
  mantle: { slugs: ['mantle-mainnet'], name: 'Mantle' },
  metis: { slugs: ['metis-mainnet'], name: 'Metis' },
  opbnb: { slugs: ['opbnb-mainnet'], name: 'opBNB' },
  'binance-smart-chain': { slugs: ['bnb-mainnet'], name: 'BNB Chain' },
  bsc: { slugs: ['bnb-mainnet'], name: 'BNB Chain' },
  avalanche: { slugs: ['avax-mainnet'], name: 'Avalanche C-Chain' },
  fantom: { slugs: ['fantom-mainnet'], name: 'Fantom' },
  celo: { slugs: ['celo-mainnet'], name: 'Celo' },
  xdai: { slugs: ['gnosis-mainnet'], name: 'Gnosis' },
  gnosis: { slugs: ['gnosis-mainnet'], name: 'Gnosis' },
  world: { slugs: ['worldchain-mainnet'], name: 'World Chain' },
  'world-chain': { slugs: ['worldchain-mainnet'], name: 'World Chain' },
  shape: { slugs: ['shape-mainnet'], name: 'Shape' },
  zeta: { slugs: ['zetachain-mainnet'], name: 'ZetaChain' },
  zetachain: { slugs: ['zetachain-mainnet'], name: 'ZetaChain' },
}

export type ZerionDeployFetchResult = {
  total: number
  byZerionChainId: Map<string, number>
}

type ZerionTransactionsResponse = {
  data?: unknown[]
  links?: { next?: string | null }
}

function titleCaseZerionId(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Paginates Zerion wallet txs with operation_type deploy (explicit contract deployments).
 * @see https://developers.zerion.io/reference/listwallettransactions
 */
export async function fetchZerionWalletDeployStats(walletAddress: string): Promise<ZerionDeployFetchResult | null> {
  const key = process.env.ZERION_API_KEY?.trim()
  const w = walletAddress?.trim()
  if (!key || !w) return null

  const path = `${ZERION_API}/wallets/${encodeURIComponent(w)}/transactions/`
  const seen = new Set<string>()
  const byZerionChainId = new Map<string, number>()
  let nextUrl: string | null = null
  const maxPages = 30

  for (let p = 0; p < maxPages; p++) {
    try {
      const requestUrl: string = nextUrl ?? path
      const res = await axios.get<ZerionTransactionsResponse>(requestUrl, {
        auth: { username: key, password: '' },
        headers: { Accept: 'application/json' },
        timeout: 22_000,
        params: nextUrl
          ? undefined
          : {
              'filter[operation_types]': 'deploy',
              'page[size]': 100,
            },
      })
      const body: ZerionTransactionsResponse = res.data

      const rows: unknown[] = Array.isArray(body.data) ? body.data : []
      for (const row of rows) {
        const item = row as {
          attributes?: { operation_type?: string; hash?: string }
          relationships?: { chain?: { data?: { id?: string } } }
        }
        const op = item.attributes?.operation_type
        if (op !== 'deploy') continue
        const hash = String(item.attributes?.hash || '').toLowerCase()
        if (!hash.startsWith('0x')) continue
        const chainId = String(item.relationships?.chain?.data?.id || 'unknown').toLowerCase()
        const dedupe = `${chainId}:${hash}`
        if (seen.has(dedupe)) continue
        seen.add(dedupe)
        byZerionChainId.set(chainId, (byZerionChainId.get(chainId) ?? 0) + 1)
      }

      const nextLink: string | null | undefined = body.links?.next
      nextUrl = typeof nextLink === 'string' && nextLink.length > 0 ? nextLink : null
      if (!nextUrl || rows.length === 0) break
    } catch {
      break
    }
  }

  if (seen.size === 0) return { total: 0, byZerionChainId }

  return { total: seen.size, byZerionChainId }
}

/**
 * Upserts per-chain deploy counts: max(existing, Zerion) to limit double-counting with Alchemy/Etherscan heuristics.
 */
export function mergeZerionDeployIntoByChain(
  byChain: { name: string; slug: string; transactionCount: number; deployedContracts: number }[],
  zerionByChainId: Map<string, number>
): void {
  for (const [zIdRaw, count] of Array.from(zerionByChainId.entries())) {
    if (count <= 0) continue
    const zId = zIdRaw.toLowerCase()
    const meta = ZERION_CHAIN_TO_PROFILE[zId]
    if (meta) {
      const row = byChain.find((r) => meta.slugs.includes(r.slug))
      if (row) {
        row.deployedContracts = Math.max(row.deployedContracts, count)
      } else {
        byChain.push({
          name: meta.name,
          slug: meta.slugs[0],
          transactionCount: 0,
          deployedContracts: count,
        })
      }
      continue
    }

    const slug = `zerion-${zId}`
    const name = titleCaseZerionId(zId)
    const existing = byChain.find((r) => r.slug === slug)
    if (existing) {
      existing.deployedContracts = Math.max(existing.deployedContracts, count)
    } else {
      byChain.push({
        name: name || zId,
        slug,
        transactionCount: 0,
        deployedContracts: count,
      })
    }
  }
}
