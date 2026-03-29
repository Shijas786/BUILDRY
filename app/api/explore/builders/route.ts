import { NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'
import { FS } from '@/lib/firestoreCollections'
import { mapFirestoreProfileToExplore, type ExploreBuilderPublic } from '@/lib/exploreBuilders'

const MAX_DOCS = 120
const MAX_RETURN = 56

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
    const builders = withMeta.slice(0, MAX_RETURN).map((x) => x.b)

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
