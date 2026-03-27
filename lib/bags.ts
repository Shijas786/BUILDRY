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
  try {
    const { data } = await bagsClient.get(`/tokens/${mint}`)
    return normalizeToken(data?.token || data?.data || data)
  } catch {
    return getMockToken(mint)
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
    price: Number(t.price || t.priceUsd || 0),
    priceChange24h: Number(t.priceChange24h || t.change24h || 0),
    marketCap: Number(t.marketCap || t.mcap || 0),
    volume24h: Number(t.volume24h || t.volume || 0),
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

function getMockToken(mint: string): BagsToken {
  return MOCK_TOKENS.find(t => t.mint === mint) || {
    ...MOCK_TOKENS[0],
    mint,
  }
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
