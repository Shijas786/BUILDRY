'use client'
import { useState, useEffect } from 'react'
import type { BagsToken } from '@/lib/bags'
import type { TokenDraft } from '@/lib/tokenDraft'
import {
  readTokenDraft,
  clearTokenDraft,
  provisionalBagsToken,
  saveTokenDraft,
} from '@/lib/tokenDraft'

export interface TokenDataState {
  token: BagsToken | null
  loading: boolean
  error: string | null
  /** True when showing launch metadata until Bags indexes the mint */
  provisional: boolean
}

async function fetchTokenJson(mint: string): Promise<BagsToken | null> {
  const r = await fetch(`/api/tokens/${encodeURIComponent(mint)}`, { cache: 'no-store' })
  const data = (await r.json()) as BagsToken & { error?: string }
  if (!r.ok || data?.error) return null
  const m = (mint || '').trim()
  if (!data?.mint && m) {
    return { ...data, mint: m } as BagsToken
  }
  if (!data?.mint) return null
  return data as BagsToken
}

/**
 * @param queryDraft - from URL `dn` + `ds` (see buildTokenPagePath); persisted so refresh keeps working.
 */
export function useTokenData(mint: string, queryDraft: TokenDraft | null = null): TokenDataState {
  const [state, setState] = useState<TokenDataState>({
    token: null,
    loading: true,
    error: null,
    provisional: false,
  })

  useEffect(() => {
    const m = (mint || '').trim()
    if (!m) return
    let cancelled = false
    let poll: ReturnType<typeof setInterval> | undefined

    const stopPoll = () => {
      if (poll) {
        clearInterval(poll)
        poll = undefined
      }
    }

    setState({ token: null, loading: true, error: null, provisional: false })

    ;(async () => {
      if (queryDraft?.name && queryDraft?.symbol) {
        saveTokenDraft(m, queryDraft)
      }

      const indexed = await fetchTokenJson(m)
      if (cancelled) return
      if (indexed) {
        clearTokenDraft(m)
        setState({ token: indexed, loading: false, error: null, provisional: false })
        return
      }

      const draft =
        queryDraft?.name && queryDraft?.symbol ? queryDraft : readTokenDraft(m)
      if (draft) {
        setState({
          token: provisionalBagsToken(m, draft),
          loading: false,
          error: null,
          provisional: true,
        })
        poll = setInterval(async () => {
          if (cancelled) return
          const t = await fetchTokenJson(m)
          if (t && !cancelled) {
            stopPoll()
            clearTokenDraft(m)
            setState({ token: t, loading: false, error: null, provisional: false })
          }
        }, 10_000)
      } else {
        setState({
          token: null,
          loading: false,
          error: 'Token not found',
          provisional: false,
        })
      }
    })()

    return () => {
      cancelled = true
      stopPoll()
    }
  }, [mint, queryDraft?.name, queryDraft?.symbol])

  return state
}
