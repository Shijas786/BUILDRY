import { NextRequest, NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'
import { loadBuildrySolWalletLookup } from '@/lib/buildrySolWalletDirectory'
import { attachBuildryMeta, fetchTokenHoldersFromRpc } from '@/lib/tokenHoldersServer'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const mint = (params.mint || '').trim()
  if (!mint) {
    return NextResponse.json({ error: 'Missing mint' }, { status: 400 })
  }
  try {
    new PublicKey(mint)
  } catch {
    return NextResponse.json({ error: 'Invalid mint' }, { status: 400 })
  }

  try {
    const [raw, lookup] = await Promise.all([fetchTokenHoldersFromRpc(mint), loadBuildrySolWalletLookup()])
    const holders = attachBuildryMeta(raw, lookup)
    return NextResponse.json(
      { holders },
      {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
      }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load holders'
    console.error('token holders:', e)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
