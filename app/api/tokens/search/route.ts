import { NextRequest, NextResponse } from 'next/server'
import { searchTokens } from '@/lib/bags'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q) return NextResponse.json([])
  const tokens = await searchTokens(q)
  return NextResponse.json(tokens)
}
