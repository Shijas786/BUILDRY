/**
 * Public explore / talent board: map Firestore builder_profiles → card + API shape.
 */

export type ExploreBuilderPublic = {
  id: string
  /** Public handle (matches `builder_profiles.username`). */
  name: string
  display_name: string
  image_url?: string
  /** Profile banner from Settings (optional). */
  banner_url?: string
  bio?: string
  tags: string[]
  builder_score: { points: number; slug?: string }
  scores?: { slug: string; points: number }[]
  /** Link from Explore cards (Firebase profiles use /profile/[username]). */
  profileHref: string
}

/** Heuristic “builder score” for Explore (no Talent Protocol dependency). */
export function exploreScoreFromProfile(data: Record<string, unknown>): number {
  let s = 12
  const bio = typeof data.bio === 'string' ? data.bio : ''
  const tagline = typeof data.tagline === 'string' ? data.tagline : ''
  if (bio.length > 40 || tagline.length > 20) s += 14
  if (typeof data.avatar_url === 'string' && data.avatar_url.length > 8) s += 10
  if (typeof data.banner_url === 'string' && data.banner_url.length > 8) s += 4
  if (typeof data.github_username === 'string' && data.github_username.trim()) s += 18
  if (typeof data.farcaster_handle === 'string' && data.farcaster_handle.trim()) s += 8
  if (typeof data.linkedin_url === 'string' && data.linkedin_url.trim()) s += 6
  const skills = Array.isArray(data.skills) ? data.skills : []
  s += Math.min(22, skills.length * 4)
  if (data.open_for_work === true) s += 6
  if (data.github_verified === true) s += 5
  return Math.min(96, Math.max(8, s))
}

export function mapFirestoreProfileToExplore(
  docId: string,
  data: Record<string, unknown>
): ExploreBuilderPublic | null {
  const u = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
  if (u.length < 3) return null

  const display =
    (typeof data.name === 'string' && data.name.trim()) ||
    (typeof data.username === 'string' && data.username.trim()) ||
    'Builder'
  const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean).map(String) : []
  const points = exploreScoreFromProfile(data)

  return {
    id: docId,
    name: u,
    display_name: display,
    image_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
    banner_url: typeof data.banner_url === 'string' && data.banner_url.trim().length > 8 ? data.banner_url.trim() : undefined,
    bio:
      (typeof data.bio === 'string' && data.bio) ||
      (typeof data.tagline === 'string' && data.tagline) ||
      '',
    tags: skills.length > 0 ? skills.slice(0, 5) : ['Builder'],
    builder_score: { points, slug: 'explorer' },
    scores: [
      { slug: 'builder_score', points },
      { slug: 'builder_score_2025', points },
    ],
    profileHref: `/profile/${encodeURIComponent(u)}`,
  }
}
