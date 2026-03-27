import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

  let query = supabase
    .from('jobs')
    .select('*, users!jobs_client_id_fkey(name, avatar_url)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Jobs GET error:', error)
    return NextResponse.json([], { status: 500 })
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, title, description, category, skillsRequired, budgetUsd, budgetType, deadline, paymentCurrency } = body

    if (!clientId || !title || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        client_id: clientId,
        title,
        description,
        category,
        skills_required: skillsRequired || [],
        budget_usd: budgetUsd || null,
        budget_type: budgetType || 'fixed',
        deadline: deadline || null,
        payment_currency: paymentCurrency || 'USDC',
      })
      .select()
      .single()

    if (error) {
      console.error('Job create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Jobs API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
