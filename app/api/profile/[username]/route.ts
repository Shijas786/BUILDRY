import { NextRequest, NextResponse } from 'next/server'
import { loadBuilderProfilePayload } from '@/lib/builderProfilePayload'

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const body = await loadBuilderProfilePayload(params.username)
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=60' },
  })
}
