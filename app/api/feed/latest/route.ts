import { NextResponse } from 'next/server'
import type { BagsToken } from '@/lib/bags'
import { getLatestTokens, getToken } from '@/lib/bags'
import { BUILDRY_PLATFORM_TOKEN_MINT } from '@/lib/buildryPlatformToken'
import { loadRecentBuildryLaunchMints, type RecentLaunchMint } from '@/lib/recentBuildryLaunchMints'
import { getProfile } from '@/lib/talent'
import { resolveTrustTier } from '@/lib/trust'

const TICKER_LIMIT = 16
const TRUST_LOOKUP_LIMIT = 8

function syntheticFromLaunch(row: RecentLaunchMint): BagsToken {
  return {
    mint: row.mint,
    name: row.symbol,
    symbol: row.symbol,
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    holders: 0,
    liquidity: 0,
    feeApy: 0,
  }
}

function bagsProductToken(t: BagsToken): boolean {
  return t.name.toLowerCase().includes('bags') || t.symbol === 'BAGS'
}

function pricePctForTicker(t: BagsToken): number | null {
  if (!Number.isFinite(t.priceChange24h)) return null
  if (t.price === 0 && t.marketCap === 0 && t.volume24h === 0 && t.liquidity === 0) return null
  return t.priceChange24h
}

async function platformTickerToken(): Promise<BagsToken> {
  const full = await getToken(BUILDRY_PLATFORM_TOKEN_MINT)
  if (full && !bagsProductToken(full)) return full
  return {
    mint: BUILDRY_PLATFORM_TOKEN_MINT,
    name: 'Buildry',
    symbol: 'BUILDRY',
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    holders: 0,
    liquidity: 0,
    feeApy: 0,
  }
}

async function mergeTickerTokens(): Promise<BagsToken[]> {
  const [platform, recentRows, bagsTokens] = await Promise.all([
    platformTickerToken(),
    loadRecentBuildryLaunchMints(28),
    getLatestTokens(),
  ])

  const fromBuildry = await Promise.all(
    recentRows.map(async (row) => {
      const full = await getToken(row.mint)
      if (full && !bagsProductToken(full)) return full
      return syntheticFromLaunch(row)
    })
  )

  const merged: BagsToken[] = []
  const seen = new Set<string>([BUILDRY_PLATFORM_TOKEN_MINT])

  for (const t of fromBuildry) {
    if (!t.mint || seen.has(t.mint)) continue
    seen.add(t.mint)
    merged.push(t)
  }

  for (const t of bagsTokens) {
    if (!t.mint || seen.has(t.mint) || bagsProductToken(t)) continue
    seen.add(t.mint)
    merged.push(t)
  }

  const rest = merged.slice(0, TICKER_LIMIT - 1)
  return [platform, ...rest]
}

export async function GET() {
  try {
    const tokens = await mergeTickerTokens()

    const enriched = await Promise.all(
      tokens.map(async (t, idx) => {
        const pricePct24h = pricePctForTicker(t)
        const pfp =
          t.creatorImage || (t.twitter ? `https://unavatar.io/twitter/${t.twitter}` : null)

        const isPlatformToken = t.mint === BUILDRY_PLATFORM_TOKEN_MINT

        if (!t.creatorWallet) {
          return {
            ...t,
            tier: 'ANONYMOUS' as const,
            builderRank: null as number | null,
            username: t.twitter || null,
            profilePicture: pfp,
            pricePct24h,
            isPlatformToken,
          }
        }

        if (idx >= TRUST_LOOKUP_LIMIT) {
          const tier = resolveTrustTier({
            talentProfile: null,
            builderScore: null,
            twitterFromBags: t.twitter || null,
          })
          return {
            ...t,
            tier,
            builderRank: null as number | null,
            username: t.twitter || null,
            profilePicture: pfp,
            pricePct24h,
            isPlatformToken,
          }
        }

        try {
          const profile = await getProfile(t.creatorWallet)

          const tier = resolveTrustTier({
            talentProfile: profile,
            builderScore: profile?.score ?? null,
            twitterFromBags: t.twitter || null,
          })

          return {
            ...t,
            tier,
            builderRank: null as number | null,
            username: profile?.username || t.twitter || null,
            profilePicture: t.creatorImage || profile?.avatar || (t.twitter ? `https://unavatar.io/twitter/${t.twitter}` : null),
            pricePct24h,
            isPlatformToken,
          }
        } catch {
          return {
            ...t,
            tier: 'ANONYMOUS' as const,
            builderRank: null as number | null,
            username: t.twitter || null,
            profilePicture: pfp,
            pricePct24h,
            isPlatformToken,
          }
        }
      })
    )

    return NextResponse.json(
      { tokens: enriched },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
