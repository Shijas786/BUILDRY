import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { createWalletLoginChallenge } from '@/lib/verifiedWalletServer'

/**
 * Start wallet sign-in (no Firebase session required). Wallet must already be verified on a Buildry profile.
 */
export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 })
  }

  let body: { chain?: string; address?: string }
  try {
    body = (await req.json()) as { chain?: string; address?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const chain = body.chain === 'sol' || body.chain === 'evm' ? body.chain : null
  const address = typeof body.address === 'string' ? body.address : ''
  if (!chain || !address.trim()) {
    return NextResponse.json({ error: 'Send chain ("sol" or "evm") and wallet address.' }, { status: 400 })
  }

  const result = await createWalletLoginChallenge(adminDb, chain, address)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    challengeId: result.challengeId,
    message: result.message,
    expiresAt: result.expiresAt,
  })
}
