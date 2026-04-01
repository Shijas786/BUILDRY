import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS, FS_DOC_IDS } from '@/lib/firestoreCollections'
import { notifySocial } from '@/lib/notificationsServer'

async function uidFromBearer(req: NextRequest): Promise<string | NextResponse> {
  if (!isFirebaseAdminConfigured || !adminAuth) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    return decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }
}

/** Current user’s follow relationship to `builderId`. */
export async function GET(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof NextResponse) return uidOrRes
  const followerId = uidOrRes

  if (!adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }

  const builderId = req.nextUrl.searchParams.get('builderId')?.trim()
  if (!builderId) {
    return NextResponse.json({ error: 'Missing builderId' }, { status: 400 })
  }

  const followId = FS_DOC_IDS.FOLLOW(builderId, followerId)
  const snap = await adminDb.collection(FS.BUILDER_FOLLOWERS).doc(followId).get()
  return NextResponse.json({ following: snap.exists })
}

export async function POST(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof NextResponse) return uidOrRes
  const followerId = uidOrRes

  if (!adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }

  let body: { builderId?: string }
  try {
    body = (await req.json()) as { builderId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const builderId = typeof body.builderId === 'string' ? body.builderId.trim() : ''
  if (!builderId) {
    return NextResponse.json({ error: 'Missing builderId' }, { status: 400 })
  }
  if (followerId === builderId) {
    return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
  }

  try {
    const followId = FS_DOC_IDS.FOLLOW(builderId, followerId)
    const followRef = adminDb.collection(FS.BUILDER_FOLLOWERS).doc(followId)
    const existing = await followRef.get()

    if (existing.exists) {
      await followRef.delete()
      return NextResponse.json({ followed: false })
    }

    await followRef.set({
      follower_id: followerId,
      builder_id: builderId,
      created_at: Date.now(),
    })

    await notifySocial(adminDb, {
      recipientUserId: builderId,
      actorUserId: followerId,
      type: 'follow',
    })

    return NextResponse.json({ followed: true })
  } catch (err) {
    console.error('Follow API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
