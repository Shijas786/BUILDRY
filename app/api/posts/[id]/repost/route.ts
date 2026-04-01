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

  const repostId = FS_DOC_IDS.POST_REPOST(postId, userId)
  const repostRef = db.collection(FS.POST_REPOSTS).doc(repostId)
  const postRef = db.collection(FS.POSTS).doc(postId)

  const existing = await repostRef.get()
  if (existing.exists) {
    await db.runTransaction(async (trx) => {
      const postSnap = await trx.get(postRef)
      const current = (postSnap.data()?.reposts_count || 0) as number
      trx.delete(repostRef)
      trx.set(postRef, { reposts_count: Math.max(0, current - 1) }, { merge: true })
    })
    return NextResponse.json({ reposted: false })
  }

  await db.runTransaction(async (trx) => {
    const postSnap = await trx.get(postRef)
    const current = (postSnap.data()?.reposts_count || 0) as number
    trx.set(repostRef, { post_id: postId, user_id: userId, created_at: Date.now() })
    trx.set(postRef, { reposts_count: current + 1 }, { merge: true })
  })

  const authorId = (await postRef.get()).data()?.author_id as string | undefined
  if (authorId) {
    await notifySocial(db, {
      recipientUserId: authorId,
      actorUserId: userId,
      type: 'post_repost',
      postId,
    })
  }

  return NextResponse.json({ reposted: true })
}
