import { NextRequest, NextResponse } from 'next/server'
import { loadBuilderProfilePayload } from '@/lib/builderProfilePayload'

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const body = await loadBuilderProfilePayload(params.username)
  return NextResponse.json(body, {
    headers: {
      // Short CDN TTL so token/env fixes show up quickly; browsers should also skip cache (see profile page fetch).
      'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
