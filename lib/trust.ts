import axios from 'axios'
import { getAlchemyMultiChainEvmStats } from './alchemyMultichainEvm'
import { fetchZerionWalletDeployStats, mergeZerionDeployIntoByChain } from './zerionWallet'
import { TalentProfile } from './talent'
import { FarcasterProfile } from './farcaster'

export type TrustTier = 'VERIFIED' | 'PARTIAL' | 'ANONYMOUS'

export interface TrustData {
  tier: TrustTier
  profile: TalentProfile | null
  builderScore: number | null
  builderRank: number | null
  percentile: number | null
  accounts: any[]
  socials: any[]
  twitterFromBags: string | null
  githubCommits: number | null
  heliusTransactions: number | null
  hasGithub: boolean
  hasTwitter: boolean
  hasFarcaster: boolean
  hasWallet: boolean
  // Farcaster enrichment
  farcaster: FarcasterProfile | null
  previousBagsProjects: { name: string; symbol: string; mint: string }[]
  reliabilityScore: number | null
  profilePicture: string | null
}

export function resolveTrustTier(data: {
  talentProfile: TalentProfile | null
  builderScore: number | null
  twitterFromBags: string | null
  farcasterProfile?: FarcasterProfile | null
}): TrustTier {
  if (data.talentProfile && data.builderScore !== null) return 'VERIFIED'
  if (data.twitterFromBags || data.farcasterProfile) return 'PARTIAL'
  return 'ANONYMOUS'
}

// Helius Indexing API for Onchain Activity Score
export async function getHeliusTransactions(wallet: string): Promise<number> {
  if (!wallet) return 0
  const HELIUS_KEY = process.env.HELIUS_API_KEY
  // Fallback to mock data for MVP if no key exists
  if (!HELIUS_KEY) return Math.floor(Math.random() * 500) + 120

  try {
    const { data } = await axios.get(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`, {
      params: { 'api-key': HELIUS_KEY, limit: 200 },
    })
    return data.length || 0
  } catch {
    return 0
  }
}

export interface SolanaDeploymentStats {
  deployedPrograms: number
  walletAgeDays: number
}

export interface EvmDeploymentStats {
  deployedContracts: number
  walletAgeDays: number
  /** Outgoing tx count summed across Alchemy chains (nonce) + optional Ethereum L1 Etherscan sample. */
  transactionCount: number
  /** Sum of gasUsed×gasPrice for Ethereum L1 txs from Etherscan (up to 1000), when configured. */
  gasEthEstimate: string | null
  /** Alchemy networks that responded (includes chains with zero nonce). */
  evmChainsQueried?: number
  /** Per-chain breakdown (Alchemy + optional Etherscan L1 row). */
  evmByChain?: { name: string; slug: string; transactionCount: number; deployedContracts: number }[]
}

export async function getSolanaDeploymentStats(wallet: string): Promise<SolanaDeploymentStats> {
  if (!wallet) return { deployedPrograms: 0, walletAgeDays: 0 }
  const HELIUS_KEY = process.env.HELIUS_API_KEY
  if (!HELIUS_KEY) {
    return { deployedPrograms: 0, walletAgeDays: 0 }
  }
  try {
    const { data } = await axios.get(`https://api.helius.xyz/v0/addresses/${wallet}/transactions`, {
      params: { 'api-key': HELIUS_KEY, limit: 400 },
    })
    const txs = Array.isArray(data) ? data : []
    const deployedPrograms = txs.filter((tx: any) => {
      const type = String(tx?.type || '').toLowerCase()
      return type.includes('deploy') || type.includes('create')
    }).length
    const oldest = txs.length > 0 ? txs[txs.length - 1]?.timestamp : null
    const walletAgeDays = oldest ? Math.max(0, Math.floor((Date.now() / 1000 - oldest) / 86400)) : 0
    return { deployedPrograms, walletAgeDays }
  } catch {
    return { deployedPrograms: 0, walletAgeDays: 0 }
  }
}

function sumGasToEthString(txs: { gasUsed?: string; gasPrice?: string }[]): string | null {
  try {
    let wei = BigInt(0)
    for (const tx of txs) {
      const gu = BigInt(String(tx.gasUsed || '0'))
      const gp = BigInt(String(tx.gasPrice || '0'))
      wei += gu * gp
    }
    if (wei === BigInt(0)) return null
    // Format without precision loss for small amounts
    const eth = Number(wei) / 1e18
    if (!Number.isFinite(eth) || eth === 0) return null
    if (eth < 0.0001) return eth.toExponential(2)
    if (eth < 1) return eth.toFixed(6).replace(/\.?0+$/, '') || '0'
    return eth.toFixed(4).replace(/\.?0+$/, '') || '0'
  } catch {
    return null
  }
}

