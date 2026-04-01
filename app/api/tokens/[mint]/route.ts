import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/bags'
import { enrichTokenFromDexscreener } from '@/lib/dexscreenerTokenEnrich'

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { mint } = params
  const raw = await getToken(mint)
  if (!raw) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }
  const token = await enrichTokenFromDexscreener(raw)
  return NextResponse.json(token, {
    headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
  })
}
