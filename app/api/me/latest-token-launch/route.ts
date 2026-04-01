import { NextRequest, NextResponse } from 'next/server'
import { loadLatestLaunchPostForUser } from '@/lib/latestLaunchPostForUser'
import { uidFromBearer } from '@/lib/notificationsApiAuth'

export async function GET(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof Response) return uidOrRes

  const launch = await loadLatestLaunchPostForUser(uidOrRes)
  return NextResponse.json(
    { launch },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
