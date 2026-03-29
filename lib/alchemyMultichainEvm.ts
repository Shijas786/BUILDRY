import axios from 'axios'

/**
 * Alchemy Node API networks we query in parallel (HTTPS JSON-RPC).
 * Slugs must match your Alchemy app: enable each chain in the dashboard or calls may 403/404.
 * @see https://www.alchemy.com/docs/reference/supported-chains
 */
export const ALCHEMY_EVM_NETWORKS: { slug: string; name: string }[] = [
  { slug: 'eth-mainnet', name: 'Ethereum' },
  { slug: 'base-mainnet', name: 'Base' },
  { slug: 'arb-mainnet', name: 'Arbitrum One' },
  { slug: 'opt-mainnet', name: 'OP Mainnet' },
  { slug: 'polygon-mainnet', name: 'Polygon' },
  { slug: 'linea-mainnet', name: 'Linea' },
  { slug: 'scroll-mainnet', name: 'Scroll' },
  { slug: 'zksync-mainnet', name: 'zkSync Era' },
  { slug: 'blast-mainnet', name: 'Blast' },
  { slug: 'arb-nova-mainnet', name: 'Arbitrum Nova' },
  { slug: 'mantle-mainnet', name: 'Mantle' },
  { slug: 'metis-mainnet', name: 'Metis' },
  { slug: 'opbnb-mainnet', name: 'opBNB' },
  { slug: 'bnb-mainnet', name: 'BNB Chain' },
  { slug: 'avax-mainnet', name: 'Avalanche C-Chain' },
  { slug: 'fantom-mainnet', name: 'Fantom' },
  { slug: 'celo-mainnet', name: 'Celo' },
  { slug: 'gnosis-mainnet', name: 'Gnosis' },
  { slug: 'worldchain-mainnet', name: 'World Chain' },
  { slug: 'shape-mainnet', name: 'Shape' },
  { slug: 'zetachain-mainnet', name: 'ZetaChain' },
]

type AssetTransfer = {
  to?: string | null
  hash?: string
  uniqueId?: string
  metadata?: { blockTimestamp?: string }
}

type ChainSlice = {
  name: string
  slug: string
  transactionCount: number
  deployedContracts: number
  walletAgeDays: number
}

function parseHexInt(hex: string | undefined): number {
  if (!hex || typeof hex !== 'string') return 0
  const n = parseInt(hex, 16)
  return Number.isFinite(n) ? n : 0
}

async function alchemyPost(slug: string, apiKey: string, body: object): Promise<any> {
  const url = `https://${slug}.g.alchemy.com/v2/${apiKey}`
  const { data } = await axios.post(url, body, { timeout: 14_000 })
  if (data?.error) throw new Error(data.error.message || 'rpc error')
  return data.result
}

/** Alchemy only supports `internal` transfers on Ethereum and Polygon; other chains may error if included. */
function transferCategoriesForSlug(slug: string): ('external' | 'internal')[] {
  if (slug === 'eth-mainnet' || slug === 'polygon-mainnet') return ['external', 'internal']
  return ['external']
}

function isDeployStyleTransfer(t: { to?: string | null; hash?: string; uniqueId?: string }): boolean {
  if (t.to != null && t.to !== '') return false
  return Boolean(t.hash || t.uniqueId)
}

function countUniqueDeploysFromTransfers(
  batches: { to?: string | null; hash?: string; uniqueId?: string }[][]
): number {
  const ids = new Set<string>()
  for (const batch of batches) {
    for (const t of batch) {
      if (!isDeployStyleTransfer(t)) continue
      const id = (typeof t.hash === 'string' && t.hash) || (typeof t.uniqueId === 'string' && t.uniqueId) || ''
      if (id) ids.add(id)
    }
  }
  return ids.size
}

