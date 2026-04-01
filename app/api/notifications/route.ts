import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { uidFromBearer } from '@/lib/notificationsApiAuth'

const LIMIT = 50

async function actorSummaries(
  db: NonNullable<typeof adminDb>,
  ids: string[]
): Promise<Map<string, { name: string; username: string | null; avatar_url: string | null }>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  const map = new Map<string, { name: string; username: string | null; avatar_url: string | null }>()
  await Promise.all(
    unique.map(async (id) => {
      const [userSnap, profSnap] = await Promise.all([
        db.collection(FS.USERS).doc(id).get(),
        db.collection(FS.BUILDER_PROFILES).doc(id).get(),
      ])
      const u = (userSnap.data() || {}) as Record<string, unknown>
      const p = (profSnap.data() || {}) as Record<string, unknown>
      const username = typeof p.username === 'string' && p.username.trim() ? p.username.trim() : null
      const name =
        (typeof p.name === 'string' && p.name.trim()) ||
        (typeof u.name === 'string' && u.name.trim()) ||
        username ||
        'Builder'
      const avatar_url =
        (typeof p.avatar_url === 'string' && p.avatar_url) ||
        (typeof u.avatar_url === 'string' && u.avatar_url) ||
        null
      map.set(id, { name, username, avatar_url })
    })
  )
  return map
}

export async function GET(req: NextRequest) {
  const uidOrRes = await uidFromBearer(req)
  if (uidOrRes instanceof NextResponse) return uidOrRes
  const uid = uidOrRes

  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
  const db = adminDb

  try {
    const snap = await db
      .collection(FS.NOTIFICATIONS)
      .where('user_id', '==', uid)
      .orderBy('created_at', 'desc')
      .limit(LIMIT)
      .get()

    type NotifDoc = Record<string, unknown> & { id: string }
    const rows: NotifDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }))
    const actorIds = rows.map((r) => r.actor_id).filter((x): x is string => typeof x === 'string')
    const actors = await actorSummaries(db, actorIds)

    const notifications = rows.map((r) => {
      const aid = typeof r.actor_id === 'string' ? r.actor_id : ''
      const a = actors.get(aid)
      return {
        id: r.id,
        type: r.type,
        read: r.read === true,
        created_at: r.created_at,
        post_id: r.post_id ?? null,
        comment_id: r.comment_id ?? null,
        comment_preview: r.comment_preview ?? null,
        actor_id: aid,
        actor: a || { name: 'Someone', username: null, avatar_url: null },
      }
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json(
      { notifications, unreadCount },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (e) {
    console.error('notifications GET:', e)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }
}
