import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { fetchUserMini } from '@/lib/firestoreAdminHelpers'

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 503 })
  }
  const db = adminDb

  const category = req.nextUrl.searchParams.get('category')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)

  try {
    let q = db.collection(FS.JOBS).where('status', '==', status).orderBy('created_at', 'desc').limit(Math.min(100, limit * 3))
    if (category) {
      q = db.collection(FS.JOBS).where('status', '==', status).where('category', '==', category).orderBy('created_at', 'desc').limit(limit)
    }
    const snap = await q.get()
    let rows = await Promise.all(
      snap.docs.map(async (docSnap) => {
        const d = docSnap.data() as Record<string, unknown>
        const clientId = d.client_id as string
        const users = clientId ? await fetchUserMini(db, clientId) : null
        return {
          id: docSnap.id,
          ...d,
          users: users ? { name: users.name, avatar_url: users.avatar_url } : null,
        }
      })
    )
    if (!category) {
      rows = rows.slice(0, limit)
    }
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
    })
  } catch (err) {
    console.error('Jobs GET error:', err)
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
    const { clientId, title, description, category, skillsRequired, budgetUsd, budgetType, deadline, paymentCurrency } = body

    if (!clientId || !title || !description || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = Date.now()
    const row = {
      client_id: clientId,
      title,
      description,
      category,
      skills_required: skillsRequired || [],
      budget_usd: budgetUsd ?? null,
      budget_type: budgetType || 'fixed',
      deadline: deadline ?? null,
      payment_currency: paymentCurrency || 'USDC',
      status: 'open',
      assigned_builder_id: null,
      created_at: now,
      updated_at: now,
    }

    const ref = await db.collection(FS.JOBS).add(row)
    const created = await ref.get()
    const users = await fetchUserMini(db, clientId)
    return NextResponse.json(
      {
        id: ref.id,
        ...created.data(),
        users: users ? { name: users.name, avatar_url: users.avatar_url } : null,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Jobs API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
