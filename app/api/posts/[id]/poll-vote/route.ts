import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }

  let body: { userId?: string; optionIndex?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const optionIndex = typeof body.optionIndex === 'number' ? body.optionIndex : -1
  if (!userId || optionIndex < 0) {
    return NextResponse.json({ error: 'Missing userId or optionIndex' }, { status: 400 })
  }

  const postId = params.id
  const ref = adminDb.collection(FS.POSTS).doc(postId)

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) throw new Error('not_found')
      const data = snap.data() || {}
      const options = Array.isArray(data.poll_options) ? data.poll_options : []
      if (options.length < 2 || optionIndex >= options.length) throw new Error('bad_poll')
      const responses = data.poll_responses && typeof data.poll_responses === 'object' ? { ...data.poll_responses } : {}
      responses[userId] = optionIndex
      tx.update(ref, { poll_responses: responses })
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (msg === 'bad_poll') return NextResponse.json({ error: 'Invalid poll' }, { status: 400 })
    console.error('poll-vote:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
