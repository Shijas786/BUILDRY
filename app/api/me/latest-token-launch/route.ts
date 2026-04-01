import { NextRequest, NextResponse } from 'next/server'
import { resolveLatestLaunchForUser } from '@/lib/latestLaunchPostForUser'
import { uidFromBearer } from '@/lib/notificationsApiAuth'

export async function GET(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof Response) return uidOrRes

  const { launch, hints } = await resolveLatestLaunchForUser(uidOrRes)
  return NextResponse.json(
    { launch, hints },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
