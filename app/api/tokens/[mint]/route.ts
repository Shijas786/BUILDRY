import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/bags'

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } = params
  const token = await getToken(mint)
  if (!token) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }
  return NextResponse.json(token, {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=10' },
  })
}
