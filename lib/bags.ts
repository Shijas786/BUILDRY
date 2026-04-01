import axios from 'axios'

const BAGS_BASE = 'https://public-api-v2.bags.fm/api/v1'
const API_KEY = process.env.BAGS_API_KEY || ''

const DEX_TOKENS = 'https://api.dexscreener.com/latest/dex/tokens'
const DEX_SEARCH = 'https://api.dexscreener.com/latest/dex/search'

const bagsClient = axios.create({
  baseURL: BAGS_BASE,
  headers: API_KEY ? { 'x-api-key': API_KEY } : {},
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

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Bags v2 wraps payloads as `{ success, response }`. */
function unwrapResponse<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.success === false) return null
  if ('response' in d && d.response !== undefined) return d.response as T
  return data as T
}

async function fetchFeeShareAdminMints(wallet: string): Promise<string[]> {
  if (!API_KEY || !wallet.trim()) return []
  try {
    const { data } = await bagsClient.get('/fee-share/admin/list', {
      params: { wallet: wallet.trim() },
    })
    const inner = unwrapResponse<{ tokenMints?: string[] }>(data)
    const mints = inner && typeof inner === 'object' && Array.isArray(inner.tokenMints) ? inner.tokenMints : []
    return mints.map((m) => String(m).trim()).filter(Boolean)
  } catch {
    return []
  }
}

async function fetchTokenLaunchFeedItems(): Promise<Record<string, unknown>[]> {
  try {
    const { data } = await axios.get(`${BAGS_BASE}/token-launch/feed`, {
      headers: API_KEY ? { 'x-api-key': API_KEY } : {},
      timeout: 10000,
    })
    const inner = unwrapResponse<unknown>(data)
    return Array.isArray(inner) ? (inner as Record<string, unknown>[]) : []
  } catch {
    return []
  }
}

function bagsTokenFromFeedItem(item: Record<string, unknown>, creatorWallet: string): BagsToken {
  const mint = String(item.tokenMint || '').trim()
  let twitter = ''
  const tw = item.twitter
  if (typeof tw === 'string' && tw.trim()) {
    twitter = tw.replace(/^https?:\/\/(x\.com|twitter\.com)\//i, '').replace(/\/$/, '')
  }
  return {
    mint,
    name: String(item.name || 'Unknown Token'),
    symbol: String(item.symbol || 'UNK').toUpperCase(),
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    imageUrl: String(item.image || item.imageUrl || ''),
    creatorWallet,
    twitter,
    description: String(item.description || ''),
    holders: 0,
    liquidity: 0,
    feeApy: 0,
  }
}

async function tokenFromDexscreenerMint(mint: string, creatorWallet: string): Promise<BagsToken | null> {
  const m = mint.trim()
  if (!m) return null
  try {
    const { data } = await axios.get(`${DEX_TOKENS}/${encodeURIComponent(m)}`, { timeout: 8000 })
    const pairs = Array.isArray(data?.pairs) ? data.pairs : []
    const sol = pairs.filter((p: { chainId?: string }) => p.chainId === 'solana')
    if (!sol.length) return null

    const ml = m.toLowerCase()
    const score = (p: {
      baseToken?: { address?: string }
      quoteToken?: { address?: string }
      liquidity?: { usd?: number }
    }) => {
      const base = (p.baseToken?.address || '').toLowerCase()
      const quote = (p.quoteToken?.address || '').toLowerCase()
      const liq = num(p.liquidity?.usd)
      let s = liq
      if (base === ml) s += 1e15
      else if (quote === ml) s += 1e12
      return s
    }
    sol.sort((a: (typeof sol)[0], b: (typeof sol)[0]) => score(b) - score(a))

    const pair = sol[0] as Record<string, unknown>
    const base = pair.baseToken as { address?: string; name?: string; symbol?: string } | undefined
    const quote = pair.quoteToken as { address?: string; name?: string; symbol?: string } | undefined
    const isBase = (base?.address || '').toLowerCase() === ml
    const tok = isBase ? base : quote
    if (!tok?.address) return null

    const info = pair.info as { imageUrl?: string } | undefined

    return {
      mint: tok.address,
      name: (tok.name || 'Unknown Token').trim(),
      symbol: (tok.symbol || 'UNK').toUpperCase(),
      price: num(pair.priceUsd),
      priceChange24h: num((pair.priceChange as { h24?: number } | undefined)?.h24),
      marketCap: num(pair.marketCap) || num(pair.fdv),
      volume24h: num((pair.volume as { h24?: number } | undefined)?.h24),
      liquidity: num((pair.liquidity as { usd?: number } | undefined)?.usd),
      imageUrl: info?.imageUrl || '',
      creatorWallet,
      description: '',
    }
  } catch {
    return null
  }
}

async function mapInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = await Promise.all(items.slice(i, i + batchSize).map(fn))
    out.push(...chunk)
  }
  return out
}

