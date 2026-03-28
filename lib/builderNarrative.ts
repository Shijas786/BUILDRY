import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

export type BuilderNarrativeInput = {
  handle: string
  displayName: string | null
  tagline: string | null
  bio: string | null
  skills: string[]
  accountType: string | null
  linkedin: {
    name: string | null
    headline: string | null
    /** Sanitized string fields from OIDC (no email). */
    hints?: Record<string, string> | null
  } | null
  github: {
    username: string | null
    bio: string | null
    publicRepos: number
    totalStars: number
    topLanguages: string[]
  } | null
  farcaster: {
    username: string | null
    displayName: string | null
    bio: string | null
    followers: number
  } | null
  contributions: BuilderContributionsSnapshot
  talentScore: number | null
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'

function linkedinHintsFromData(data: unknown): Record<string, string> | null {
  if (!data || typeof data !== 'object') return null
  const out: Record<string, string> = {}
  const skip = new Set(['email', 'email_verified', 'sub', 'nonce'])
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (skip.has(k)) continue
    if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim().slice(0, 200)
    }
    if (Object.keys(out).length >= 16) break
  }
  return Object.keys(out).length ? out : null
}

export async function generateBuilderNarrative(input: BuilderNarrativeInput): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null

  const facts = JSON.stringify(
    {
      builder_handle: input.handle,
      name: input.displayName,
      tagline: input.tagline,
      self_bio: input.bio,
      skills: input.skills,
      role: input.accountType,
      linkedin: input.linkedin,
      github: input.github,
      farcaster: input.farcaster,
      contributions: input.contributions,
      talent_builder_score: input.talentScore,
    },
    null,
    2
  )

  const prompt = `You are writing a concise, factual public builder profile for a tech / startup platform.
Use ONLY the JSON facts below. Do not invent employers, degrees, funding, or projects not implied by the data.
If something is unknown, omit it rather than guessing.

Tone: professional, third person ("they"), confident but grounded. Two short paragraphs (max 120 words total).
Paragraph 1: Who they are professionally (use LinkedIn headline/name and role when present; GitHub/Farcaster bios if useful).
Paragraph 2: What the on-chain and open-source signals suggest they ship (repos, stars, languages, GitHub GraphQL commit totals when present in contributions.github, Solana/EVM deployment estimates, Helius-sampled activity, posts/projects counts). Clearly treat deployment counts and activity as estimates from public data, not audited truth.

FACTS JSON:
${facts}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Anthropic narrative error:', res.status, errText.slice(0, 500))
      return null
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>
    }
    const block = data.content?.find((c) => c.type === 'text')
    const text = block?.text?.trim()
    return text || null
  } catch (e) {
    console.error('generateBuilderNarrative:', e)
    return null
  }
}

export function buildNarrativeInputFromPayload(
  username: string,
  payload: {
    profile: any
    talent: any
    github: any
    socialShowcase: any
    contributions: BuilderContributionsSnapshot
  }
): BuilderNarrativeInput {
  const p = payload.profile || {}
  const users = p.users || {}
  const li = payload.socialShowcase?.linkedin
  const ghShow = payload.socialShowcase?.github
  const fc = payload.socialShowcase?.farcaster
  const liHints = linkedinHintsFromData(p.linkedin_data)

  return {
    handle: username,
    displayName: p.name || users.name || null,
    tagline: p.tagline || null,
    bio: p.bio || null,
    skills: Array.isArray(p.skills) ? p.skills : [],
    accountType: users.account_type || null,
    linkedin:
      li || liHints
        ? {
            name: li?.name ?? null,
            headline: li?.headline ?? null,
            hints: liHints,
          }
        : null,
    github: payload.github
      ? {
          username: payload.github.username,
          bio: payload.github.bio || null,
          publicRepos: payload.github.publicRepos,
          totalStars: payload.github.totalStars,
          topLanguages: payload.github.topLanguages || [],
        }
      : ghShow
        ? {
            username: ghShow.username,
            bio: ghShow.bio || null,
            publicRepos: ghShow.publicRepos,
            totalStars: ghShow.totalStars,
            topLanguages: ghShow.topLanguages || [],
          }
        : null,
    farcaster: fc
      ? {
          username: fc.username,
          displayName: fc.displayName,
          bio: fc.bio || null,
          followers: fc.followers || 0,
        }
      : null,
    contributions: payload.contributions,
    talentScore: payload.talent?.score ?? null,
  }
}
