import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getTokensByCreator } from '@/lib/bags'
import { allVerifiedWalletsFromProfile, primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export type LatestLaunchForUser = {
  mint: string
  name: string
  symbol: string
  created_at: number
}

export type LatestLaunchResolution = {
  launch: LatestLaunchForUser | null
  /** Non-secret reasons `launch` is null — shown in API JSON for debugging prod. */
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
 * Resolve latest launch for a Firebase uid: Firestore posts + Bags creator tokens.
 * `hints` explain a null `launch` (safe to return to the client).
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

  let profileWallet: string | null | undefined
  const walletForUser = async (): Promise<string | null> => {
    if (profileWallet !== undefined) return profileWallet
    const prof = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    profileWallet = primaryWalletsFromProfile((prof.data() || {}) as Record<string, unknown>).sol_wallet
    return profileWallet
  }
  let creatorTokens: Awaited<ReturnType<typeof getTokensByCreator>> | null = null
  /** Fee-share admin tokens for every verified Solana address (launch wallet may not be the primary). */
  const tokensForCreator = async () => {
    if (creatorTokens) return creatorTokens
    const prof = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    const sols = allVerifiedWalletsFromProfile((prof.data() || {}) as Record<string, unknown>).solAddresses
    if (sols.length === 0) {
      creatorTokens = []
      return creatorTokens
    }
    const byMint = new Map<string, Awaited<ReturnType<typeof getTokensByCreator>>[number]>()
    for (const w of sols) {
      const list = await getTokensByCreator(w)
      for (const t of list) {
        const m = t.mint?.trim()
        if (m && !byMint.has(m)) byMint.set(m, t)
      }
    }
    creatorTokens = Array.from(byMint.values())
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

    if (sortedDocs.length === 0) {
      hints.push('no_firestore_posts_for_this_uid')
    }

    let launchLikeNoMint = 0
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
      if (!mint) {
        launchLikeNoMint += 1
        continue
      }
      const content = typeof d.content === 'string' ? d.content : ''
      const name = nameFromLaunchContent(content, symbol)
      const created = createdAtMs(d) || Date.now()
      return { launch: { mint, name, symbol, created_at: created }, hints: [] }
    }

    if (launchLikeNoMint > 0) {
      hints.push('launch_like_posts_found_but_mint_unresolved')
    } else if (sortedDocs.length > 0) {
      hints.push('firestore_posts_found_but_none_match_launch_patterns')
    }

    const list = await tokensForCreator()
    if (list.length === 1) {
      const t = list[0]
      if (t?.mint?.trim()) {
        return {
          launch: {
            mint: t.mint.trim(),
            name: (t.name || t.symbol || 'Token').trim(),
            symbol: (t.symbol || 'TKN').toUpperCase(),
            created_at: Date.now(),
          },
          hints: [],
        }
      }
    }

    const profSnap = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
    const hasLaunchedFlag =
      (profSnap.data() as { has_launched_token?: boolean } | undefined)?.has_launched_token === true
    const sawLaunchLike = sortedDocs.some((doc) => isLaunchLikePost(doc.data()))

    const wallet = await walletForUser()
    if (!wallet) {
      hints.push('add_verified_sol_wallet_in_settings')
    } else if (list.length === 0) {
      hints.push(
        'bags_fee_share_admin_list_empty_check_api_key_and_launch_wallet_matches_verified_sol'
      )
    } else if (list.length > 1) {
      hints.push(`bags_creator_token_count_${list.length}_need_profile_flag_or_feed_post`)
    }

    if (hasLaunchedFlag || sawLaunchLike) {
      const bags = await fromBagsPrimaryToken()
      if (bags) return { launch: bags, hints: [] }
    }

    return { launch: null, hints }
  } catch (e) {
    console.error('resolveLatestLaunchForUser:', e)
    hints.push('firestore_query_error_check_rules_and_indexes')
    try {
      const bags = await fromBagsPrimaryToken()
      if (bags) return { launch: bags, hints: [] }
    } catch {
      hints.push('bags_lookup_failed')
    }
    return { launch: null, hints }
  }
}

/** @deprecated use resolveLatestLaunchForUser — kept for any import sites */
export async function loadLatestLaunchPostForUser(userId: string): Promise<LatestLaunchForUser | null> {
  const { launch } = await resolveLatestLaunchForUser(userId)
  return launch
}
