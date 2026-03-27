import { NextRequest, NextResponse } from 'next/server'
import { getTrendingTokens } from '@/lib/bags'
import { getFarcasterProfileByWallet } from '@/lib/farcaster'

export async function GET() {
  const tokens = await getTrendingTokens()

  // Enrich top 10 tokens with identity-resolved PFPs
  const enriched = await Promise.all(
    tokens.slice(0, 10).map(async (t) => {
      if (t.creatorImage) return t
      if (!t.creatorWallet) return t

      try {
        // Try Farcaster resolution
        const fc = await getFarcasterProfileByWallet(t.creatorWallet)
        if (fc?.avatar) {
          return { ...t, creatorImage: fc.avatar }
        }
        // Fallback to unavatar
        const identifier = t.twitter || t.creatorWallet
        return { ...t, creatorImage: `https://unavatar.io/twitter/${identifier}` }
      } catch (err) {
        return t
      }
    })
  )

  // Merge back (maintaining rest of the trending list)
  const fullList = [...enriched, ...tokens.slice(10)]

  return NextResponse.json(fullList, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  })
}
