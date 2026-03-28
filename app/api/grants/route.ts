import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabaseService'

export async function GET(req: NextRequest) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json([], { status: 503 })
  }

  const grantType = req.nextUrl.searchParams.get('type')
  const ecosystem = req.nextUrl.searchParams.get('ecosystem')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')

  let query = supabase
    .from('grants')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (grantType) query = query.eq('grant_type', grantType)
  if (ecosystem) query = query.eq('ecosystem', ecosystem)

  const { data, error } = await query

  if (error) {
    console.error('Grants GET error:', error)
    return NextResponse.json([], { status: 500 })
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
  })
}

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const body = await req.json()
    const {
      postedBy, title, description, organization, grantType,
      amountUsd, currency, applicationUrl, deadline, tags, ecosystem
    } = body

    if (!postedBy || !title || !description || !organization || !grantType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('grants')
      .insert({
        posted_by: postedBy,
        title,
        description,
        organization,
        grant_type: grantType,
        amount_usd: amountUsd || null,
        currency: currency || 'USD',
        application_url: applicationUrl || null,
        deadline: deadline || null,
        tags: tags || [],
        ecosystem: ecosystem || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Grant create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Grants API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
