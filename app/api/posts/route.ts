import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

async function getUserProjection(userId: string) {
  if (!adminDb) return null
  const db = adminDb
  const [userDoc, profileDoc] = await Promise.all([
    db.collection(FS.USERS).doc(userId).get(),
    db.collection(FS.BUILDER_PROFILES).doc(userId).get(),
  ])

  if (!userDoc.exists) return null
  const userData = userDoc.data() || {}
  const profileData = profileDoc.exists ? profileDoc.data() : {}
  return {
    id: userId,
    name: userData.name || 'Builder',
    avatar_url: userData.avatar_url || null,
    account_type: userData.account_type || null,
    builder_profiles: { username: (profileData as any)?.username || null },
  }
}

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 200 })
  }
  const db = adminDb

  try {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
    const offset = Math.max(0, (page - 1) * limit)
    const userId = req.nextUrl.searchParams.get('userId') || ''
    const allNeeded = offset + limit

    const postsSnap = await db.collection(FS.POSTS).orderBy('created_at', 'desc').limit(allNeeded).get()
    let postDocs = postsSnap.docs.slice(offset, offset + limit)

    if (userId) {
      const followingSnap = await db.collection(FS.BUILDER_FOLLOWERS).where('follower_id', '==', userId).get()
      const followingSet = new Set(followingSnap.docs.map((d) => d.data().builder_id))
      followingSet.add(userId)
      postDocs = postDocs.filter((d) => followingSet.has(d.data().author_id))
    }

    const hydrated = await Promise.all(
      postDocs.map(async (postDoc) => {
        const post = { id: postDoc.id, ...postDoc.data() } as any
        const userProjection = await getUserProjection(post.author_id)
        return { ...post, users: userProjection }
      })
    )

    return NextResponse.json(hydrated, {
      headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=10' },
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
    const { authorId, content, postType, images, milestoneTitle, milestoneCategory, projectId, linkUrl } = body

    if (!authorId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const postRef = await db.collection(FS.POSTS).add({
      author_id: authorId,
      content,
      post_type: postType || 'update',
      images: images || [],
      milestone_title: milestoneTitle || null,
      milestone_category: milestoneCategory || null,
      project_id: projectId || null,
      link_url: linkUrl || null,
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
