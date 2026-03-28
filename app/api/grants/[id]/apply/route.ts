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
