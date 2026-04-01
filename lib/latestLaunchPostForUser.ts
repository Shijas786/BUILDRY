import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { launchFromProfileData } from '@/lib/profileLaunchLink'
import { readUserTokenLaunch } from '@/lib/userTokenLaunchRecord'

export type LatestLaunchForUser = {
  mint: string
  name: string
  symbol: string
  created_at: number
}

export type LatestLaunchResolution = {
  launch: LatestLaunchForUser | null
  /** Non-secret reasons `launch` is null — safe for API JSON. */
  hints: readonly string[]
}

function mintFromPostData(d: DocumentData): string | null {
  const tm = typeof d.token_mint === 'string' ? d.token_mint.trim() : ''
  if (tm) return tm
  const link = typeof d.link_url === 'string' ? d.link_url : ''
  const content = typeof d.content === 'string' ? d.content : ''
  for (const blob of [link, content]) {
    if (!blob.includes('/token/')) continue
    const m = blob.match(/\/token\/([^/?#\s<>"')]+)/)
    if (m) {
      try {
        const dec = decodeURIComponent(m[1]).trim()
        if (dec) return dec
      } catch {
        const raw = m[1].trim()
        if (raw) return raw
      }
    }
  }
  return null
}

function symbolFromPostData(d: DocumentData): string {
  const raw = d.launch_symbol
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/^\$/, '').toUpperCase()
  }
  const mt = d.milestone_title
  if (typeof mt === 'string') {
    const m = mt.match(/Launched\s+\$([A-Za-z0-9]+)/i)
    if (m) return m[1].toUpperCase()
  }
  const body = typeof d.content === 'string' ? d.content : ''
  const cm = body.match(/\$([A-Za-z][A-Za-z0-9]{0,31})\b/)
  if (cm) return cm[1].toUpperCase()
  return 'TOKEN'
}

function nameFromLaunchContent(content: string, symbol: string): string {
  const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = content.match(new RegExp(`Just\\s+launched\\s+\\$${esc}\\s*—\\s*([^!]+?)(?:\\s*!|$)`, 'i'))
  if (m?.[1]) return m[1].trim()
  return symbol
}

function createdAtMs(d: DocumentData): number {
  const c = d.created_at
  if (typeof c === 'number' && Number.isFinite(c)) return c
  if (c && typeof c === 'object' && 'toMillis' in c && typeof (c as { toMillis: () => number }).toMillis === 'function') {
    try {
      return (c as { toMillis: () => number }).toMillis()
    } catch {
      return 0
    }
  }
  return 0
}

function isLaunchLikePost(d: DocumentData): boolean {
  if (d.post_type === 'launch' || d.milestone_category === 'launch') return true
  const mt = d.milestone_title
  if (typeof mt === 'string' && /launched\s+\$/i.test(mt)) return true
  const body = d.content
  if (typeof body === 'string' && /\bjust\s+launched\s+\$/i.test(body)) return true
  return false
}

function sortDocsByCreatedDesc(docs: QueryDocumentSnapshot[]): QueryDocumentSnapshot[] {
  return docs.slice().sort((a, b) => createdAtMs(b.data()) - createdAtMs(a.data()))
}

/**
 * Latest launch for a uid:
 * 1) `user_token_launches/{uid}` (written on every successful in-app launch)
 * 2) `builder_profiles` last_launch_* / bags_primary_mint
 * 3) Newest launch-like post with a mint (legacy)
 */
export async function resolveLatestLaunchForUser(userId: string): Promise<LatestLaunchResolution> {
  const hints: string[] = []

  if (!isFirebaseAdminConfigured || !adminDb || !userId.trim()) {
    if (!userId.trim()) hints.push('empty_uid')
    else hints.push('firebase_admin_unconfigured')
    return { launch: null, hints }
  }

  const db = adminDb
  const uid = userId.trim()

  try {
    const fromRegistry = await readUserTokenLaunch(db, uid)
    if (fromRegistry) {
      return { launch: fromRegistry, hints: [] }
    }

    const profSnap = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    const fromProf = launchFromProfileData((profSnap.data() || {}) as Record<string, unknown>)
    if (fromProf) {
      return { launch: fromProf, hints: [] }
    }

    const snap = await db.collection(FS.POSTS).where('author_id', '==', uid).limit(120).get()
    const sortedDocs = sortDocsByCreatedDesc(snap.docs)

    if (sortedDocs.length === 0) {
      hints.push('no_firestore_posts_for_this_uid')
    }

    for (const doc of sortedDocs) {
      const d = doc.data()
      if (!isLaunchLikePost(d)) continue
      const symbol = symbolFromPostData(d)
      const mint = mintFromPostData(d)
      if (!mint) continue
      const content = typeof d.content === 'string' ? d.content : ''
      const name = nameFromLaunchContent(content, symbol)
      const created = createdAtMs(d) || Date.now()
      return { launch: { mint, name, symbol, created_at: created }, hints: [] }
    }

    hints.push('no_user_token_launch_doc_profile_or_post_with_mint')
    return { launch: null, hints }
  } catch (e) {
    console.error('resolveLatestLaunchForUser:', e)
    return { launch: null, hints: ['firestore_query_error_check_rules_and_indexes'] }
  }
}

/** @deprecated use resolveLatestLaunchForUser */
export async function loadLatestLaunchPostForUser(userId: string): Promise<LatestLaunchForUser | null> {
  const { launch } = await resolveLatestLaunchForUser(userId)
  return launch
}
