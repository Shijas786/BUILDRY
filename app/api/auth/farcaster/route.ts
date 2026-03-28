import { NextRequest, NextResponse } from 'next/server'
import { isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { mergeBuilderProfileFields } from '@/lib/firestoreAdminHelpers'

export async function POST(req: NextRequest) {
  try {
    const { userId, profile } = await req.json()
    if (!userId || !profile || !isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Missing required fields or Firebase Admin not configured' }, { status: 400 })
    }

    const handle = profile.username || (profile.fid ? `fid:${profile.fid}` : null)
    if (!handle) return NextResponse.json({ error: 'Missing Farcaster identity' }, { status: 400 })

    await mergeBuilderProfileFields(userId, {
      farcaster_handle: handle,
      ...(profile.pfpUrl ? { avatar_url: profile.pfpUrl } : {}),
    })

    return NextResponse.json({ success: true, handle })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Farcaster auth failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
