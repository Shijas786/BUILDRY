import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const BAGS_BASE = 'https://public-api-v2.bags.fm/api/v1'
const API_KEY = process.env.BAGS_API_KEY || ''
const SOL_MINT = 'So11111111111111111111111111111111111111112'

export async function POST(req: NextRequest) {
  try {
    const { inputMint, outputMint, amount, side } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Convert amount to smallest units (9 decimals for SOL, assuming 6 for Bags tokens for now)
    // In a real app, we should fetch decimals from the token registry
    const decimals = inputMint === SOL_MINT ? 9 : 6
    const amountAtoms = Math.floor(Number(amount) * Math.pow(10, decimals))

    const { data } = await axios.get(`${BAGS_BASE}/trade/quote`, {
      params: {
        inputMint: inputMint || SOL_MINT,
        outputMint: outputMint || SOL_MINT,
        amount: amountAtoms.toString(),
        slippageMode: 'auto',
      },
      headers: { 'x-api-key': API_KEY },
    })

    const q = data?.response
    if (!q) throw new Error('No quote returned from Bags')

    return NextResponse.json({
      outAmount: Number(q.outAmount) / Math.pow(10, outputMint === SOL_MINT ? 9 : 6),
      priceImpactPct: Number(q.priceImpactPct || 0),
      slippageBps: Number(q.slippageBps || 50),
      fee: q.platformFee ? Number(q.platformFee.amount) / 1e9 : 0,
      bagsResponse: q, // Pass this back to use in /api/swap
    })
  } catch (error: any) {
    console.error('Bags Quote Error:', error?.response?.data || error.message)
    return NextResponse.json({ error: 'Quote failed' }, { status: 500 })
  }
}
