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

  const { builderId, coverLetter, proposedRate } = await req.json()

  if (!builderId) {
    return NextResponse.json({ error: 'Missing builderId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      job_id: params.id,
      builder_id: builderId,
      cover_letter: coverLetter || null,
      proposed_rate: proposedRate || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Job apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
