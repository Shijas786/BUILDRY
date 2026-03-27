'use client'

import React, { useEffect, useState } from 'react'
import { TrustTier } from '@/lib/trust'
import SkeletonCard from './SkeletonCard'

interface AiRiskBriefProps {
  mint: string
  name: string
  symbol: string
  wallet: string
  tier: TrustTier
  builderScore?: number | null
  reliabilityScore?: number | null
}

export default function AiRiskBrief({
  mint, name, symbol, wallet, tier, builderScore, reliabilityScore
}: AiRiskBriefProps) {
  const [brief, setBrief] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mint) return
    setLoading(true)
    setBrief(null)

    const params = new URLSearchParams({
      name, symbol, wallet, tier,
      ...(builderScore != null ? { builderScore: String(builderScore) } : {}),
      ...(reliabilityScore != null ? { reliabilityScore: String(reliabilityScore) } : {}),
    })

    fetch(`/api/risk/${mint}?${params}`)
      .then(r => r.json())
      .then(data => {
        setBrief(data.brief || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [mint, tier])

  return (
    <div style={{ marginTop: 4 }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/30 rounded-full px-2 py-0.5 text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest shadow-[0_0_10px_rgba(0,212,255,0.1)]">
          CHAINGPT AI
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Risk Brief</span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 opacity-40">
          <SkeletonCard height={12} />
          <SkeletonCard height={12} />
          <div className="skeleton h-3 w-3/4 rounded-lg bg-[var(--bg-tertiary)]" />
        </div>
      ) : brief ? (
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed italic font-medium">"{brief}"</p>
      ) : (
        <p className="text-xs text-[var(--text-muted)] font-medium italic">
          Unable to generate risk assessment.
        </p>
      )}
    </div>
  )
}
