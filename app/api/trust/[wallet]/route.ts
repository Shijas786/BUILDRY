import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/talent'
import { getFarcasterProfileByWallet, getFarcasterProfileByUsername } from '@/lib/farcaster'
import { getTokensByCreator } from '@/lib/bags'
import { buildTrustData, getHeliusTransactions } from '@/lib/trust'

export async function GET(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const { wallet } = params
  const twitterFromBags = req.nextUrl.searchParams.get('twitter') || null
  const bagsAvatar = req.nextUrl.searchParams.get('avatar') || null

  // Call Talent Protocol + Farcaster + Bags History + Helius in parallel
  const [profile, farcaster, bagsProjects, heliusTxns] = await Promise.all([
    getProfile(wallet),
    // Try wallet address first; fallback to Twitter handle as username on Farcaster
    getFarcasterProfileByWallet(wallet).then(async (f) => {
      if (f) return f
      if (twitterFromBags) return getFarcasterProfileByUsername(twitterFromBags)
      return null
    }),
    getTokensByCreator(wallet),
    getHeliusTransactions(wallet)
  ])

  const trustData = buildTrustData(profile, twitterFromBags, farcaster, bagsProjects, bagsAvatar, heliusTxns)

  return NextResponse.json(trustData, {
    headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=300' },
  })
}
