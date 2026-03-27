'use client'
import { useState, useEffect, useCallback } from 'react'

export interface QuoteResult {
  outAmount: number
  priceImpactPct: number
  slippageBps: number
  routePlan?: unknown[]
  fee?: number
  bagsResponse?: any
}

interface TradeQuoteState {
  quote: QuoteResult | null
  loading: boolean
  error: string | null
}

export function useTradeQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  side: 'buy' | 'sell'
): TradeQuoteState & { refresh: () => void } {
  const [state, setState] = useState<TradeQuoteState>({
    quote: null,
    loading: false,
    error: null,
  })

  const fetchQuote = useCallback(() => {
    if (!amount || amount <= 0 || !inputMint || !outputMint) {
      setState({ quote: null, loading: false, error: null })
      return
    }

    setState(s => ({ ...s, loading: true, error: null }))

    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputMint, outputMint, amount, side }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setState({ quote: data, loading: false, error: null })
      })
      .catch(err => {
        setState({ quote: null, loading: false, error: err.message || 'Quote failed' })
      })
  }, [inputMint, outputMint, amount, side])

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 300)
    return () => clearTimeout(timer)
  }, [fetchQuote])

  return { ...state, refresh: fetchQuote }
}
