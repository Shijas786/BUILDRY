import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 503 })
  }
  const db = adminDb

  const grantType = req.nextUrl.searchParams.get('type')
  const ecosystem = req.nextUrl.searchParams.get('ecosystem')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)

  try {
    const snap = await db
      .collection(FS.GRANTS)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .limit(80)
      .get()

    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
    if (grantType) rows = rows.filter((g) => g.grant_type === grantType)
    if (ecosystem) rows = rows.filter((g) => g.ecosystem === ecosystem)
    rows = rows.slice(0, limit)

    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    })
  } catch (err) {
    console.error('Grants GET error:', err)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }
  const db = adminDb

  try {
    const body = await req.json()
    const {
      postedBy,
      title,
      description,
      organization,
      grantType,
      amountUsd,
      currency,
      applicationUrl,
      deadline,
      tags,
      ecosystem,
    } = body

    if (!postedBy || !title || !description || !organization || !grantType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = Date.now()
    const row = {
      posted_by: postedBy,
      title,
      description,
      organization,
      grant_type: grantType,
      amount_usd: amountUsd ?? null,
      currency: currency || 'USD',
      application_url: applicationUrl ?? null,
      deadline: deadline ?? null,
      tags: tags || [],
      ecosystem: ecosystem ?? null,
      status: 'open',
      applicants_count: 0,
      created_at: now,
    }

    const ref = await db.collection(FS.GRANTS).add(row)
    const snap = await ref.get()
    return NextResponse.json({ id: ref.id, ...snap.data() }, { status: 201 })
  } catch (err) {
    console.error('Grants API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
