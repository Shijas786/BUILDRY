'use client'

import React from 'react'
import Link from 'next/link'

interface TickerToken {
  mint?: string
  symbol?: string
  price?: number
  priceChange24h?: number
}

export default function TokenTicker({ compact = false }: { compact?: boolean }) {
  const [tokens, setTokens] = React.useState<TickerToken[]>([])
  const [loading, setLoading] = React.useState(true)
  const [paused, setPaused] = React.useState(false)
  const trackRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    fetch('/api/tokens/trending')
      .then((r) => r.json())
      .then((data) => setTokens(Array.isArray(data) ? data.slice(0, 12) : []))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    const el = trackRef.current
    if (!el || tokens.length === 0) return

    let raf = 0
    const speed = compact ? 0.5 : 0.6

    const tick = () => {
      if (!paused) {
        el.scrollLeft += speed
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0
      }
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [tokens.length, paused, compact])

  if (loading || tokens.length === 0) {
    return null
  }

  const items = [...tokens, ...tokens]

  return (
    <div
      className={`relative rounded-xl border border-slate-100 bg-white overflow-hidden ${
        compact ? 'py-2' : 'py-2.5'
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-2 overflow-hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((token, idx) => {
          const change = Number(token.priceChange24h || 0)
          const positive = change >= 0
          const href = token.mint ? `/token/${token.mint}` : '/invest'

          return (
            <Link
              key={`${token.mint || token.symbol || 'token'}-${idx}`}
              href={href}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">
                  {token.symbol || 'TOKEN'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  ${Number(token.price || 0).toFixed(4)}
                </span>
                <span
                  className={`text-[10px] font-black tabular-nums ${
                    positive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {positive ? '+' : ''}
                  {change.toFixed(1)}%
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}

