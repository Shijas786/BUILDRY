import axios from 'axios'

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
  if (!username) return null
  try {
    const { data: user } = await axios.get(`https://api.github.com/users/${username}`, {
      timeout: 8000,
      headers: { Accept: 'application/vnd.github.v3+json' },
    })

    let totalStars = 0
    const langSet = new Set<string>()

    try {
      const { data: repos } = await axios.get(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
        { timeout: 8000, headers: { Accept: 'application/vnd.github.v3+json' } }
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
  if (!username) return []
  try {
    const { data: repos } = await axios.get(
      `https://api.github.com/users/${username}/repos`,
      {
        params: { per_page: 100, sort: 'updated' },
        timeout: 10000,
        headers: { Accept: 'application/vnd.github.v3+json' },
      }
    )
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

export async function getGitHubContributionSummary(username: string): Promise<GitHubContributionSummary | null> {
  if (!username) return null
  try {
    const today = new Date()
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    start.setUTCDate(start.getUTCDate() - 364)

    const pointsMap = new Map<string, number>()
    for (let i = 0; i < 365; i += 1) {
      const dt = new Date(start)
      dt.setUTCDate(start.getUTCDate() + i)
      pointsMap.set(formatDateUTC(dt), 0)
    }

    // Public-only contribution approximation (works without private OAuth token)
    const { data: events } = await axios.get(`https://api.github.com/users/${username}/events/public`, {
      params: { per_page: 100 },
      timeout: 10000,
      headers: { Accept: 'application/vnd.github.v3+json' },
    })

    for (const ev of events || []) {
      const date = formatDateUTC(new Date(ev.created_at))
      if (!pointsMap.has(date)) continue
      const bump = ev.type === 'PushEvent' ? 2 : 1
      pointsMap.set(date, (pointsMap.get(date) || 0) + bump)
    }

    const points = Array.from(pointsMap.entries()).map(([date, count]) => ({ date, count }))
    const totalContributions = points.reduce((sum, p) => sum + p.count, 0)
    const activeDays = points.filter((p) => p.count > 0).length

    let longestStreak = 0
    let currentStreak = 0
    let run = 0
    for (let i = 0; i < points.length; i += 1) {
      if (points[i].count > 0) {
        run += 1
        if (run > longestStreak) longestStreak = run
      } else {
        run = 0
      }
    }
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
  } catch {
    return null
  }
}
