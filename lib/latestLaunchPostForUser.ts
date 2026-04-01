import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getTokensByCreator } from '@/lib/bags'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export type LatestLaunchForUser = {
  mint: string
  name: string
  symbol: string
  created_at: number
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
 * Most recent Firestore launch post for this user (any device / domain).
 * Uses only `author_id` equality (auto index) and sorts in memory — avoids composite index gaps on prod.
 */
export async function loadLatestLaunchPostForUser(userId: string): Promise<LatestLaunchForUser | null> {
  if (!isFirebaseAdminConfigured || !adminDb || !userId.trim()) return null
  const db = adminDb
  const uid = userId.trim()

  let profileWallet: string | null | undefined
  const walletForUser = async (): Promise<string | null> => {
    if (profileWallet !== undefined) return profileWallet
    const prof = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    profileWallet = primaryWalletsFromProfile((prof.data() || {}) as Record<string, unknown>).sol_wallet
    return profileWallet
  }
  let creatorTokens: Awaited<ReturnType<typeof getTokensByCreator>> | null = null
  const tokensForCreator = async () => {
    if (creatorTokens) return creatorTokens
    const w = await walletForUser()
    if (!w) {
      creatorTokens = []
      return creatorTokens
    }
    creatorTokens = await getTokensByCreator(w)
    return creatorTokens
  }

  const fromBagsPrimaryToken = async (): Promise<LatestLaunchForUser | null> => {
    const list = await tokensForCreator()
    if (list.length === 0) return null
    const sorted = [...list].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    const t = sorted[0]
    if (!t?.mint?.trim()) return null
    return {
      mint: t.mint.trim(),
      name: (t.name || t.symbol || 'Token').trim(),
      symbol: (t.symbol || 'TKN').toUpperCase(),
      created_at: Date.now(),
    }
  }

  try {
    const snap = await db.collection(FS.POSTS).where('author_id', '==', uid).limit(120).get()

    const sortedDocs = sortDocsByCreatedDesc(snap.docs)

    for (const doc of sortedDocs) {
      const d = doc.data()
      if (!isLaunchLikePost(d)) continue
      const symbol = symbolFromPostData(d)
      let mint = mintFromPostData(d)
      if (!mint) {
        const list = await tokensForCreator()
        const hit = list.find((t) => (t.symbol || '').toUpperCase() === symbol)
        mint = hit?.mint?.trim() || null
      }
      if (!mint) continue
      const content = typeof d.content === 'string' ? d.content : ''
      const name = nameFromLaunchContent(content, symbol)
      const created = createdAtMs(d) || Date.now()
      return { mint, name, symbol, created_at: created }
    }

    const profSnap = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    const hasLaunchedFlag =
      (profSnap.data() as { has_launched_token?: boolean } | undefined)?.has_launched_token === true
    const sawLaunchLike = sortedDocs.some((doc) => isLaunchLikePost(doc.data()))

    if (hasLaunchedFlag || sawLaunchLike) {
      return (await fromBagsPrimaryToken()) ?? null
    }
    return null
  } catch (e) {
    console.error('loadLatestLaunchPostForUser:', e)
    try {
      return await fromBagsPrimaryToken()
    } catch {
      return null
    }
  }
}
