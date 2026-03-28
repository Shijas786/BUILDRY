import { NextResponse } from 'next/server'

/**
 * Legacy callback path from an older Supabase OAuth linking flow.
 * Social linking now uses Firebase (Settings → Socials: GitHub / LinkedIn via Firebase Auth).
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin
  return NextResponse.redirect(`${origin}/settings?social=use_firebase`)
}
