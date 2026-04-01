import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export type RecentLaunchMint = {
  mint: string
  symbol: string
  created_at: number
}

/**
 * Recent token mints from launch posts (Buildry), newest first, deduped by mint.
 * Scans latest posts by `created_at` so we reuse the existing feed ordering index.
 */
export async function loadRecentBuildryLaunchMints(max = 24): Promise<RecentLaunchMint[]> {
  if (!isFirebaseAdminConfigured || !adminDb) return []

  try {
    const snap = await adminDb
      .collection(FS.POSTS)
      .orderBy('created_at', 'desc')
      .limit(150)
      .get()

    const out: RecentLaunchMint[] = []
    const seen = new Set<string>()

    for (const doc of snap.docs) {
      const d = doc.data() as Record<string, unknown>
      if (d.post_type !== 'launch') continue
      const mint = typeof d.token_mint === 'string' ? d.token_mint.trim() : ''
      if (!mint) continue
      if (seen.has(mint)) continue
      seen.add(mint)

      let sym = typeof d.launch_symbol === 'string' ? d.launch_symbol.trim().toUpperCase().replace(/^\$/, '') : ''
      if (!sym && typeof d.milestone_title === 'string') {
        const m = d.milestone_title.match(/Launched\s+\$([A-Za-z0-9]+)/i)
        if (m) sym = m[1].toUpperCase()
      }
      if (!sym) sym = 'TOKEN'

      const created = typeof d.created_at === 'number' && Number.isFinite(d.created_at) ? d.created_at : 0
      out.push({ mint, symbol: sym, created_at: created })
      if (out.length >= max) break
    }

    return out
  } catch (e) {
    console.error('loadRecentBuildryLaunchMints:', e)
    return []
  }
}
