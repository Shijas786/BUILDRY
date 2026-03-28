import { NextResponse } from 'next/server'
import { loadBuilderProfilePayload } from '@/lib/builderProfilePayload'
import { buildNarrativeInputFromPayload, generateBuilderNarrative } from '@/lib/builderNarrative'

const TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { at: number; text: string }>()

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const username = params.username
  if (!username) {
    return NextResponse.json({ narrative: null, error: 'missing_username' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json({
      narrative: null,
      available: false,
      reason: 'ANTHROPIC_API_KEY is not configured',
    })
  }

  const payload = await loadBuilderProfilePayload(username)
  if (!payload.profile) {
    return NextResponse.json({ narrative: null, error: 'not_found' }, { status: 404 })
  }

  const hit = cache.get(username)
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({
      narrative: hit.text,
      cached: true,
    })
  }

  const input = buildNarrativeInputFromPayload(username, {
    profile: payload.profile,
    talent: payload.talent,
    github: payload.github,
    socialShowcase: payload.socialShowcase,
    contributions: payload.contributions,
  })

  const narrative = await generateBuilderNarrative(input)
  if (narrative) {
    cache.set(username, { at: Date.now(), text: narrative })
  }

  return NextResponse.json({
    narrative,
    cached: false,
    available: !!narrative,
  })
}