async function fetchChainSlice(
  wallet: string,
  apiKey: string,
  slug: string,
  name: string
): Promise<ChainSlice | null> {
  const w = wallet.trim()
  try {
    const nonceHex = await alchemyPost(slug, apiKey, {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionCount',
      params: [w, 'latest'],
    })
    const transactionCount = parseHexInt(typeof nonceHex === 'string' ? nonceHex : undefined)

    let deployedContracts = 0
    let walletAgeDays = 0

    try {
      const categories = transferCategoriesForSlug(slug)
      const fetchTransfers = (order: 'asc' | 'desc') =>
        alchemyPost(slug, apiKey, {
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock: '0x0',
              toBlock: 'latest',
              fromAddress: w,
              category: categories,
              order,
              maxCount: '0x3e8',
              withMetadata: true,
              /** Default true would drop zero-ETH txs — contract deployments are usually 0 value. */
              excludeZeroValue: false,
            },
          ],
        })

      const [ascResult, descResult] = await Promise.all([fetchTransfers('asc'), fetchTransfers('desc')])
      const asc: AssetTransfer[] = Array.isArray(ascResult?.transfers) ? ascResult.transfers : []
      const desc: AssetTransfer[] = Array.isArray(descResult?.transfers) ? descResult.transfers : []
      deployedContracts = countUniqueDeploysFromTransfers([asc, desc])

      const firstTs = asc[0]?.metadata?.blockTimestamp
      if (firstTs) {
        const sec = Math.floor(new Date(firstTs).getTime() / 1000)
        if (Number.isFinite(sec) && sec > 0) {
          walletAgeDays = Math.max(0, Math.floor((Date.now() / 1000 - sec) / 86400))
        }
      }
    } catch {
      // alchemy_getAssetTransfers not supported or failed on this chain — keep nonce-only stats
    }

    if (transactionCount === 0 && deployedContracts === 0) {
      return { name, slug, transactionCount: 0, deployedContracts: 0, walletAgeDays: 0 }
    }

    return { name, slug, transactionCount, deployedContracts, walletAgeDays }
  } catch {
    return null
  }
}

export type AlchemyMultiChainResult = {
  transactionCount: number
  deployedContracts: number
  walletAgeDays: number
  chainsHit: number
  byChain: { name: string; slug: string; transactionCount: number; deployedContracts: number }[]
}

/**
 * Sums outgoing tx count (nonce) and sampled deploy-style transfers across many EVM networks.
 * Chains that error (disabled in dashboard, wrong slug) are skipped.
 */
export async function getAlchemyMultiChainEvmStats(
  wallet: string,
  apiKey: string,
  options?: { excludeSlugs?: Set<string> }
): Promise<AlchemyMultiChainResult> {
  const empty: AlchemyMultiChainResult = {
    transactionCount: 0,
    deployedContracts: 0,
    walletAgeDays: 0,
    chainsHit: 0,
    byChain: [],
  }
  if (!wallet?.trim() || !apiKey) return empty

  const exclude = options?.excludeSlugs ?? new Set()
  const networks = ALCHEMY_EVM_NETWORKS.filter((n) => !exclude.has(n.slug))

  const slices = await Promise.all(
    networks.map((n) => fetchChainSlice(wallet, apiKey, n.slug, n.name))
  )

  let transactionCount = 0
  let deployedContracts = 0
  let walletAgeDays = 0
  const byChain: AlchemyMultiChainResult['byChain'] = []
  let chainsHit = 0

  for (const s of slices) {
    if (!s) continue
    chainsHit += 1
    transactionCount += s.transactionCount
    deployedContracts += s.deployedContracts
    walletAgeDays = Math.max(walletAgeDays, s.walletAgeDays)
    if (s.transactionCount > 0 || s.deployedContracts > 0) {
      byChain.push({
        name: s.name,
        slug: s.slug,
        transactionCount: s.transactionCount,
        deployedContracts: s.deployedContracts,
      })
    }
  }

  return { transactionCount, deployedContracts, walletAgeDays, chainsHit, byChain }
}
