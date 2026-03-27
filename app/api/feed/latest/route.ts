import { NextRequest, NextResponse } from 'next/server'
import { getLatestTokens } from '@/lib/bags'
import { getProfile } from '@/lib/talent'
import { resolveTrustTier } from '@/lib/trust'

export async function GET() {
  try {
    const rawTokens = await getLatestTokens()
    
    // Filter out Bags product tokens (already done in lib/bags.ts, but being defensive)
    const tokens = rawTokens.filter(t => !t.name.toLowerCase().includes('bags') && t.symbol !== 'BAGS')
    
    // Enrich only the top 8 with basic trust data for the ticker
    const enriched = await Promise.all(
      tokens.slice(0, 8).map(async (t) => {
        if (!t.creatorWallet) return { ...t, tier: 'ANONYMOUS' }
        
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
            builderRank: null,
            username: profile?.username || t.twitter || null,
            profilePicture: t.creatorImage || profile?.avatar || (t.twitter ? `https://unavatar.io/twitter/${t.twitter}` : null),
          }
        } catch {
          return { ...t, tier: 'ANONYMOUS' }
        }
      })
    )

    return NextResponse.json({ tokens: enriched }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