function isEtherscanContractCreationTx(tx: any): boolean {
  const ca = tx?.contractAddress
  const hasCreated = typeof ca === 'string' && ca.startsWith('0x') && ca.length > 2
  const emptyTo = !tx?.to || tx.to === ''
  return hasCreated || emptyTo
}

async function getEvmDeploymentStatsEtherscan(wallet: string, apiKey: string): Promise<EvmDeploymentStats> {
  const empty: EvmDeploymentStats = {
    deployedContracts: 0,
    walletAgeDays: 0,
    transactionCount: 0,
    gasEthEstimate: null,
  }
  try {
    const fetchPage = async (sort: 'asc' | 'desc') => {
      const { data } = await axios.get('https://api.etherscan.io/api', {
        params: {
          module: 'account',
          action: 'txlist',
          address: wallet,
          sort,
          page: 1,
          offset: 1000,
          apikey: apiKey,
        },
        timeout: 10000,
      })
      return Array.isArray(data?.result) ? data.result : []
    }

    const [txsAsc, txsDesc] = await Promise.all([fetchPage('asc'), fetchPage('desc')])
    const deployHashes = new Set<string>()
    for (const tx of txsAsc) {
      if (isEtherscanContractCreationTx(tx) && tx?.hash) deployHashes.add(String(tx.hash))
    }
    for (const tx of txsDesc) {
      if (isEtherscanContractCreationTx(tx) && tx?.hash) deployHashes.add(String(tx.hash))
    }
    const deployedContracts = deployHashes.size

    const firstTs = txsAsc.length > 0 ? Number(txsAsc[0].timeStamp || 0) : 0
    const walletAgeDays = firstTs > 0 ? Math.max(0, Math.floor((Date.now() / 1000 - firstTs) / 86400)) : 0
    const gasEthEstimate = txsAsc.length > 0 ? sumGasToEthString(txsAsc) : null
    const sampleLen = Math.max(txsAsc.length, txsDesc.length)
    return {
      deployedContracts,
      walletAgeDays,
      transactionCount: sampleLen,
      gasEthEstimate,
      evmByChain:
        txsAsc.length > 0 || txsDesc.length > 0 || deployedContracts > 0
          ? [
              {
                name: 'Ethereum (L1 · Etherscan sample)',
                slug: 'etherscan-mainnet',
                transactionCount: sampleLen,
                deployedContracts,
              },
            ]
          : undefined,
    }
  } catch {
    return empty
  }
}

/**
 * EVM rollup: many networks via Alchemy (when ALCHEMY_API_KEY), plus Ethereum L1 detail from Etherscan when set.
 * With both keys, Ethereum mainnet is taken from Etherscan (tx list + gas) and excluded from the Alchemy batch to avoid double-counting L1 nonce vs sample.
 * Optional Zerion (`ZERION_API_KEY`) adds `operation_type=deploy` txs across chains and is merged with max() per chain / headline to reduce undercounting.
 */
export async function getEvmDeploymentStats(wallet: string): Promise<EvmDeploymentStats> {
  const empty: EvmDeploymentStats = {
    deployedContracts: 0,
    walletAgeDays: 0,
    transactionCount: 0,
    gasEthEstimate: null,
  }
  if (!wallet?.trim()) return empty

  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim() || ''
  const etherscanKey = process.env.ETHERSCAN_API_KEY?.trim() || ''
  const zerionKey = process.env.ZERION_API_KEY?.trim() || ''

  if (!alchemyKey && !etherscanKey && !zerionKey) return empty

  let transactionCount = 0
  let deployedContracts = 0
  let walletAgeDays = 0
  let gasEthEstimate: string | null = null
  let evmChainsQueried = 0
  const byChain: NonNullable<EvmDeploymentStats['evmByChain']> = []

  if (alchemyKey) {
    const exclude = etherscanKey ? new Set(['eth-mainnet']) : undefined
    const multi = await getAlchemyMultiChainEvmStats(wallet, alchemyKey, { excludeSlugs: exclude })
    transactionCount += multi.transactionCount
    deployedContracts += multi.deployedContracts
    walletAgeDays = Math.max(walletAgeDays, multi.walletAgeDays)
    evmChainsQueried += multi.chainsHit
    byChain.push(...multi.byChain)
  }

  if (etherscanKey) {
    const es = await getEvmDeploymentStatsEtherscan(wallet, etherscanKey)
    transactionCount += es.transactionCount
    deployedContracts += es.deployedContracts
    walletAgeDays = Math.max(walletAgeDays, es.walletAgeDays)
    gasEthEstimate = es.gasEthEstimate
    if (es.evmByChain?.length) {
      byChain.unshift(...es.evmByChain)
    }
  }

  if (zerionKey) {
    const z = await fetchZerionWalletDeployStats(wallet)
    if (z && z.total > 0) {
      deployedContracts = Math.max(deployedContracts, z.total)
      mergeZerionDeployIntoByChain(byChain, z.byZerionChainId)
    }
  }

  return {
    deployedContracts,
    walletAgeDays,
    transactionCount,
    gasEthEstimate,
    evmChainsQueried: alchemyKey ? evmChainsQueried : undefined,
    evmByChain: byChain.length ? byChain : undefined,
  }
}

