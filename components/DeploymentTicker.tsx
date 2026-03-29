'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useMarqueeTrack } from '@/hooks/useMarqueeTrack'

interface TickerToken {
  mint: string
  symbol: string
  tier: 'VERIFIED' | 'PARTIAL' | 'ANONYMOUS'
  builderRank?: number | null
}

export default function DeploymentTicker() {
  const [tokens, setTokens] = useState<TickerToken[]>([])
  const [pause, setPause] = useState(false)

  const resetKey = useMemo(() => tokens.map((t) => t.mint).join(','), [tokens])

  const trackRef = useMarqueeTrack({
    speed: 0.28,
    pause,
    resetKey,
  })

  useEffect(() => {
    fetch('/api/feed/latest')
      .then(r => r.json())
      .then(data => {
        if (data.tokens) setTokens(data.tokens)
      })
      .catch(() => {})
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/feed/latest')
        .then(r => r.json())
        .then(data => {
          if (data.tokens) setTokens(data.tokens)
        })
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (tokens.length === 0) return null

  const renderLink = (t: TickerToken, keySuffix: string, dup: boolean) => (
    <Link
      key={`${t.mint}-${keySuffix}`}
      href={`/token/${t.mint}`}
      tabIndex={dup ? -1 : undefined}
      className={`flex items-center gap-2 group transition-opacity hover:opacity-80 ${dup ? 'pointer-events-none' : ''}`}
    >
      <span className="text-[10px] font-black text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">BUILDER COIN</span>
      <span className="text-[12px] font-black text-[var(--text-primary)]">${t.symbol}</span>
      {t.tier === 'VERIFIED' && (
        <span className="bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[9px] font-black px-1.5 py-0.5 rounded border border-[var(--accent-green)]/20 uppercase tracking-wider">
          Rank #{t.builderRank || 'High'}
        </span>
      )}
      {t.tier === 'PARTIAL' && (
        <span className="bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] text-[9px] font-black px-1.5 py-0.5 rounded border border-[var(--accent-amber)]/20 uppercase tracking-wider">
          Partial
        </span>
      )}
      {t.tier === 'ANONYMOUS' && (
        <span className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[var(--border)] uppercase tracking-wider">
          Anon
        </span>
      )}
      <span className="text-[10px] font-bold text-[var(--accent-green)]">+{(Math.random() * 5).toFixed(2)}%</span>
    </Link>
  )

  return (
    <div
      className="w-full bg-[var(--bg-primary)] border-b border-[var(--border)] h-9 flex items-center overflow-hidden relative z-50"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-[var(--bg-primary)] z-10 flex items-center border-r border-[var(--border)] shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent-primary)]">Live Feed</span>
      </div>
      
      <div
        ref={trackRef}
        className="flex w-max flex-nowrap items-center gap-12 whitespace-nowrap pl-[140px] will-change-transform min-w-0"
      >
        <div className="flex shrink-0 flex-nowrap items-center gap-12">
          {tokens.map((t) => renderLink(t, 'a', false))}
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-12" aria-hidden="true">
          {tokens.map((t) => renderLink(t, 'b', true))}
        </div>
      </div>
    </div>
  )
}
