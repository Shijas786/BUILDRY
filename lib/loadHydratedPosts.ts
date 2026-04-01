import type { DocumentReference, DocumentSnapshot, Firestore } from 'firebase-admin/firestore'
import { enrichLaunchPostsWithResolvedMints } from '@/lib/enrichLaunchPostsTokenMint'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export type PostUserProjection = {
  id: string
  name: string
  avatar_url: string | null
  account_type: string | null
  builder_profiles: { username: string | null }
  /** True if the builder has at least one on-chain token launch post, or `has_launched_token` on profile. */
  is_launch_builder: boolean
}

function buildProjectionFromSnaps(
  userSnap: DocumentSnapshot,
  profileSnap: DocumentSnapshot,
  userId: string
): PostUserProjection | null {
  if (!userSnap.exists) return null
  const userData = userSnap.data() || {}
  const profileData = profileSnap.exists ? profileSnap.data() : {}
  const prof = profileData as { username?: string | null; has_launched_token?: boolean }
  return {
    id: userId,
    name: (userData.name as string) || 'Builder',
    avatar_url: (userData.avatar_url as string | null) ?? null,
    account_type: (userData.account_type as string | null) ?? null,
    builder_profiles: { username: prof?.username ?? null },
    is_launch_builder: prof?.has_launched_token === true,
  }
}

/** Firestore batch get is capped at 10 document refs per request; we fetch user + profile per author (2 refs each). */
const AUTHORS_PER_GETALL_BATCH = 5

/**
 * Deduplicated batched reads for post author hydration (avoids N×2 sequential-style fan-out per post).
 */
export async function loadAuthorProjectionsMap(
  authorIds: string[]
): Promise<Map<string, PostUserProjection | null>> {
  const map = new Map<string, PostUserProjection | null>()
  if (!isFirebaseAdminConfigured || !adminDb) return map

  const unique = Array.from(
    new Set(authorIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  )
  if (unique.length === 0) return map

  const db = adminDb

  for (let i = 0; i < unique.length; i += AUTHORS_PER_GETALL_BATCH) {
    const chunk = unique.slice(i, i + AUTHORS_PER_GETALL_BATCH)
    const refs: DocumentReference[] = []
    for (const id of chunk) {
      refs.push(db.collection(FS.USERS).doc(id))
      refs.push(db.collection(FS.BUILDER_PROFILES).doc(id))
    }
    const snaps = await db.getAll(...refs)
    for (let j = 0; j < chunk.length; j++) {
      const uid = chunk[j]
      const userSnap = snaps[j * 2]
      const profileSnap = snaps[j * 2 + 1]
      map.set(uid, buildProjectionFromSnaps(userSnap, profileSnap, uid))
    }
  }

  await markLaunchAuthorsFromPosts(db, unique, map)

  return map
}

/** Backs `is_launch_builder` for legacy profiles before `has_launched_token` existed. */
async function markLaunchAuthorsFromPosts(
  db: Firestore,
  authorIds: string[],
  projectionMap: Map<string, PostUserProjection | null>
): Promise<void> {
  const needQuery = authorIds.filter((id) => {
    const p = projectionMap.get(id)
    return p != null && !p.is_launch_builder
  })
  const launchers = new Set<string>()
  for (let i = 0; i < needQuery.length; i += 10) {
    const chunk = needQuery.slice(i, i + 10)
    if (chunk.length === 0) continue
    try {
      const snap = await db
        .collection(FS.POSTS)
        .where('author_id', 'in', chunk)
        .where('post_type', '==', 'launch')
        .limit(40)
        .get()
      for (const doc of snap.docs) {
        const aid = doc.data()?.author_id
        if (typeof aid === 'string' && aid) launchers.add(aid)
      }
    } catch (err) {
      console.warn('markLaunchAuthorsFromPosts:', err)
    }
  }
  Array.from(launchers).forEach((id) => {
    const p = projectionMap.get(id)
    if (p) p.is_launch_builder = true
  })
}

export type LoadHydratedPostsParams = {
  page?: number
  limit?: number
  /** When set, only posts from these authors (plus self) are returned (same behavior as API `userId`). */
  followerUserId?: string
}

/**
 * Shared loader for `/api/posts` and server-rendered feed (single source of truth, no self-fetch).
 */
export async function loadHydratedPosts(params: LoadHydratedPostsParams = {}): Promise<any[]> {
  if (!isFirebaseAdminConfigured || !adminDb) return []

  const db = adminDb
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, Math.max(1, params.limit ?? 20))
  const offset = (page - 1) * limit
  const followerUserId = params.followerUserId?.trim() || ''

  try {
    const allNeeded = offset + limit
    const postsSnap = await db.collection(FS.POSTS).orderBy('created_at', 'desc').limit(allNeeded).get()
    let postDocs = postsSnap.docs.slice(offset, offset + limit)

    if (followerUserId) {
      const followingSnap = await db
        .collection(FS.BUILDER_FOLLOWERS)
        .where('follower_id', '==', followerUserId)
        .get()
      const followingSet = new Set(followingSnap.docs.map((d) => d.data().builder_id))
      followingSet.add(followerUserId)
      postDocs = postDocs.filter((d) => followingSet.has(d.data().author_id))
    }

    const authorIds = postDocs
      .map((d) => d.data()?.author_id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    const projectionMap = await loadAuthorProjectionsMap(authorIds)

    const posts = postDocs.map((postDoc) => {
      const post = { id: postDoc.id, ...postDoc.data() } as Record<string, unknown> & { id: string; author_id?: string }
      const aid = typeof post.author_id === 'string' ? post.author_id : ''
      const users = aid ? projectionMap.get(aid) ?? null : null
      return { ...post, users }
    })

    await enrichLaunchPostsWithResolvedMints(posts, db)

    return posts
  } catch (err) {
    console.error('loadHydratedPosts error:', err)
    return []
  }
}
