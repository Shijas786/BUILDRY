import type { Firestore } from 'firebase-admin/firestore'
import { getTokensByCreator } from '@/lib/bags'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { FS } from '@/lib/firestoreCollections'

function textHasTokenPath(v: unknown): boolean {
  return typeof v === 'string' && v.includes('/token/')
}

function launchSymbolFromPostData(post: Record<string, unknown>): string | null {
  const raw = post.launch_symbol
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/^\$/, '').toUpperCase()
  }
  const mt = post.milestone_title
  if (typeof mt === 'string') {
    const m = mt.match(/Launched\s+\$([A-Za-z0-9]+)/i)
    if (m) return m[1].toUpperCase()
  }
  return null
}

/**
 * Legacy launch posts often have no `token_mint` / URL in the body (auto milestone only).
 * Resolve mint from the author's verified Solana wallet + Bags creator tokens matching `Launched $SYMBOL`.
 */
export async function enrichLaunchPostsWithResolvedMints(
  posts: Array<Record<string, unknown> & { id?: string }>,
  db: Firestore
): Promise<void> {
  const candidates = posts.filter((p) => {
    const tm = typeof p.token_mint === 'string' ? p.token_mint.trim() : ''
    if (tm) return false
    if (textHasTokenPath(p.link_url) || textHasTokenPath(p.content)) return false
    if (p.post_type !== 'launch' && p.milestone_category !== 'launch') return false
    return launchSymbolFromPostData(p) != null
  })

  if (candidates.length === 0) return

  const authorIds = Array.from(
    new Set(
      candidates
        .map((p) => p.author_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const walletByAuthor = new Map<string, string | null>()
  await Promise.all(
    authorIds.map(async (uid) => {
      const snap = await db.collection(FS.BUILDER_PROFILES).doc(uid).get()
      const sol = primaryWalletsFromProfile((snap.data() || {}) as Record<string, unknown>).sol_wallet
      walletByAuthor.set(uid, sol)
    })
  )

  const tokensByWallet = new Map<string, Awaited<ReturnType<typeof getTokensByCreator>>>()

  for (const post of candidates) {
    const aid = post.author_id as string
    const wallet = walletByAuthor.get(aid)
    if (!wallet) continue

    const symbol = launchSymbolFromPostData(post)
    if (!symbol) continue

    let list = tokensByWallet.get(wallet)
    if (!list) {
      list = await getTokensByCreator(wallet)
      tokensByWallet.set(wallet, list)
    }

    const hit = list.find((t) => (t.symbol || '').toUpperCase() === symbol)
    if (hit?.mint) {
      post.token_mint = hit.mint
      if (!post.launch_symbol) post.launch_symbol = symbol
    }
  }
}
