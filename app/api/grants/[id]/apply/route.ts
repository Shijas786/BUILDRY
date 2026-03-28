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

  const { applicantId, pitch } = await req.json()

  if (!applicantId) {
    return NextResponse.json({ error: 'Missing applicantId' }, { status: 400 })
  }

  const grantRef = db.collection(FS.GRANTS).doc(params.id)

  try {
    const appRef = db.collection(FS.GRANT_APPLICATIONS).doc()
    await db.runTransaction(async (tx) => {
      const gSnap = await tx.get(grantRef)
      if (!gSnap.exists) {
        throw new Error('NOT_FOUND')
      }
      const count = ((gSnap.data()?.applicants_count as number) || 0) + 1
      tx.set(appRef, {
        grant_id: params.id,
        applicant_id: applicantId,
        pitch: pitch || null,
        status: 'submitted',
        created_at: Date.now(),
      })
      tx.update(grantRef, { applicants_count: count })
    })

    const snap = await appRef.get()
    return NextResponse.json({ id: appRef.id, ...snap.data() }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }
    console.error('Grant apply error:', err)
    return NextResponse.json({ error: 'Could not submit application' }, { status: 500 })
  }
}
