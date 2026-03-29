import { exploreScoreFromProfile } from '@/lib/exploreBuilders'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

export type LaunchCelebrationSnapshot = {
  builderScore: number | null
  /** GraphQL commit total when available */
  graphqlCommits: number | null
  activity365d: number | null
  streakDays: number
  topLanguage: string | null
  githubLogin: string | null
  githubAvatarUrl: string | null
}

type PayloadLike = {
  profile: Record<string, unknown> | null
  socialShowcase?: {
    github?: {
      username: string
      avatarUrl: string
      oauthName?: string | null
    } | null
  } | null
  contributions?: BuilderContributionsSnapshot
} | null

/** Captured at deploy success so the celebration screen reflects “what went on-chain” at that moment. */
export function captureLaunchSnapshot(payload: PayloadLike): LaunchCelebrationSnapshot {
  const profile = payload?.profile ?? null
  const gh = payload?.socialShowcase?.github
  const c = payload?.contributions?.github

  const githubLogin =
    gh?.username ||
    (typeof profile?.github_username === 'string' ? profile.github_username.trim() : null) ||
    null

  const githubAvatarUrl =
    gh?.avatarUrl ||
    (typeof profile?.avatar_url === 'string' ? profile.avatar_url : null) ||
    null

  return {
    builderScore: profile && Object.keys(profile).length > 0 ? exploreScoreFromProfile(profile) : null,
    graphqlCommits: c?.graphqlCommitContributionsTotal ?? null,
    activity365d: c?.activityPoints365d ?? null,
    streakDays: c?.currentStreakDays ?? 0,
    topLanguage: c?.topLanguages?.[0] ?? null,
    githubLogin,
    githubAvatarUrl,
  }
}

export function formatCommitsForTweet(s: LaunchCelebrationSnapshot): string {
  if (s.graphqlCommits != null && s.graphqlCommits > 0) {
    return `${s.graphqlCommits.toLocaleString()} commits on GitHub.`
  }
  if (s.activity365d != null && s.activity365d > 0) {
    return `${s.activity365d.toLocaleString()} pts GitHub activity (365d).`
  }
  return 'Shipping on GitHub.'
}

export function shortMintAddress(mint: string, head = 6, tail = 4): string {
  const t = mint.trim()
  if (t.length <= head + tail + 1) return t
  return `${t.slice(0, head)}…${t.slice(-tail)}`
}
