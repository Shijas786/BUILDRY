import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { verifyWalletChallengeAndLink } from '@/lib/verifiedWalletServer'

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminAuth || !adminDb) {
    return NextResponse.json({ error: 'Wallet verification is temporarily unavailable.' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    return NextResponse.json({ error: 'Sign in again, then retry wallet verification.' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'Your session is invalid or has expired. Please sign in again.' }, { status: 401 })
  }

  let body: { challengeId?: string; signature?: string }
  try {
    body = (await req.json()) as { challengeId?: string; signature?: string }
  } catch {
    return NextResponse.json({ error: 'The request body was not valid JSON.' }, { status: 400 })
  }

  if (typeof body.challengeId !== 'string' || !body.challengeId.trim()) {
    return NextResponse.json({ error: 'A verification challenge ID is required.' }, { status: 400 })
  }
  if (typeof body.signature !== 'string' || !body.signature.trim()) {
    return NextResponse.json({ error: 'A wallet signature is required.' }, { status: 400 })
  }

  const result = await verifyWalletChallengeAndLink(adminDb, uid, {
    challengeId: body.challengeId.trim(),
    signature: body.signature.trim(),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, verified_wallets: result.verified_wallets })
}
