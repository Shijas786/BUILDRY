'use client'
import { useState, useEffect } from 'react'
import { BagsToken } from '@/lib/bags'

interface TokenDataState {
  token: BagsToken | null
  loading: boolean
  error: string | null
}

export function useTokenData(mint: string): TokenDataState {
  const [state, setState] = useState<TokenDataState>({
    token: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!mint) return
    setState({ token: null, loading: true, error: null })

    fetch(`/api/tokens/${mint}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setState({ token: data, loading: false, error: null })
      })
      .catch(err => {
        setState({ token: null, loading: false, error: err.message || 'Failed to load token' })
      })
  }, [mint])

  return state
}
