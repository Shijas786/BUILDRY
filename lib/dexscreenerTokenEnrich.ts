import axios from 'axios'
import type { BagsToken } from '@/lib/bags'

const DEX_BASE = 'https://api.dexscreener.com/latest/dex/tokens'

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * When Bags omits spot stats, fill price / mcap / volume / liquidity from Dexscreener (Solana pairs).
 */
export async function enrichTokenFromDexscreener(token: BagsToken): Promise<BagsToken> {
  const mint = (token.mint || '').trim()
  if (!mint) return token

  const needsPrice = !token.price || token.price <= 0
  const needsMcap = !token.marketCap || token.marketCap <= 0
  const needsVol = !token.volume24h || token.volume24h <= 0
  if (!needsPrice && !needsMcap && !needsVol) return token

  try {
    const { data } = await axios.get(`${DEX_BASE}/${encodeURIComponent(mint)}`, { timeout: 8000 })
    const pairs = Array.isArray(data?.pairs) ? data.pairs : []
    const sol = pairs.filter((p: { chainId?: string }) => p.chainId === 'solana')
    if (!sol.length) return token

    const m = mint.toLowerCase()
    const score = (p: {
      baseToken?: { address?: string }
      quoteToken?: { address?: string }
      liquidity?: { usd?: number }
    }) => {
      const base = (p.baseToken?.address || '').toLowerCase()
      const quote = (p.quoteToken?.address || '').toLowerCase()
      const liq = num(p.liquidity?.usd)
      let s = liq
      if (base === m) s += 1e15
      else if (quote === m) s += 1e12
      return s
    }

    sol.sort((a: (typeof sol)[0], b: (typeof sol)[0]) => score(b) - score(a))
    const pair = sol[0] as {
      priceUsd?: string
      marketCap?: number
      fdv?: number
      volume?: { h24?: number }
      liquidity?: { usd?: number }
      priceChange?: { h24?: number }
      baseToken?: { address?: string }
    }

    const priceUsd = num(pair.priceUsd)
    const dexCh = num(pair.priceChange?.h24)

    return {
      ...token,
      price: needsPrice && priceUsd > 0 ? priceUsd : token.price,
      marketCap:
        needsMcap && (num(pair.marketCap) > 0 || num(pair.fdv) > 0)
          ? num(pair.marketCap) || num(pair.fdv)
          : token.marketCap,
      volume24h: needsVol && num(pair.volume?.h24) > 0 ? num(pair.volume?.h24) : token.volume24h,
      liquidity:
        (!token.liquidity || token.liquidity <= 0) && num(pair.liquidity?.usd) > 0
          ? num(pair.liquidity?.usd)
          : token.liquidity,
      priceChange24h:
        needsPrice && priceUsd > 0 && Number.isFinite(dexCh) ? dexCh : token.priceChange24h,
    }
  } catch {
    return token
  }
}
