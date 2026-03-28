import axios from 'axios'
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
  /** Count of txs returned from Etherscan (capped by API offset). */
  transactionCount: number
  /** Sum of gasUsed×gasPrice for returned txs, as ETH string (4–6 decimals) or null. */
  gasEthEstimate: string | null
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

export async function getEvmDeploymentStats(wallet: string): Promise<EvmDeploymentStats> {
  const empty: EvmDeploymentStats = {
    deployedContracts: 0,
    walletAgeDays: 0,
    transactionCount: 0,
    gasEthEstimate: null,
  }
  if (!wallet) return empty
  const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || ''
  if (!ETHERSCAN_KEY) return empty
  try {
    const { data } = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: 'account',
        action: 'txlist',
        address: wallet,
        sort: 'asc',
        page: 1,
        offset: 1000,
        apikey: ETHERSCAN_KEY,
      },
      timeout: 10000,
    })
    const txs = Array.isArray(data?.result) ? data.result : []
    const deployedContracts = txs.filter((tx: any) => !tx.to || tx.to === '').length
    const firstTs = txs.length > 0 ? Number(txs[0].timeStamp || 0) : 0
    const walletAgeDays = firstTs > 0 ? Math.max(0, Math.floor((Date.now() / 1000 - firstTs) / 86400)) : 0
    const gasEthEstimate = txs.length > 0 ? sumGasToEthString(txs) : null
    return {
      deployedContracts,
      walletAgeDays,
      transactionCount: txs.length,
      gasEthEstimate,
    }
  } catch {
    return empty
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
