import { NextRequest, NextResponse } from 'next/server'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured || !adminDb) {
    return NextResponse.json({ error: 'Firebase is not configured' }, { status: 500 })
  }
  const db = adminDb

  try {
    const { followerId, builderId } = await req.json()

    if (!followerId || !builderId) {
      return NextResponse.json({ error: 'Missing followerId or builderId' }, { status: 400 })
    }

    const followId = `${builderId}_${followerId}`
    const followRef = db.collection('builder_followers').doc(followId)
    const existing = await followRef.get()

    if (existing.exists) {
      await followRef.delete()
      return NextResponse.json({ followed: false })
    }

    await followRef.set({
      follower_id: followerId,
      builder_id: builderId,
      created_at: Date.now(),
    })

    return NextResponse.json({ followed: true })
  } catch (err) {
    console.error('Follow API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
