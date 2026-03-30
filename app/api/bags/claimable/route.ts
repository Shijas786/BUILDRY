import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { BagsSDK } from '@bagsfm/bags-sdk'

type ClaimRow = { baseMint: string; totalClaimableLamportsUserShare?: number }

function baseMintOf(p: ClaimRow): string {
  return p.baseMint
}

function lamportsOf(p: ClaimRow): number {
  const n = p.totalClaimableLamportsUserShare
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, n) : 0
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.trim()
  const mint = req.nextUrl.searchParams.get('mint')?.trim()

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  try {
    new PublicKey(wallet)
    if (mint) new PublicKey(mint)
  } catch {
    return NextResponse.json({ error: 'invalid wallet or mint' }, { status: 400 })
  }

  const apiKey = process.env.BAGS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Bags API not configured', lamports: 0, sol: 0 })
  }

  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')
    const bags = new BagsSDK(apiKey, connection)
    const positions = (await bags.fee.getAllClaimablePositions(new PublicKey(wallet))) as ClaimRow[]

    let total = 0
    for (const p of positions) {
      if (mint && baseMintOf(p) !== mint) continue
      total += lamportsOf(p)
    }

    const sol = total / 1e9
    return NextResponse.json({
      lamports: total,
      sol,
      positionCount: positions.filter((p) => !mint || baseMintOf(p) === mint).length,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'claimable_fetch_failed'
    console.error('bags/claimable:', msg)
    return NextResponse.json({ error: msg, lamports: 0, sol: 0 }, { status: 200 })
  }
}
