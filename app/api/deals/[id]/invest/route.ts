import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabaseService'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { investorId, amountUsd, txHash } = await req.json()

  if (!investorId || !amountUsd) {
    return NextResponse.json({ error: 'Missing investorId or amountUsd' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('deal_investments')
    .insert({
      deal_id: params.id,
      investor_id: investorId,
      amount_usd: amountUsd,
      tx_hash: txHash || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Deal invest error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  try {
    await supabase.rpc('increment_deal_backers', { deal_id_input: params.id })
  } catch {}

  return NextResponse.json(data, { status: 201 })
}
