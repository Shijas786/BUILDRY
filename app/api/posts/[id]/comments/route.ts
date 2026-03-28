import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 200 })
  }
  const db = adminDb

  const commentDocs = await db.collection('post_comments').where('post_id', '==', params.id).get()
  const comments = await Promise.all(
    commentDocs.docs.map(async (commentDoc) => {
      const base = { id: commentDoc.id, ...commentDoc.data() } as any
      const userDoc = await db.collection('users').doc(base.author_id).get()
      return {
        ...base,
        users: userDoc.exists
          ? {
              id: base.author_id,
              name: userDoc.data()?.name || 'Builder',
              avatar_url: userDoc.data()?.avatar_url || null,
            }
          : null,
      }
    })
  )

  comments.sort((a: any, b: any) => (a.created_at || 0) - (b.created_at || 0))
  return NextResponse.json(comments)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const db = adminDb

  const { authorId, content } = await req.json()
  if (!authorId || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const postRef = db.collection('posts').doc(params.id)
  const commentRef = await db.collection('post_comments').add({
    post_id: params.id,
    author_id: authorId,
    content,
    created_at: Date.now(),
  })

  await db.runTransaction(async (trx) => {
    const postSnap = await trx.get(postRef)
    const currentCount = (postSnap.data()?.comments_count || 0) as number
    trx.set(postRef, { comments_count: currentCount + 1 }, { merge: true })
  })

  const commentDoc = await commentRef.get()
  return NextResponse.json({ id: commentRef.id, ...commentDoc.data() }, { status: 201 })
}
