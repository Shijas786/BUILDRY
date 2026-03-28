import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import { fetchProjectMini, fetchUserMini } from '@/lib/firestoreAdminHelpers'

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json([], { status: 503 })
  }
  const db = adminDb

  const dealType = req.nextUrl.searchParams.get('type')
  const status = req.nextUrl.searchParams.get('status') || 'open'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20', 10)

  try {
    const snap = await db
      .collection(FS.DEALS)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .limit(60)
      .get()

    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]
    if (dealType) rows = rows.filter((x) => x.deal_type === dealType)
    rows = rows.slice(0, limit)

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const creatorId = row.creator_id as string
        const projectId = row.project_id as string | null | undefined
        const [users, projects] = await Promise.all([
          creatorId ? fetchUserMini(db, creatorId) : null,
          projectId ? fetchProjectMini(db, projectId) : null,
        ])
        return {
          ...row,
          users: users
            ? { id: users.id, name: users.name, avatar_url: users.avatar_url, account_type: users.account_type }
            : null,
          projects: projects || null,
        }
      })
    )

    return NextResponse.json(hydrated, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=15' },
    })
  } catch (err) {
    console.error('Deals GET error:', err)
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
      creatorId,
      title,
      description,
      dealType,
      projectId,
      amountTargetUsd,
      minInvestmentUsd,
      valuationUsd,
      equityPct,
      tokenMint,
      tokenPriceUsd,
      deadline,
      tags,
    } = body

    if (!creatorId || !title || !description || !dealType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = Date.now()
    const row = {
      creator_id: creatorId,
      title,
      description,
      deal_type: dealType,
      project_id: projectId || null,
      amount_target_usd: amountTargetUsd ?? null,
      amount_raised_usd: 0,
      min_investment_usd: minInvestmentUsd ?? null,
      valuation_usd: valuationUsd ?? null,
      equity_pct: equityPct ?? null,
      token_mint: tokenMint ?? null,
      token_price_usd: tokenPriceUsd ?? null,
      status: 'open',
      deadline: deadline ?? null,
      tags: tags || [],
      images: [],
      backers_count: 0,
      created_at: now,
      updated_at: now,
    }

    const ref = await db.collection(FS.DEALS).add(row)
    const snap = await ref.get()
    const d = snap.data()!
    const users = await fetchUserMini(db, creatorId)
    const projects = d.project_id ? await fetchProjectMini(db, d.project_id as string) : null

    return NextResponse.json(
      {
        id: ref.id,
        ...d,
        users: users
          ? { id: users.id, name: users.name, avatar_url: users.avatar_url, account_type: users.account_type }
          : null,
        projects,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Deals API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
