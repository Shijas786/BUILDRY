import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }
  const db = adminDb

  const { investorId, amountUsd, txHash } = await req.json()

  if (!investorId || amountUsd === undefined || amountUsd === null) {
    return NextResponse.json({ error: 'Missing investorId or amountUsd' }, { status: 400 })
  }

  const dealRef = db.collection(FS.DEALS).doc(params.id)
  const invRef = db.collection(FS.DEAL_INVESTMENTS).doc()

  try {
    await db.runTransaction(async (tx) => {
      const dealSnap = await tx.get(dealRef)
      if (!dealSnap.exists) {
        throw new Error('NOT_FOUND')
      }
      const backers = ((dealSnap.data()?.backers_count as number) || 0) + 1
      const now = Date.now()
      tx.set(invRef, {
        deal_id: params.id,
        investor_id: investorId,
        amount_usd: amountUsd,
        tx_hash: txHash || null,
        status: 'pending',
        created_at: now,
      })
      tx.update(dealRef, { backers_count: backers, updated_at: now })
    })

    const snap = await invRef.get()
    return NextResponse.json({ id: invRef.id, ...snap.data() }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    console.error('Deal invest error:', err)
    return NextResponse.json({ error: 'Could not record investment' }, { status: 500 })
  }
}
