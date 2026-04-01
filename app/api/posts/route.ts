import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { loadHydratedPosts } from '@/lib/loadHydratedPosts'

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
    const userId = req.nextUrl.searchParams.get('userId') || ''

    const hydrated = await loadHydratedPosts({
      page,
      limit,
      followerUserId: userId || undefined,
    })

    return NextResponse.json(hydrated, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('Posts GET error:', err)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const db = adminDb

  try {
    const body = await req.json()
    const {
      authorId,
      content,
      postType,
      images,
      videos,
      milestoneTitle,
      milestoneCategory,
      projectId,
      linkUrl,
      pollOptions,
      locationLabel,
      locationLat,
      locationLng,
    } = body

    if (!authorId || !content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rawPoll =
      Array.isArray(pollOptions) ? pollOptions.filter((o: unknown) => typeof o === 'string' && o.trim()) : []
    const pollOpts = rawPoll.map((s: string) => s.trim()).filter(Boolean).slice(0, 4)
    const isPoll = pollOpts.length >= 2

    const locLabel =
      typeof locationLabel === 'string' && locationLabel.trim() ? locationLabel.trim().slice(0, 200) : null
    const lat = typeof locationLat === 'number' && Number.isFinite(locationLat) ? locationLat : null
    const lng = typeof locationLng === 'number' && Number.isFinite(locationLng) ? locationLng : null

    const postRef = await db.collection(FS.POSTS).add({
      author_id: authorId,
      content: content.trim(),
      post_type: isPoll ? 'poll' : postType || 'update',
      images: Array.isArray(images) ? images.filter((u: unknown) => typeof u === 'string') : [],
      videos: Array.isArray(videos) ? videos.filter((u: unknown) => typeof u === 'string') : [],
      milestone_title: milestoneTitle || null,
      milestone_category: milestoneCategory || null,
      project_id: projectId || null,
      link_url: linkUrl || null,
      poll_options: isPoll ? pollOpts : null,
      poll_responses: isPoll ? {} : null,
      location_label: locLabel,
      location_lat: lat,
      location_lng: lng,
      likes_count: 0,
      comments_count: 0,
      created_at: Date.now(),
    })

    const postDoc = await postRef.get()
    return NextResponse.json({ id: postRef.id, ...postDoc.data() }, { status: 201 })
  } catch (err) {
    console.error('Posts API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
