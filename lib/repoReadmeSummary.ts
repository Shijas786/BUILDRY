import axios from 'axios'
import { getGitHubReadmePlainText, type GitHubRepoProject } from '@/lib/github'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'
const CHAINGPT_BASE = 'https://api.chaingpt.org/v1'

const MAX_OUTPUT_CHARS = 240
const MIN_README_CHARS = 32

export function isRepoReadmeAiConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.CHAINGPT_API_KEY?.trim()
  )
}

function normalizeOneLineSummary(raw: string): string | null {
  let t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return null
  if (/^skip\.?$/i.test(t)) return null
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim()
  }
  if (!t || /^skip\.?$/i.test(t)) return null
  return t.length > MAX_OUTPUT_CHARS ? `${t.slice(0, MAX_OUTPUT_CHARS - 1)}…` : t
}

function buildPrompt(repo: GitHubRepoProject, readmeText: string): string {
  const topics = repo.topics?.length ? repo.topics.join(', ') : 'none'
  return `You write one-line descriptions for GitHub project cards on a builder profile.

Repo: ${repo.name}
Primary language: ${repo.language || 'unknown'}
Topics: ${topics}

Below is the repository README (may be Markdown). Write exactly ONE concise sentence (max ${MAX_OUTPUT_CHARS} characters) describing what the project does for a technical audience.
Use ONLY information from the README. Do not invent features, users, or traction.
If the README is empty, useless, or not about a software project, reply with exactly: SKIP

README:
---
${readmeText}
---`
}

async function summarizeWithAnthropic(repo: GitHubRepoProject, readmeText: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null
  const prompt = buildPrompt(repo, readmeText)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 200,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('Anthropic repo README summary:', res.status, errText.slice(0, 400))
      return null
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const block = data.content?.find((c) => c.type === 'text')
    return normalizeOneLineSummary(block?.text || '')
  } catch (e) {
    console.error('summarizeWithAnthropic readme:', e)
    return null
  }
}

async function summarizeWithChainGpt(repo: GitHubRepoProject, readmeText: string): Promise<string | null> {
  const key = process.env.CHAINGPT_API_KEY?.trim()
  if (!key) return null
  const prompt = buildPrompt(repo, readmeText)
  try {
    const { data } = await axios.post(
      `${CHAINGPT_BASE}/chat/completions`,
      {
        model: 'chaingpt-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 180,
        temperature: 0.25,
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout: 12000,
      }
    )
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' ? normalizeOneLineSummary(content) : null
  } catch (e) {
    console.error('ChainGPT repo README summary:', e)
    return null
  }
}

export async function summarizeRepoReadmeWithAi(
  repo: GitHubRepoProject,
  readmeText: string
): Promise<string | null> {
  const fromAnthropic = await summarizeWithAnthropic(repo, readmeText)
  if (fromAnthropic) return fromAnthropic
  return summarizeWithChainGpt(repo, readmeText)
}

/**
 * Fetches README + AI one-liner per repo (parallelism capped). Empty map when no AI keys or on total failure.
 */
export async function enrichGithubReposWithReadmeSummaries(
  ownerLogin: string,
  repos: GitHubRepoProject[]
): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  if (!isRepoReadmeAiConfigured() || !repos.length) return out

  const CONCURRENCY = 3
  let cursor = 0

  async function processOne(repo: GitHubRepoProject) {
    try {
      const readme = await getGitHubReadmePlainText(ownerLogin, repo.name)
      if (!readme || readme.length < MIN_README_CHARS) return
      const summary = await summarizeRepoReadmeWithAi(repo, readme)
      if (summary) out.set(repo.id, summary)
    } catch (e) {
      console.error('enrichGithubReposWithReadmeSummaries:', repo.name, e)
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, repos.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= repos.length) break
      await processOne(repos[i])
    }
  })
  await Promise.all(workers)
  return out
}
