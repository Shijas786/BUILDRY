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
  const { applicantId, pitch } = await req.json()

  if (!applicantId) {
    return NextResponse.json({ error: 'Missing applicantId' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('grant_applications')
    .insert({
      grant_id: params.id,
      applicant_id: applicantId,
      pitch: pitch || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Grant apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
