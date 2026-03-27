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
  const { userId } = await req.json()
  const postId = params.id

  if (!userId || !postId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('post_likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .single()

  if (existing) {
    await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId)
    try {
      await supabase.rpc('decrement_likes', { post_id_input: postId })
    } catch {}
    return NextResponse.json({ liked: false })
  }

  await supabase.from('post_likes').insert({ user_id: userId, post_id: postId })
  try {
    await supabase.rpc('increment_likes', { post_id_input: postId })
  } catch {}
  return NextResponse.json({ liked: true })
}
