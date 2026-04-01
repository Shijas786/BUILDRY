import type { DocumentData } from 'firebase-admin/firestore'
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
  return 'TOKEN'
}

function nameFromLaunchContent(content: string, symbol: string): string {
  const esc = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = content.match(new RegExp(`Just\\s+launched\\s+\\$${esc}\\s*—\\s*([^!]+?)(?:\\s*!|$)`, 'i'))
  if (m?.[1]) return m[1].trim()
  return symbol
}

/**
 * Most recent Firestore launch post for this user (any device / domain).
 * Uses existing index: posts author_id + created_at desc.
 */
export async function loadLatestLaunchPostForUser(userId: string): Promise<LatestLaunchForUser | null> {
  if (!isFirebaseAdminConfigured || !adminDb || !userId.trim()) return null
  const db = adminDb

  try {
    const snap = await db
      .collection(FS.POSTS)
      .where('author_id', '==', userId.trim())
      .orderBy('created_at', 'desc')
      .limit(40)
      .get()

    let profileWallet: string | null | undefined
    const walletForUser = async (): Promise<string | null> => {
      if (profileWallet !== undefined) return profileWallet
      const prof = await db.collection(FS.BUILDER_PROFILES).doc(userId.trim()).get()
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

    for (const doc of snap.docs) {
      const d = doc.data()
      if (d.post_type !== 'launch' && d.milestone_category !== 'launch') continue
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
      const created =
        typeof d.created_at === 'number' && Number.isFinite(d.created_at) ? d.created_at : Date.now()
      return { mint, name, symbol, created_at: created }
    }
    return null
  } catch (e) {
    console.error('loadLatestLaunchPostForUser:', e)
    return null
  }
}
