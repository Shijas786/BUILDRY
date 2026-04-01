import axios from 'axios'

const BAGS_BASE = 'https://public-api-v2.bags.fm/api/v1'
const API_KEY = process.env.BAGS_API_KEY || ''

const bagsClient = axios.create({
  baseURL: BAGS_BASE,
  headers: { 'x-api-key': API_KEY },
  timeout: 10000,
})

export interface BagsToken {
  mint: string
  name: string
  symbol: string
  price: number
  priceChange24h: number
  marketCap: number
  volume24h: number
  imageUrl?: string
  creatorWallet?: string
  twitter?: string
  description?: string
  holders?: number
  liquidity?: number
  feeApy?: number
  creatorImage?: string
}

export async function searchTokens(query: string): Promise<BagsToken[]> {
  try {
    const { data } = await bagsClient.get('/tokens', {
      params: { search: query, limit: 20 },
    })
    return (data?.tokens || data?.data || []).map(normalizeToken)
  } catch {
    return getMockTokens(query)
  }
}

export async function getTrendingTokens(): Promise<BagsToken[]> {
  try {
    const { data } = await bagsClient.get('/tokens/trending')
    const tokens = (data?.tokens || data?.data || []).map(normalizeToken)
    // Filter out Bags product tokens
    return tokens.filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  } catch (err: any) {
    console.error('Bags API getTrendingTokens failed:', err.message)
    return getMockTokens().filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  }
}

export async function getToken(mint: string): Promise<BagsToken | null> {
  if (!mint?.trim()) return null
  try {
    const { data } = await bagsClient.get(`/tokens/${encodeURIComponent(mint)}`)
    const raw = data?.token ?? data?.data ?? data
    if (raw == null || typeof raw !== 'object') return null
    const token = normalizeToken(raw as Record<string, unknown>)
    const requestedMint = mint.trim()
    // GET /tokens/:mint — some responses omit mint on the nested object; path is canonical.
    if (!token.mint) token.mint = requestedMint
    if (!token.mint) return null
    return token
  } catch {
    return null
  }
}

export async function getTokensByCreator(wallet: string): Promise<BagsToken[]> {
  if (!wallet) return []
  try {
    const { data } = await bagsClient.get('/tokens', {
      params: { search: wallet, limit: 50 },
    })
    const tokens = (data?.tokens || data?.data || []).map(normalizeToken)
    return tokens.filter((t: BagsToken) => t.creatorWallet?.toLowerCase() === wallet.toLowerCase())
  } catch {
    return []
  }
}

/**
 * Resolve mint when `getTokensByCreator` is empty but Bags can still find the token by symbol
 * (some API responses omit or mismatch creator filtering on wallet search).
 */
export async function findCreatorTokenBySymbol(wallet: string, symbolUpper: string): Promise<BagsToken | null> {
  const w = wallet.trim()
  const sym = symbolUpper.trim().toUpperCase()
  if (!w || !sym || !API_KEY) return null

  const direct = await getTokensByCreator(w)
  const dHit = direct.find((t) => (t.symbol || '').toUpperCase() === sym)
  if (dHit) return dHit

  try {
    const { data } = await bagsClient.get('/tokens', {
      params: { search: sym, limit: 40 },
    })
    const tokens = (data?.tokens || data?.data || []).map(normalizeToken)
    return (
      tokens.find(
        (t: BagsToken) =>
          (t.symbol || '').toUpperCase() === sym && t.creatorWallet?.toLowerCase() === w.toLowerCase()
      ) ?? null
    )
  } catch {
    return null
  }
}

export async function getLatestTokens(): Promise<BagsToken[]> {
  try {
    const { data } = await bagsClient.get('/tokens', {
      params: { limit: 12 },
    })
    const tokens = (data?.tokens || data?.data || []).map(normalizeToken)
    // Filter out Bags product tokens
    return tokens.filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  } catch (err: any) {
    console.error('Bags API getLatestTokens failed:', err.message)
    return getMockTokens().slice(0, 3).filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  }
}

