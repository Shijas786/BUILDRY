import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function GET(req: NextRequest) {
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
  const userId = req.nextUrl.searchParams.get('userId')
  const offset = (page - 1) * limit

  let query = supabase
    .from('posts')
    .select('*, users!posts_author_id_fkey(id, name, avatar_url, account_type, builder_profiles(username))')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) {
    const { data: following } = await supabase
      .from('builder_followers')
      .select('builder_id')
      .eq('follower_id', userId)

    if (following && following.length > 0) {
      const authorIds = following.map(f => f.builder_id)
      authorIds.push(userId)
    }
  }

  const { data: posts, error } = await query

  if (error) {
    console.error('Feed fetch error:', error)
    return NextResponse.json([], { status: 500 })
  }

  return NextResponse.json(posts || [], {
    headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=10' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { authorId, content, postType, images, milestoneTitle, milestoneCategory, projectId, linkUrl } = body

    if (!authorId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        content,
        post_type: postType || 'update',
        images: images || [],
        milestone_title: milestoneTitle || null,
        milestone_category: milestoneCategory || null,
        project_id: projectId || null,
        link_url: linkUrl || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Post create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('Posts API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
