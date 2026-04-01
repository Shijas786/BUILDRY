import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

const MAX = 80

export type FollowListUser = {
  id: string
  username: string | null
  display_name: string
  avatar_url: string | null
}

/**
 * Public list of Buildry followers / following for a builder (Firebase uid).
 */
export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ users: [] as FollowListUser[] })
  }
  const db = adminDb

  const builderId = req.nextUrl.searchParams.get('builderId')?.trim()
  const type = req.nextUrl.searchParams.get('type')?.trim() || 'followers'
  if (!builderId) {
    return NextResponse.json({ error: 'Missing builderId' }, { status: 400 })
  }

  try {
    let rawIds: string[] = []
    if (type === 'following') {
      const snap = await db
        .collection(FS.BUILDER_FOLLOWERS)
        .where('follower_id', '==', builderId)
        .limit(MAX)
        .get()
      rawIds = snap.docs.map((d) => d.data()?.builder_id).filter((x): x is string => typeof x === 'string' && x.length > 0)
    } else {
      const snap = await db
        .collection(FS.BUILDER_FOLLOWERS)
        .where('builder_id', '==', builderId)
        .limit(MAX)
        .get()
      rawIds = snap.docs.map((d) => d.data()?.follower_id).filter((x): x is string => typeof x === 'string' && x.length > 0)
    }

    const seen = new Set<string>()
    const userIds = rawIds.filter((id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    const users: FollowListUser[] = await Promise.all(
      userIds.map(async (id) => {
        const [userSnap, profSnap] = await Promise.all([
          db.collection(FS.USERS).doc(id).get(),
          db.collection(FS.BUILDER_PROFILES).doc(id).get(),
        ])
        const u = (userSnap.data() || {}) as Record<string, unknown>
        const prof = (profSnap.data() || {}) as Record<string, unknown>
        const username = typeof prof.username === 'string' && prof.username.trim() ? prof.username.trim() : null
        const display_name =
          (typeof prof.name === 'string' && prof.name.trim()) ||
          (typeof u.name === 'string' && u.name.trim()) ||
          username ||
          'Builder'
        const avatar_url =
          (typeof prof.avatar_url === 'string' && prof.avatar_url) ||
          (typeof u.avatar_url === 'string' && u.avatar_url) ||
          null
        return { id, username, display_name, avatar_url }
      })
    )

    return NextResponse.json({ users })
  } catch (e) {
    console.error('follow/list:', e)
    return NextResponse.json({ error: 'Failed to load list' }, { status: 500 })
  }
}