function normalizeToken(t: Record<string, unknown>): BagsToken {
  return {
    mint: (t.mint || t.address || t.id || '') as string,
    name: (t.name || 'Unknown Token') as string,
    symbol: (t.symbol || 'UNK') as string,
    price: Number(t.price ?? t.priceUsd ?? t.usdPrice ?? t.spotPrice ?? 0),
    priceChange24h: Number(t.priceChange24h ?? t.change24h ?? t.priceChange24H ?? 0),
    marketCap: Number(t.marketCap ?? t.mcap ?? t.market_cap ?? t.fdv ?? 0),
    volume24h: Number(t.volume24h ?? t.volume ?? t.volume24H ?? t.vol24h ?? 0),
    imageUrl: (t.imageUrl || t.image || t.logo || '') as string,
    creatorWallet: (t.creatorWallet || t.creator || t.deployer || '') as string,
    twitter: (t.twitter || t.twitterHandle || '') as string,
    description: (t.description || '') as string,
    holders: Number(t.holders || 0),
    liquidity: Number(t.liquidity || t.liquidityUsd || 0),
    feeApy: Number(t.feeApy || t.revenueApy || 0),
    creatorImage: ((t.creator || t.deployer) as any)?.image || ((t.creator || t.deployer) as any)?.pfp || '',
  }
}

// Mock data for when API key is not set
function getMockTokens(query?: string): BagsToken[] {
  return MOCK_TOKENS.filter(t =>
    !query ||
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.symbol.toLowerCase().includes(query.toLowerCase())
  )
}

export const MOCK_TOKENS: BagsToken[] = [
  {
    mint: 'Bags111111111111111111111111111111111111',
    name: 'Bags',
    symbol: 'BAGS',
    price: 34.20,
    priceChange24h: 8.4,
    marketCap: 420000000,
    volume24h: 12000000,
    imageUrl: 'https://unavatar.io/twitter/bags',
    creatorWallet: 'BagsDev111111111111111111111111111',
    twitter: 'bags',
    description: 'The definitive identity protocol and trading platform on Solana.',
    holders: 42000,
    liquidity: 5000000,
    feeApy: 12.5,
    creatorImage: 'https://unavatar.io/twitter/bags',
  },
  {
    mint: 'Kitty111111111111111111111111111111111111',
    name: 'Roaring Kitty',
    symbol: 'KITTY',
    price: 0.0124,
    priceChange24h: 42.8,
    marketCap: 12500000,
    volume24h: 8900000,
    imageUrl: 'https://unavatar.io/twitter/TheRoaringKitty',
    creatorWallet: 'KittyDev222222222222222222222222222',
    twitter: 'TheRoaringKitty',
    description: 'Roaring Kitty fan token.',
    holders: 8900,
    liquidity: 1200000,
    feeApy: 4.2,
    creatorImage: 'https://unavatar.io/twitter/TheRoaringKitty',
  },
  {
    mint: 'Mother1111111111111111111111111111111111',
    name: 'Mother Iggy',
    symbol: 'MOTHER',
    price: 0.0842,
    priceChange24h: -5.2,
    marketCap: 84000000,
    volume24h: 15400000,
    imageUrl: 'https://unavatar.io/twitter/IGGYAZALEA',
    creatorWallet: 'IggyWallet333333333333333333333333333',
    twitter: 'IGGYAZALEA',
    description: 'The mother of all meme tokens.',
    holders: 64000,
    liquidity: 8000000,
    feeApy: 6.8,
    creatorImage: 'https://unavatar.io/twitter/IGGYAZALEA',
  },
  {
    mint: 'Toly11111111111111111111111111111111111',
    name: 'Solana Founder',
    symbol: 'TOLY',
    price: 1.42,
    priceChange24h: 12.4,
    marketCap: 142000000,
    volume24h: 4200000,
    imageUrl: 'https://unavatar.io/twitter/aeyakovenko',
    creatorWallet: 'TolyWallet444444444444444444444444444',
    twitter: 'aeyakovenko',
    description: 'Official Toly fan token representing high speed and low latency.',
    holders: 12500,
    liquidity: 4500000,
    feeApy: 14.1,
    creatorImage: 'https://unavatar.io/twitter/aeyakovenko',
  },
]
