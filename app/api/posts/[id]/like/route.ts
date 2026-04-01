import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS, FS_DOC_IDS } from '@/lib/firestoreCollections'
import { notifySocial } from '@/lib/notificationsServer'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const db = adminDb

  const { userId } = await req.json()
  const postId = params.id

  if (!userId || !postId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const likeId = FS_DOC_IDS.POST_LIKE(postId, userId)
  const likeRef = db.collection(FS.POST_LIKES).doc(likeId)
  const postRef = db.collection(FS.POSTS).doc(postId)

  const existing = await likeRef.get()
  if (existing.exists) {
    await db.runTransaction(async (trx) => {
      const postSnap = await trx.get(postRef)
      const currentLikes = (postSnap.data()?.likes_count || 0) as number
      trx.delete(likeRef)
      trx.set(postRef, { likes_count: Math.max(0, currentLikes - 1) }, { merge: true })
    })
    return NextResponse.json({ liked: false })
  }

  await db.runTransaction(async (trx) => {
    const postSnap = await trx.get(postRef)
    const currentLikes = (postSnap.data()?.likes_count || 0) as number
    trx.set(likeRef, { post_id: postId, user_id: userId, created_at: Date.now() })
    trx.set(postRef, { likes_count: currentLikes + 1 }, { merge: true })
  })

  const authorId = (await postRef.get()).data()?.author_id as string | undefined
  if (authorId) {
    await notifySocial(db, {
      recipientUserId: authorId,
      actorUserId: userId,
      type: 'post_like',
      postId,
    })
  }

  return NextResponse.json({ liked: true })
}
