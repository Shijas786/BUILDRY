import { NextRequest, NextResponse } from 'next/server'
import { loadBuilderProfilePayload } from '@/lib/builderProfilePayload'

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const body = await loadBuilderProfilePayload(params.username)
  return NextResponse.json(body, {
    headers: {
      // Private cache: browser may reuse for back/forward; profile page refresh still uses no-store.
      'Cache-Control': 'private, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
  })
}
