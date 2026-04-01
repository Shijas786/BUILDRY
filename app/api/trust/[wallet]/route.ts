import { NextRequest, NextResponse } from 'next/server'
import { getProfile } from '@/lib/talent'
import { getFarcasterProfileByWallet, getFarcasterProfileByUsername } from '@/lib/farcaster'
import { getTokensByCreator } from '@/lib/bags'
import { getBuildryTrustSnapshotForSolWallet } from '@/lib/buildryTrustEnrichment'
import { buildTrustData, getHeliusTransactions } from '@/lib/trust'

export async function GET(
  req: NextRequest,
  { params }: { params: { wallet: string } }
) {
  const { wallet } = params
  const twitterQP = req.nextUrl.searchParams.get('twitter') || null
  const bagsAvatar = req.nextUrl.searchParams.get('avatar') || null

  const [profile, buildry, bagsProjects, heliusTxns] = await Promise.all([
    getProfile(wallet),
    getBuildryTrustSnapshotForSolWallet(wallet),
    getTokensByCreator(wallet),
    getHeliusTransactions(wallet),
  ])

  const twitterMerged = twitterQP || buildry?.twitterHandle || null

  const farcaster = await getFarcasterProfileByWallet(wallet).then(async (f) => {
    if (f) return f
    if (twitterMerged) return getFarcasterProfileByUsername(twitterMerged)
    return null
  })

  const trustData = buildTrustData(
    profile,
    twitterMerged,
    farcaster,
    bagsProjects,
    bagsAvatar,
    heliusTxns,
    buildry
  )

  // Per-wallet, changes when user links wallets / socials — avoid long CDN cache (felt like “refresh does nothing”).
  return NextResponse.json(trustData, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
