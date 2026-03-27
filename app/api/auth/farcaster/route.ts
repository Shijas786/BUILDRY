import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId, profile } = await req.json()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (!userId || !profile || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const handle = profile.username || (profile.fid ? `fid:${profile.fid}` : null)
    if (!handle) return NextResponse.json({ error: 'Missing Farcaster identity' }, { status: 400 })

    const supabase = createClient(supabaseUrl, supabaseKey)
    await supabase
      .from('builder_profiles')
      .upsert(
        {
          user_id: userId,
          farcaster_handle: handle,
          avatar_url: profile.pfpUrl || undefined,
        },
        { onConflict: 'user_id' }
      )

    return NextResponse.json({ success: true, handle })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Farcaster auth failed' }, { status: 500 })
  }
}

