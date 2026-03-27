import { NextRequest, NextResponse } from 'next/server'
import { getTopProfiles } from '@/lib/talent'

export async function GET() {
  try {
    const builders = await getTopProfiles(48) // Fetch 48 for a richer orbit筒

    return NextResponse.json(builders, {
      headers: { 
        'Cache-Control': 's-maxage=600, stale-while-revalidate=120' 
      },
    })
  } catch (err) {
    console.error('Top builders API error:', err)
    return NextResponse.json([], { status: 500 })
  }
}
