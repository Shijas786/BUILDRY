import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { removeVerifiedWallet } from '@/lib/verifiedWalletServer'

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminAuth || !adminDb) {
    return NextResponse.json({ error: 'Wallet tools are temporarily unavailable.' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    return NextResponse.json({ error: 'Sign in again, then retry.' }, { status: 401 })
  }

  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(match[1])).uid
  } catch {
    return NextResponse.json({ error: 'Your session is invalid or has expired.' }, { status: 401 })
  }

  let body: { chain?: string; address?: string }
  try {
    body = (await req.json()) as { chain?: string; address?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const chain = body.chain === 'sol' || body.chain === 'evm' ? body.chain : null
  const address = typeof body.address === 'string' ? body.address : ''
  if (!chain || !address.trim()) {
    return NextResponse.json({ error: 'Send chain ("sol" or "evm") and address.' }, { status: 400 })
  }

  const result = await removeVerifiedWallet(adminDb, uid, chain, address)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, verified_wallets: result.verified_wallets })
}
