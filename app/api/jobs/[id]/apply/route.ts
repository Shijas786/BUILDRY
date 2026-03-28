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

  const { builderId, coverLetter, proposedRate } = await req.json()

  if (!builderId) {
    return NextResponse.json({ error: 'Missing builderId' }, { status: 400 })
  }

  try {
    const now = Date.now()
    const ref = await db.collection(FS.JOB_APPLICATIONS).add({
      job_id: params.id,
      builder_id: builderId,
      cover_letter: coverLetter || null,
      proposed_rate: proposedRate ?? null,
      status: 'pending',
      created_at: now,
    })
    const snap = await ref.get()
    return NextResponse.json({ id: ref.id, ...snap.data() }, { status: 201 })
  } catch (err) {
    console.error('Job apply error:', err)
    return NextResponse.json({ error: 'Could not submit application' }, { status: 500 })
  }
}
