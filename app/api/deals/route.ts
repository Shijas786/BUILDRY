import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: NextRequest) {
  const dealType = req.nextUrl.searchParams.get('type')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

  let query = supabase
    .from('deals')
    .select('*, users!deals_creator_id_fkey(id, name, avatar_url, account_type), projects(title, category)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (dealType) query = query.eq('deal_type', dealType)

  const { data, error } = await query

  if (error) {
    console.error('Deals GET error:', error)
    return NextResponse.json([], { status: 500 })
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      creatorId, title, description, dealType, projectId,
      amountTargetUsd, minInvestmentUsd, valuationUsd, equityPct,
      tokenMint, tokenPriceUsd, deadline, tags
    } = body

    if (!creatorId || !title || !description || !dealType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('deals')
      .insert({
        creator_id: creatorId,
        title,
        description,
        deal_type: dealType,
        project_id: projectId || null,
        amount_target_usd: amountTargetUsd || null,
        min_investment_usd: minInvestmentUsd || null,
        valuation_usd: valuationUsd || null,
        equity_pct: equityPct || null,
        token_mint: tokenMint || null,
        token_price_usd: tokenPriceUsd || null,
        deadline: deadline || null,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Deal create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Deals API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
