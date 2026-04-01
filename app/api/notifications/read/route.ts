import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { uidFromBearer } from '@/lib/notificationsApiAuth'

export async function POST(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof NextResponse) return uidOrRes
  const uid = uidOrRes

  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ ok: true })
  }
  const db = adminDb

  let body: { notificationId?: string; all?: boolean }
  try {
    body = (await req.json()) as { notificationId?: string; all?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (body.all) {
      const snap = await db
        .collection(FS.NOTIFICATIONS)
        .where('user_id', '==', uid)
        .orderBy('created_at', 'desc')
        .limit(200)
        .get()
      const batch = db.batch()
      let updates = 0
      for (const d of snap.docs) {
        if ((d.data() as { read?: boolean }).read === true) continue
        batch.update(d.ref, { read: true })
        updates++
      }
      if (updates > 0) await batch.commit()
      return NextResponse.json({ ok: true })
    }

    const nid = typeof body.notificationId === 'string' ? body.notificationId.trim() : ''
    if (!nid) {
      return NextResponse.json({ error: 'notificationId or all required' }, { status: 400 })
    }

    const ref = db.collection(FS.NOTIFICATIONS).doc(nid)
    const doc = await ref.get()
    if (!doc.exists || (doc.data() as { user_id?: string })?.user_id !== uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await ref.update({ read: true })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('notifications/read:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
