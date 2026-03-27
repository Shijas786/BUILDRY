import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    const { followerId, builderId } = await req.json()

    if (!followerId || !builderId) {
      return NextResponse.json({ error: 'Missing followerId or builderId' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('builder_followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('builder_id', builderId)
      .single()

    if (existing) {
      await supabase.from('builder_followers').delete().eq('id', existing.id)
      return NextResponse.json({ followed: false })
    }

    await supabase.from('builder_followers').insert({
      follower_id: followerId,
      builder_id: builderId,
    })

    return NextResponse.json({ followed: true })
  } catch (err) {
    console.error('Follow API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
