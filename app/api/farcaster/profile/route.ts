import { NextRequest, NextResponse } from 'next/server'
import { getFarcasterProfileByFid, getFarcasterProfileByUsername } from '@/lib/farcaster'

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get('fid')
  const username = req.nextUrl.searchParams.get('username')

  try {
    let profile = null

    if (fid && Number.isFinite(Number(fid))) {
      profile = await getFarcasterProfileByFid(Number(fid))
    } else if (username) {
      profile = await getFarcasterProfileByUsername(username)
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch Farcaster profile'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
