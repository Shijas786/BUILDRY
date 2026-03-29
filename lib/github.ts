import axios from 'axios'

/** Strip @ / whitespace; reject obvious non-handles. Use before every GitHub API call. */
export function normalizeGithubLogin(raw: string | null | undefined): string | null {
  if (raw == null) return null
  let t = String(raw).trim()
  if (!t) return null
  if (t.includes('github.com/')) {
    const m = t.match(/github\.com\/([^/?#]+)/i)
    t = m?.[1]?.trim() || t
  }
  t = t.replace(/^@+/, '')
  if (!t || /\s/.test(t)) return null
  return t
}

/** PAT for REST (same env vars as GraphQL). Unauthenticated `/users` hits 60 req/h/IP — authenticated is much higher. */
function githubRestHeaders(): Record<string, string> {
  const token =
    process.env.GITHUB_GRAPHQL_TOKEN?.trim() ||
    process.env.GITHUUB_GRAPHQL_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim()
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export interface GitHubStats {
  username: string
  publicRepos: number
  followers: number
  totalStars: number
  topLanguages: string[]
  avatarUrl: string
  bio: string | null
  recentCommits: number
}

export interface GitHubRepoProject {
  id: number
  name: string
  description: string | null
  htmlUrl: string
  stars: number
  forks: number
  language: string | null
  pushedAt: string
  updatedAt: string
  isFork: boolean
  /** Repository topics (requires a modern GitHub Accept header on list repos). */
  topics: string[]
  homepage: string | null
}

const MAX_CARD_DESCRIPTION_LEN = 240

const MAX_README_FETCH_CHARS = 14_000

/**
 * Decoded default branch README (Markdown/plain). Null when missing or on error.
 * Truncated to keep AI prompts bounded.
 */
export async function getGitHubReadmePlainText(owner: string, repo: string): Promise<string | null> {
  const o = normalizeGithubLogin(owner)
  const name = typeof repo === 'string' ? repo.trim() : ''
  if (!o || !name) return null
  try {
    const { data, status } = await axios.get<{ content?: string; encoding?: string }>(
      `https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(name)}/readme`,
      {
        headers: githubRestHeaders(),
        timeout: 12000,
        validateStatus: (s) => s === 200 || s === 404,
      }
    )
    if (status === 404 || !data?.content || data.encoding !== 'base64') return null
    const raw = Buffer.from(String(data.content).replace(/\s/g, ''), 'base64').toString('utf8').trim()
    if (!raw) return null
    return raw.length > MAX_README_FETCH_CHARS ? raw.slice(0, MAX_README_FETCH_CHARS) : raw
  } catch {
    return null
  }
}

const README_HEURISTIC_MAX = 240

/**
 * First substantive paragraph from README (no AI). Used when GitHub's About description is empty
 * and the model call failed or was skipped.
 */
export function blurbFromReadmeMarkdown(md: string): string | null {
  const trimmed = md.trim()
  if (trimmed.length < 50) return null
  let text = trimmed.replace(/```[\s\S]*?```/g, ' ')
  text = text.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/m, '')
  const blocks = text.split(/\n{2,}/)
  for (const block of blocks) {
    let line = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^<(https?:)?\/\//i.test(l))
      .join(' ')
      .trim()
    line = line.replace(/^#{1,6}\s+/, '')
    line = line.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    line = line.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    line = line.replace(/\*\*?|`|<\/?[^>]+>/g, '')
    line = line.replace(/\s+/g, ' ').trim()
    if (line.length >= 45 && line.split(/\s+/).length >= 5) {
      return line.length > README_HEURISTIC_MAX
        ? `${line.slice(0, README_HEURISTIC_MAX - 1)}…`
        : line
    }
  }
  return null
}

/**
 * Prefer GitHub's short description; otherwise compose topics, website, language, and stars
 * so profile cards are not all the same generic line.
 */
export function formatGithubRepoCardDescription(repo: GitHubRepoProject): string {
  const raw = repo.description?.trim()
  if (raw) {
    return raw.length > MAX_CARD_DESCRIPTION_LEN
      ? `${raw.slice(0, MAX_CARD_DESCRIPTION_LEN - 1)}…`
      : raw
  }
  const bits: string[] = []
  if (repo.topics?.length) {
    const t = repo.topics.slice(0, 8)
    bits.push(`${t.join(', ')}${repo.topics.length > 8 ? '…' : ''}`)
  }
  if (repo.homepage?.trim()) {
    try {
      const url = repo.homepage.match(/^https?:\/\//i)
        ? repo.homepage.trim()
        : `https://${repo.homepage.trim()}`
      const host = new URL(url).hostname.replace(/^www\./, '')
      if (host) bits.push(`Live site: ${host}`)
    } catch {
      bits.push('Has a linked website')
    }
  }
  if (repo.language) bits.push(`${repo.language} repo`)
  if (repo.stars > 0) {
    bits.push(`${repo.stars.toLocaleString()} GitHub star${repo.stars === 1 ? '' : 's'}`)
  }
  if (repo.forks > 0) {
    bits.push(`${repo.forks.toLocaleString()} fork${repo.forks === 1 ? '' : 's'}`)
  }
  if (bits.length) return bits.join(' · ')
  return 'Public repository on GitHub.'
}

export interface GitHubContributionPoint {
  date: string
  count: number
}

export interface GitHubContributionSummary {
  totalContributions: number
  activeDays: number
  longestStreak: number
  currentStreak: number
  points: GitHubContributionPoint[]
}

export async function getGitHubStats(username: string): Promise<GitHubStats | null> {
  const login = normalizeGithubLogin(username)
  if (!login) return null
  try {
    const { data: user } = await axios.get(`https://api.github.com/users/${login}`, {
      timeout: 8000,
      headers: githubRestHeaders(),
    })

    let totalStars = 0
    const langSet = new Set<string>()

    try {
      const { data: repos } = await axios.get(
        `https://api.github.com/users/${login}/repos?per_page=100&sort=updated`,
        { timeout: 8000, headers: githubRestHeaders() }
      )
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0
        if (repo.language) langSet.add(repo.language)
      }
    } catch {}

    return {
      username: user.login,
      publicRepos: user.public_repos || 0,
      followers: user.followers || 0,
      totalStars,
      topLanguages: Array.from(langSet).slice(0, 6),
      avatarUrl: user.avatar_url || '',
      bio: user.bio,
      recentCommits: 0,
    }
  } catch {
    return null
  }
}

export async function getGitHubRepoProjects(username: string): Promise<GitHubRepoProject[]> {
  const login = normalizeGithubLogin(username)
  if (!login) return []
  try {
    const { data: repos } = await axios.get(`https://api.github.com/users/${login}/repos`, {
      params: { per_page: 100, sort: 'updated' },
      timeout: 10000,
      headers: {
        ...githubRestHeaders(),
        // Ensures `topics` (and full repo metadata) on list responses.
        Accept: 'application/vnd.github+json',
      },
    })
    const normalized: GitHubRepoProject[] = (repos || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || null,
      htmlUrl: r.html_url,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || null,
      pushedAt: r.pushed_at || '',
      updatedAt: r.updated_at || '',
      isFork: !!r.fork,
      topics: Array.isArray(r.topics) ? r.topics.filter((x: unknown) => typeof x === 'string' && x.trim()) : [],
      homepage: typeof r.homepage === 'string' && r.homepage.trim() ? r.homepage.trim() : null,
    }))
    return normalized
      .filter((r) => !r.isFork)
      .sort((a, b) => {
        const scoreA = a.stars * 4 + a.forks * 2 + (Date.parse(a.pushedAt) || 0) / 1e11
        const scoreB = b.stars * 4 + b.forks * 2 + (Date.parse(b.pushedAt) || 0) / 1e11
        return scoreB - scoreA
      })
      .slice(0, 8)
  } catch {
    return []
  }
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type GitHubCommitTotalsGraphql = {
  /** Sum of GitHub `totalCommitContributions` per calendar year (public graph rules). */
  totalCommits: number
  /** Calendar years included in the sum (newest first). */
  yearsIncluded: number[]
}

export type GitHubGraphqlCommitsOutcome = {
  totals: GitHubCommitTotalsGraphql | null
  /** First GraphQL error message (token misconfigured, forbidden, user not found, etc.). */
  error?: string
}

function githubPatForGraphql(): string | null {
  return (
    process.env.GITHUB_GRAPHQL_TOKEN?.trim() ||
    process.env.GITHUUB_GRAPHQL_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    null
  )
}

export function isGithubPatConfigured(): boolean {
  return !!githubPatForGraphql()
}

/**
 * Real commit totals from GitHub GraphQL `contributionsCollection` (same family as the green graph).
 * Requires a server token: `GITHUB_GRAPHQL_TOKEN` or `GITHUB_TOKEN` (classic PAT with **`read:user`** recommended).
 * Fine-grained PATs must allow **read** access to user data needed for GraphQL user lookup.
 */
export async function getGitHubCommitTotalsGraphqlWithMeta(rawLogin: string): Promise<GitHubGraphqlCommitsOutcome> {
  const token = githubPatForGraphql()
  const login = normalizeGithubLogin(rawLogin)
  if (!token || !login) return { totals: null }

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const years: number[] = []
  for (let i = 0; i < 5; i += 1) years.push(currentYear - i)

  let totalCommits = 0
  const yearsIncluded: number[] = []
  let loginValid = false
  let firstError: string | undefined

  for (const y of years) {
    const from = `${y}-01-01T00:00:00Z`
    const to = y === currentYear ? now.toISOString() : `${y}-12-31T23:59:59Z`

    try {
      const { data } = await axios.post<{
        data?: { user?: { contributionsCollection?: { totalCommitContributions?: number } } }
        errors?: { message: string }[]
      }>(
        'https://api.github.com/graphql',
        {
          query: `
            query($login: String!, $from: DateTime!, $to: DateTime!) {
              user(login: $login) {
                contributionsCollection(from: $from, to: $to) {
                  totalCommitContributions
                }
              }
            }
          `,
          variables: { login, from, to },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      )

      if (data.errors?.length) {
        const msg = data.errors.map((e) => e.message).join('; ')
        if (!firstError) firstError = msg
        continue
      }
      const user = data.data?.user
      if (!user) {
        if (!firstError) firstError = `GitHub user not found: ${login}`
        continue
      }
      loginValid = true
      const n = user.contributionsCollection?.totalCommitContributions
      if (typeof n === 'number') {
        totalCommits += n
        yearsIncluded.push(y)
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? `${e.message}${e.response?.status ? ` (${e.response.status})` : ''}` : 'request failed'
      if (!firstError) firstError = msg
    }
  }

  if (!loginValid) {
    return { totals: null, error: firstError }
  }

  return { totals: { totalCommits, yearsIncluded }, error: firstError }
}

/** @deprecated Prefer getGitHubCommitTotalsGraphqlWithMeta for error visibility. */
export async function getGitHubCommitTotalsGraphql(login: string): Promise<GitHubCommitTotalsGraphql | null> {
  const { totals } = await getGitHubCommitTotalsGraphqlWithMeta(login)
  return totals
}

function buildLast365DaysPointsMap(): Map<string, number> {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - 364)
  const pointsMap = new Map<string, number>()
  for (let i = 0; i < 365; i += 1) {
    const dt = new Date(start)
    dt.setUTCDate(start.getUTCDate() + i)
    pointsMap.set(formatDateUTC(dt), 0)
  }
  return pointsMap
}

function contributionSummaryFromPointsMap(pointsMap: Map<string, number>): GitHubContributionSummary {
  const points = Array.from(pointsMap.entries()).map(([date, count]) => ({ date, count }))
  const totalContributions = points.reduce((sum, p) => sum + p.count, 0)
  const activeDays = points.filter((p) => p.count > 0).length

  let longestStreak = 0
  let run = 0
  for (let i = 0; i < points.length; i += 1) {
    if (points[i].count > 0) {
      run += 1
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }
  let currentStreak = 0
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].count > 0) currentStreak += 1
    else break
  }

  return {
    totalContributions,
    activeDays,
    longestStreak,
    currentStreak,
    points,
  }
}

/**
 * Same contribution counts as GitHub’s green graph (public rules), for the given date range.
 * Requires the same PAT as other GraphQL calls (`read:user` on a classic PAT).
 */
async function tryGitHubContributionSummaryGraphql(
  login: string,
  pointsMap: Map<string, number>,
  fromIso: string,
  toIso: string,
  token: string
): Promise<GitHubContributionSummary | null> {
  try {
    const { data } = await axios.post<{
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: {
              totalContributions?: number
              weeks?: { contributionDays?: { date: string; contributionCount: number }[] }[]
            }
          }
        }
      }
      errors?: { message: string }[]
    }>(
      'https://api.github.com/graphql',
      {
        query: `
          query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { login, from: fromIso, to: toIso },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 12000,
      }
    )

    if (data.errors?.length) return null
    const user = data.data?.user
    if (!user) return null
    const calendar = user.contributionsCollection?.contributionCalendar
    if (!calendar) return null
    const weeks = calendar.weeks || []

    for (const w of weeks) {
      for (const day of w.contributionDays || []) {
        const d = typeof day.date === 'string' ? day.date.slice(0, 10) : ''
        if (!d || !pointsMap.has(d)) continue
        const n = day.contributionCount
        if (typeof n === 'number' && n >= 0) pointsMap.set(d, n)
      }
    }

    return contributionSummaryFromPointsMap(pointsMap)
  } catch {
    return null
  }
}

async function contributionSummaryFromPublicEvents(login: string, pointsMap: Map<string, number>): Promise<GitHubContributionSummary> {
  const headers = githubRestHeaders()
  const allEvents: { created_at: string; type: string }[] = []
  try {
    for (let page = 1; page <= 3; page += 1) {
      const { data: pageEvents } = await axios.get(`https://api.github.com/users/${login}/events/public`, {
        params: { per_page: 100, page },
        timeout: 10000,
        headers,
      })
      const arr = pageEvents || []
      if (!arr.length) break
      allEvents.push(...arr)
      if (arr.length < 100) break
    }
  } catch {
    /* rate limits / network — still return empty grid so the UI heatmap renders */
  }

  for (const ev of allEvents) {
    const date = formatDateUTC(new Date(ev.created_at))
    if (!pointsMap.has(date)) continue
    const bump = ev.type === 'PushEvent' ? 2 : 1
    pointsMap.set(date, (pointsMap.get(date) || 0) + bump)
  }

  return contributionSummaryFromPointsMap(pointsMap)
}

/**
 * 365-day contribution grid + totals. With a server PAT, uses GraphQL `contributionCalendar` (matches GitHub’s graph).
 * Without a token (or if GraphQL fails), falls back to scoring from public events; on events API failure, returns zeros instead of null.
 */
export async function getGitHubContributionSummary(username: string): Promise<GitHubContributionSummary | null> {
  const login = normalizeGithubLogin(username)
  if (!login) return null

  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - 364)
  const fromIso = `${formatDateUTC(start)}T00:00:00Z`
  const toIso = today.toISOString()

  const token = githubPatForGraphql()
  if (token) {
    const map = buildLast365DaysPointsMap()
    const gql = await tryGitHubContributionSummaryGraphql(login, map, fromIso, toIso, token)
    if (gql) return gql
  }

  const mapFallback = buildLast365DaysPointsMap()
  return contributionSummaryFromPublicEvents(login, mapFallback)
}
