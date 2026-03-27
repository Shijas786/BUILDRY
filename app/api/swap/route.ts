import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const BAGS_BASE = 'https://public-api-v2.bags.fm/api/v1'
const API_KEY = process.env.BAGS_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { quoteResponse, userPublicKey } = await req.json()

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json({ error: 'Missing quote or wallet' }, { status: 400 })
    }

    const { data } = await axios.post(
      `${BAGS_BASE}/trade/swap`,
      {
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
      },
      {
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      }
    )

    if (!data?.success) {
      throw new Error(data?.message || 'Failed to generate swap transaction')
    }

    return NextResponse.json({
      swapTransaction: data.response.swapTransaction,
      lastValidBlockHeight: data.response.lastValidBlockHeight,
    })
  } catch (error: any) {
    console.error('Bags Swap Error:', error?.response?.data || error.message)
    return NextResponse.json({ error: error.message || 'Swap failed' }, { status: 500 })
  }
}
