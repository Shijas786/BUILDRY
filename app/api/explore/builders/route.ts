import { NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { getTokensByCreator } from '@/lib/bags'

export const dynamic = 'force-dynamic'
import { FS } from '@/lib/firestoreCollections'
import { mapFirestoreProfileToExplore, type ExploreBuilderPublic } from '@/lib/exploreBuilders'

const MAX_DOCS = 120
const MAX_RETURN = 56
const PROJECTS_SCAN_CAP = 2500
const BAGS_WALLET_CONCURRENCY = 6

type BagsWalletMeta = { count: number; primaryMint: string | null }

async function bagsMetaForWallets(wallets: string[]): Promise<Map<string, BagsWalletMeta>> {
  const out = new Map<string, BagsWalletMeta>()
  if (!process.env.BAGS_API_KEY || wallets.length === 0) return out
  for (let i = 0; i < wallets.length; i += BAGS_WALLET_CONCURRENCY) {
    const slice = wallets.slice(i, i + BAGS_WALLET_CONCURRENCY)
    const rows = await Promise.all(
      slice.map(async (w) => {
        const tokens = await getTokensByCreator(w)
        const primaryMint = tokens[0]?.mint?.trim() || null
        return [w, { count: tokens.length, primaryMint }] as const
      })
    )
    for (const [w, meta] of rows) out.set(w, meta)
  }
  return out
}

/**
 * Public builder directory for Explore. Uses Admin SDK (no client auth required).
 */
export async function GET() {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ builders: [] }, { status: 200 })
  }

  try {
    const snap = await adminDb.collection(FS.BUILDER_PROFILES).limit(MAX_DOCS).get()
    type Row = { b: ExploreBuilderPublic; updated: number }
    const withMeta: Row[] = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>
        const b = mapFirestoreProfileToExplore(d.id, data)
        if (!b) return null
        const updated = typeof data.updated_at === 'number' ? data.updated_at : 0
        return { b, updated }
      })
      .filter((x): x is Row => x != null)

    withMeta.sort((a, b) => b.updated - a.updated)
    let builders: ExploreBuilderPublic[] = withMeta.slice(0, MAX_RETURN).map((x) => x.b)

    const projectCounts = new Map<string, number>()
    try {
      const projSnap = await adminDb.collection(FS.PROJECTS).limit(PROJECTS_SCAN_CAP).get()
      for (const d of projSnap.docs) {
        const bid = d.data()?.builder_id
        if (typeof bid !== 'string' || !bid.trim()) continue
        const k = bid.trim()
        projectCounts.set(k, (projectCounts.get(k) || 0) + 1)
      }
    } catch (e) {
      console.error('explore/builders project counts:', e)
    }

    builders = builders.map((b) => ({
      ...b,
      projects_count: projectCounts.get(b.id) ?? 0,
    }))

    const uniqueSol = Array.from(
      new Set(
        builders
          .map((b) => b.sol_wallet?.trim())
          .filter((w): w is string => typeof w === 'string' && w.length > 0)
      )
    )
    const bagsMap = await bagsMetaForWallets(uniqueSol)
    builders = builders.map((b) => {
      const w = b.sol_wallet?.trim()
      const meta = w ? bagsMap.get(w) : undefined
      if (!meta) return b
      const next: typeof b = { ...b, bags_tokens_count: meta.count }
      if (meta.count > 0 && meta.primaryMint) next.bags_primary_mint = meta.primaryMint
      return next
    })

    return NextResponse.json(
      { builders },
      {
        headers: {
          'Cache-Control': 's-maxage=120, stale-while-revalidate=300',
        },
      }
    )
  } catch (e) {
    console.error('explore/builders:', e)
    return NextResponse.json({ builders: [] }, { status: 200 })
  }
}
