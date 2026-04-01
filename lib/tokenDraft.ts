import type { BagsToken } from '@/lib/bags'

const PREFIX = 'reputrade:tokenDraft:'
const LAST_KEY = 'reputrade:lastTokenLaunch'

export type TokenDraft = { name: string; symbol: string }

/** Path with `dn` / `ds` so token page works in a new tab, shared links, and after refresh. */
export function buildTokenPagePath(
  mint: string,
  tokenName: string,
  tokenSymbol: string,
  hash?: string
): string {
  const m = mint.trim()
  const p = new URLSearchParams()
  p.set('dn', tokenName)
  p.set('ds', tokenSymbol.trim() || '—')
  const frag = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''
  return `/token/${encodeURIComponent(m)}?${p.toString()}${frag}`
}

function parseDraftFromStorage(raw: string | null): TokenDraft | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as { name?: unknown; symbol?: unknown; savedAt?: unknown }
    if (typeof o.name !== 'string' || typeof o.symbol !== 'string') return null
    const maxAge = 48 * 60 * 60 * 1000
    if (typeof o.savedAt === 'number' && Date.now() - o.savedAt > maxAge) return null
    return { name: o.name, symbol: o.symbol }
  } catch {
    return null
  }
}

function readPerMintDraft(mint: string): TokenDraft | null {
  if (typeof window === 'undefined') return null
  const key = PREFIX + mint
  try {
    let raw = localStorage.getItem(key)
    if (!raw) {
      raw = sessionStorage.getItem(key)
      if (raw) {
        try {
          localStorage.setItem(key, raw)
        } catch {
          /* ignore */
        }
      }
    }
    const draft = parseDraftFromStorage(raw)
    if (draft) return draft
  } catch {
    /* ignore */
  }
  return null
}

function readLastLaunchDraft(mint: string): TokenDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { mint?: unknown; name?: unknown; symbol?: unknown; savedAt?: unknown }
    if (typeof o.mint !== 'string' || o.mint !== mint) return null
    const maxAge = 48 * 60 * 60 * 1000
    if (typeof o.savedAt === 'number' && Date.now() - o.savedAt > maxAge) {
      localStorage.removeItem(LAST_KEY)
      return null
    }
    if (typeof o.name !== 'string' || typeof o.symbol !== 'string') return null
    return { name: o.name, symbol: o.symbol }
  } catch {
    return null
  }
}

export function saveTokenDraft(mint: string, draft: TokenDraft): void {
  if (typeof window === 'undefined') return
  const m = mint.trim()
  if (!m) return
  const payload = JSON.stringify({ name: draft.name, symbol: draft.symbol, savedAt: Date.now() })
  try {
    localStorage.setItem(PREFIX + m, payload)
    try {
      sessionStorage.setItem(PREFIX + m, payload)
    } catch {
      /* optional mirror */
    }
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({ mint: m, name: draft.name, symbol: draft.symbol, savedAt: Date.now() })
    )
  } catch {
    /* quota / private mode */
  }
}

export type BrowserLastLaunchMeta = { mint: string; name: string; symbol: string; savedAt: number }

/**
 * Most recent launch saved in this browser (`LAST_KEY`), for /launch resume UX.
 * Ignores per-mint draft expiry; uses a longer window than single-mint drafts.
 */
export function readBrowserLastLaunchMeta(): BrowserLastLaunchMeta | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LAST_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { mint?: unknown; name?: unknown; symbol?: unknown; savedAt?: unknown }
    if (typeof o.mint !== 'string' || !o.mint.trim()) return null
    if (typeof o.name !== 'string' || typeof o.symbol !== 'string') return null
    const maxAge = 365 * 24 * 60 * 60 * 1000
    if (typeof o.savedAt === 'number' && Date.now() - o.savedAt > maxAge) return null
    return {
      mint: o.mint.trim(),
      name: o.name,
      symbol: o.symbol,
      savedAt: typeof o.savedAt === 'number' ? o.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function readTokenDraft(mint: string): TokenDraft | null {
  const m = mint.trim()
  if (!m) return null
  return readPerMintDraft(m) ?? readLastLaunchDraft(m)
}

export function clearTokenDraft(mint: string): void {
  if (typeof window === 'undefined') return
  const m = mint.trim()
  try {
    localStorage.removeItem(PREFIX + m)
    try {
      sessionStorage.removeItem(PREFIX + m)
    } catch {
      /* noop */
    }
    const raw = localStorage.getItem(LAST_KEY)
    if (raw) {
      try {
        const o = JSON.parse(raw) as { mint?: string }
        if (o.mint === m) localStorage.removeItem(LAST_KEY)
      } catch {
        /* noop */
      }
    }
  } catch {
    /* noop */
  }
}

/** Shown on /token/[mint] while Bags has not indexed the mint yet. */
export function provisionalBagsToken(mint: string, draft: TokenDraft): BagsToken {
  return {
    mint,
    name: draft.name.trim() || 'Token',
    symbol: (draft.symbol.trim() || 'TKN').slice(0, 12),
    price: 0,
    priceChange24h: 0,
    marketCap: 0,
    volume24h: 0,
    holders: 0,
    liquidity: 0,
    feeApy: 0,
  }
}