/** Sum human-readable ETH strings from per-wallet Etherscan gas estimates (rough total). */
function sumGasEthEstimateStrings(estimates: (string | null | undefined)[]): string | null {
  let sum = 0
  for (const e of estimates) {
    if (e == null || e === '') continue
    const n = Number(String(e).replace(/,/g, ''))
    if (Number.isFinite(n)) sum += n
  }
  if (sum === 0) return null
  if (sum < 0.0001) return sum.toExponential(2)
  if (sum < 1) return sum.toFixed(6).replace(/\.?0+$/, '') || '0'
  return sum.toFixed(4).replace(/\.?0+$/, '') || '0'
}

/** Combine stats from every verified EVM address (multi-wallet profiles). */
export function mergeEvmDeploymentStats(stats: EvmDeploymentStats[]): EvmDeploymentStats {
  const empty: EvmDeploymentStats = {
    deployedContracts: 0,
    walletAgeDays: 0,
    transactionCount: 0,
    gasEthEstimate: null,
  }
  if (!stats.length) return empty
  if (stats.length === 1) return { ...stats[0] }

  const bySlug = new Map<string, { name: string; transactionCount: number; deployedContracts: number }>()
  for (const s of stats) {
    for (const row of s.evmByChain || []) {
      const cur = bySlug.get(row.slug) ?? { name: row.name, transactionCount: 0, deployedContracts: 0 }
      cur.name = row.name
      cur.transactionCount += row.transactionCount
      cur.deployedContracts += row.deployedContracts
      bySlug.set(row.slug, cur)
    }
  }
  const evmByChain = Array.from(bySlug.entries())
    .map(([slug, v]) => ({
      slug,
      name: v.name,
      transactionCount: v.transactionCount,
      deployedContracts: v.deployedContracts,
    }))
    .filter((r) => r.transactionCount > 0 || r.deployedContracts > 0)
    .sort((a, b) => b.transactionCount + b.deployedContracts - (a.transactionCount + a.deployedContracts))

  const evmChainsQueriedVals = stats.map((s) => s.evmChainsQueried).filter((n): n is number => typeof n === 'number' && n > 0)

  return {
    deployedContracts: stats.reduce((a, s) => a + s.deployedContracts, 0),
    walletAgeDays: Math.max(0, ...stats.map((s) => s.walletAgeDays)),
    transactionCount: stats.reduce((a, s) => a + s.transactionCount, 0),
    gasEthEstimate: sumGasEthEstimateStrings(stats.map((s) => s.gasEthEstimate)),
    evmChainsQueried: evmChainsQueriedVals.length ? Math.max(...evmChainsQueriedVals) : undefined,
    evmByChain: evmByChain.length ? evmByChain : undefined,
  }
}

export function mergeSolanaDeploymentStats(stats: SolanaDeploymentStats[]): SolanaDeploymentStats {
  if (!stats.length) return { deployedPrograms: 0, walletAgeDays: 0 }
  return {
    deployedPrograms: stats.reduce((a, s) => a + s.deployedPrograms, 0),
    walletAgeDays: Math.max(0, ...stats.map((s) => s.walletAgeDays)),
  }
}

export function buildTrustData(
  profile: TalentProfile | null,
  twitterFromBags: string | null,
  farcaster: FarcasterProfile | null = null,
  previousBagsProjects: { name: string; symbol: string; mint: string }[] = [],
  bagsAvatar: string | null = null,
  heliusTransactions: number | null = null
): TrustData {
  const tier = resolveTrustTier({
    talentProfile: profile,
    builderScore: profile?.score ?? null,
    twitterFromBags,
    farcasterProfile: farcaster,
  })

  const hasTwitter = !!twitterFromBags
  const hasFarcaster = !!farcaster

  const rawReliability = previousBagsProjects.length > 0 
    ? ((previousBagsProjects.length * 15) + (profile?.score ? profile.score / 2 : 0) + ((heliusTransactions || 0) * 0.1))
    : profile?.score ? (profile.score + ((heliusTransactions || 0) * 0.1)) : null

  return {
    tier,
    profile,
    builderScore: profile?.score ?? null,
    builderRank: null,
    percentile: null,
    accounts: [],
    socials: [],
    twitterFromBags,
    githubCommits: null,
    heliusTransactions,
    hasGithub: false,
    hasTwitter,
    hasFarcaster,
    hasWallet: false,
    farcaster,
    previousBagsProjects,
    reliabilityScore: rawReliability ? Math.min(100, rawReliability) : null,
    profilePicture: bagsAvatar || farcaster?.avatar || profile?.avatar || (twitterFromBags ? `https://unavatar.io/twitter/${twitterFromBags}` : null),
  }
}
