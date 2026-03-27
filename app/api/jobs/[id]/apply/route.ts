import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
