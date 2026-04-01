import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { verifyWalletLoginChallenge } from '@/lib/verifiedWalletServer'

/**
 * Complete wallet sign-in: verify signature, return Firebase custom token for the linked account.
 */
export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminAuth || !adminDb) {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 })
  }

  let body: { challengeId?: string; signature?: string; solSignatureBase64?: string }
  try {
    body = (await req.json()) as { challengeId?: string; signature?: string; solSignatureBase64?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : ''
  if (!challengeId) {
    return NextResponse.json({ error: 'challengeId is required.' }, { status: 400 })
  }

  const signature = typeof body.signature === 'string' ? body.signature : ''
  const solSignatureBase64 =
    typeof body.solSignatureBase64 === 'string' ? body.solSignatureBase64 : undefined

  const result = await verifyWalletLoginChallenge(adminDb, {
    challengeId,
    signature,
    solSignatureBase64,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  try {
    const customToken = await adminAuth.createCustomToken(result.uid)
    return NextResponse.json({ customToken })
  } catch (e) {
    console.error('login-verify custom token:', e)
    return NextResponse.json({ error: 'Could not complete sign-in. Try again.' }, { status: 500 })
  }
}
