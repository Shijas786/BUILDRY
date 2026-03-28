import type { GitHubStats } from '@/lib/github'
import type { FarcasterProfile } from '@/lib/farcaster'

function pickStr(obj: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!obj) return null
  const v = obj[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export type LinkedInShowcase = {
  name: string | null
  picture: string | null
  email: string | null
  headline: string | null
  linkedinUrl: string | null
}

/** Public-safe fields from OIDC / stored `linkedin_data` + `linkedin_url`. */
export function linkedinShowcaseFromProfile(profile: {
  linkedin_data?: Record<string, unknown> | null
  linkedin_url?: string | null
}): LinkedInShowcase | null {
  const data = profile?.linkedin_data as Record<string, unknown> | null | undefined
  const url = profile?.linkedin_url?.trim() || null

  const name =
    pickStr(data, 'name') ||
    [pickStr(data, 'given_name'), pickStr(data, 'family_name')].filter(Boolean).join(' ').trim() ||
    null
  const picture = pickStr(data, 'picture') || pickStr(data, 'picture_url') || null
  const email = pickStr(data, 'email') || null
  const headline =
    pickStr(data, 'headline') || pickStr(data, 'title') || pickStr(data, 'localizedHeadline') || null

  if (!name && !picture && !headline && !email && !url) return null

  return { name, picture, email, headline, linkedinUrl: url }
}

export type GitHubShowcase = GitHubStats & {
  oauthName?: string | null
  oauthBlog?: string | null
  oauthCompany?: string | null
  oauthTwitter?: string | null
  htmlUrl?: string | null
}

export function enrichGithubShowcase(
  stats: GitHubStats | null,
  oauth: Record<string, unknown> | null | undefined,
  username: string | undefined
): GitHubShowcase | null {
  if (!username?.trim()) return null

  const u = username.trim()
  const base: GitHubStats =
    stats ||
    ({
      username: u,
      publicRepos: 0,
      followers: 0,
      totalStars: 0,
      topLanguages: [],
      avatarUrl: '',
      bio: null,
      recentCommits: 0,
    } satisfies GitHubStats)

  if (!oauth || typeof oauth !== 'object') {
    return {
      ...base,
      htmlUrl: `https://github.com/${u}`,
    }
  }

  return {
    ...base,
    oauthName: pickStr(oauth, 'name'),
    oauthBlog: pickStr(oauth, 'blog'),
    oauthCompany: pickStr(oauth, 'company'),
    oauthTwitter: pickStr(oauth, 'twitter_username'),
    htmlUrl: pickStr(oauth, 'html_url') || `https://github.com/${u}`,
    bio: base.bio || pickStr(oauth, 'bio'),
    avatarUrl: base.avatarUrl || pickStr(oauth, 'avatar_url') || '',
  }
}

/** `@user`, `user`, or `!fid` → username lookup vs FID. */
export function parseFarcasterHandle(handle: string | null | undefined): {
  kind: 'username' | 'fid'
  value: string
  fid?: number
} | null {
  if (!handle?.trim()) return null
  let h = handle.trim().replace(/^@/, '')
  if (h.startsWith('!')) {
    const n = parseInt(h.slice(1), 10)
    if (Number.isFinite(n) && n > 0) return { kind: 'fid', value: h, fid: n }
  }
  return { kind: 'username', value: h }
}

export type SocialShowcaseResponse = {
  linkedin: LinkedInShowcase | null
  github: GitHubShowcase | null
  farcaster: FarcasterProfile | null
  farcasterFromConnect: Record<string, unknown> | null
}

/** When Neynar is unavailable, show fields saved at Sign-in with Farcaster time. */
export function farcasterShowcaseFromStored(data: Record<string, unknown> | null | undefined): {
  username: string
  displayName: string
  bio?: string
  avatar?: string
  fid?: number
} | null {
  if (!data || typeof data !== 'object') return null
  const username = typeof data.username === 'string' ? data.username : ''
  const fid = typeof data.fid === 'number' ? data.fid : undefined
  if (!username && fid == null) return null
  const displayName =
    (typeof data.displayName === 'string' && data.displayName) ||
    username ||
    (fid != null ? `FID ${fid}` : '')
  return {
    username: username || (fid != null ? `!${fid}` : ''),
    displayName,
    bio: typeof data.bio === 'string' ? data.bio : undefined,
    avatar: typeof data.pfpUrl === 'string' ? data.pfpUrl : undefined,
    fid,
  }
}
