import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'

export async function uidFromBearer(req: NextRequest): Promise<string | NextResponse> {
  if (!isFirebaseAdminConfigured || !adminAuth) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    return decoded.uid
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }
}
