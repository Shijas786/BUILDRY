import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import {
  deserializeSwapTransactionFromBagsPayload,
  serializeBagsTransactionForWire,
} from '@/lib/deserializeSwapTransaction'

const BAGS_BASE = 'https://public-api-v2.bags.fm/api/v1'
const API_KEY = process.env.BAGS_API_KEY || ''

function extractSwapPayload(data: Record<string, unknown>): unknown {
  const r =
    data.response && typeof data.response === 'object'
      ? (data.response as Record<string, unknown>)
      : {}
  return (
    r.swapTransaction ??
    r.transaction ??
    r.serializedTransaction ??
    data.swapTransaction ??
    (data as { transaction?: unknown }).transaction
  )
}

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

    const raw = extractSwapPayload(data as Record<string, unknown>)
    if (raw == null) {
      throw new Error('Missing swap transaction from Bags')
    }
    const tx = deserializeSwapTransactionFromBagsPayload(raw)
    const wire = serializeBagsTransactionForWire(tx)

    const responseBlock = (data.response ?? data) as { lastValidBlockHeight?: number }
    return NextResponse.json({
      swapTransaction: wire.toString('base64'),
      lastValidBlockHeight: responseBlock.lastValidBlockHeight,
    })
  } catch (error: any) {
    console.error('Bags Swap Error:', error?.response?.data || error.message)
    return NextResponse.json({ error: error.message || 'Swap failed' }, { status: 500 })
  }
}