export async function searchTokens(query: string): Promise<BagsToken[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const { data } = await axios.get(DEX_SEARCH, { params: { q }, timeout: 8000 })
    const pairs = Array.isArray(data?.pairs) ? data.pairs : []
    const sol = pairs.filter((p: { chainId?: string }) => p.chainId === 'solana')
    const seen = new Set<string>()
    const out: BagsToken[] = []
    for (const pair of sol.slice(0, 40)) {
      const p = pair as Record<string, unknown>
      const base = p.baseToken as { address?: string; name?: string; symbol?: string } | undefined
      const addr = base?.address?.trim()
      if (!addr || seen.has(addr)) continue
      seen.add(addr)
      out.push({
        mint: addr,
        name: (base?.name || 'Unknown Token').trim(),
        symbol: (base?.symbol || 'UNK').toUpperCase(),
        price: num(p.priceUsd),
        priceChange24h: num((p.priceChange as { h24?: number } | undefined)?.h24),
        marketCap: num(p.marketCap) || num(p.fdv),
        volume24h: num((p.volume as { h24?: number } | undefined)?.h24),
        liquidity: num((p.liquidity as { usd?: number } | undefined)?.usd),
        imageUrl: String((p.info as { imageUrl?: string } | undefined)?.imageUrl || ''),
      })
      if (out.length >= 20) break
    }
    return out
  } catch {
    return getMockTokens(query)
  }
}

export async function getTrendingTokens(): Promise<BagsToken[]> {
  try {
    const items = await fetchTokenLaunchFeedItems()
    const tokens = items.map((item) => bagsTokenFromFeedItem(item, ''))
    return tokens.filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Bags API getTrendingTokens failed:', msg)
    return getMockTokens().filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  }
}

export async function getToken(mint: string): Promise<BagsToken | null> {
  if (!mint?.trim()) return null
  const requestedMint = mint.trim()
  const fromDex = await tokenFromDexscreenerMint(requestedMint, '')
  if (fromDex) return fromDex

  const items = await fetchTokenLaunchFeedItems()
  const hit = items.find((it) => String(it.tokenMint || '').trim() === requestedMint)
  if (hit) return bagsTokenFromFeedItem(hit, '')

  return null
}

/**
 * Tokens where `wallet` is Bags fee-share admin (matches launched creator flow).
 * Hydrates name/symbol/stats via Dexscreener, with token-launch feed fallback for very new mints.
 *
 * Note: Legacy `GET /tokens?search=wallet` is not present on public-api-v2 (404); use fee-share admin list instead.
 */
export async function getTokensByCreator(wallet: string): Promise<BagsToken[]> {
  if (!wallet.trim()) return []

  const mints = await fetchFeeShareAdminMints(wallet)
  if (mints.length === 0) return []

  const w = wallet.trim()
  const capped = mints.slice(0, 40)
  const feedItems = await fetchTokenLaunchFeedItems()
  const feedByMint = new Map<string, Record<string, unknown>>()
  for (const it of feedItems) {
    const m = String(it.tokenMint || '').trim()
    if (m) feedByMint.set(m, it)
  }

  const hydrated = await mapInBatches(capped, 6, async (mint) => {
    const dex = await tokenFromDexscreenerMint(mint, w)
    if (dex) return dex
    const raw = feedByMint.get(mint)
    if (raw) return bagsTokenFromFeedItem(raw, w)
    return null
  })

  return hydrated.filter((t): t is BagsToken => t != null && Boolean(t.mint))
}

/**
 * Match creator wallet + symbol using `getTokensByCreator` (fee-share admin mints + hydration).
 */
export async function findCreatorTokenBySymbol(wallet: string, symbolUpper: string): Promise<BagsToken | null> {
  const w = wallet.trim()
  const sym = symbolUpper.trim().toUpperCase()
  if (!w || !sym) return null

  const direct = await getTokensByCreator(w)
  return direct.find((t) => (t.symbol || '').toUpperCase() === sym) ?? null
}

export async function getLatestTokens(): Promise<BagsToken[]> {
  try {
    const items = (await fetchTokenLaunchFeedItems()).slice(0, 12)
    const tokens = items.map((item) => bagsTokenFromFeedItem(item, ''))
    return tokens.filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Bags API getLatestTokens failed:', msg)
    return getMockTokens().slice(0, 3).filter((t: BagsToken) => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
  }
}

// Mock data for when API key is not set
function getMockTokens(query?: string): BagsToken[] {
  return MOCK_TOKENS.filter(
    (t) =>
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
    price: 34.2,
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
