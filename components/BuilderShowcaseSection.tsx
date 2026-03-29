'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import BuilderCards from './BuilderCards'
import mockProfiles from '@/lib/mockProfiles.json'
import type { ExploreBuilderPublic } from '@/lib/exploreBuilders'

type RailRow = ExploreBuilderPublic | (typeof mockProfiles)[number]

function scoreFromExploreRow(p: RailRow): number {
  const x = p as ExploreBuilderPublic & { scores?: { slug?: string; points?: number }[] }
  return (
    x.builder_score?.points ||
    (x.scores && (x.scores.find((s) => s.slug === 'builder_score_2025')?.points || 0)) ||
    0
  )
}

function railDisplayName(p: RailRow): string {
  const d = (p as { display_name?: string }).display_name
  const n = (p as { name?: string }).name
  return (typeof d === 'string' && d.trim()) || (typeof n === 'string' && n.trim()) || 'Builder'
}

function railProfileHref(p: RailRow): string {
  if ('profileHref' in p && typeof (p as ExploreBuilderPublic).profileHref === 'string') {
    return (p as ExploreBuilderPublic).profileHref
  }
  const slug = String((p as { name?: string }).name || '').replace(/^@/, '')
  return `/builder/${encodeURIComponent(slug)}`
}

function RightRail({ firestoreBuilders }: { firestoreBuilders: ExploreBuilderPublic[] }) {
  const mockOnly = mockProfiles.filter((m) => {
    const h = String(m.name || '').trim().toLowerCase()
    return h && !firestoreBuilders.some((f) => f.name.trim().toLowerCase() === h)
  })
  const merged = [...firestoreBuilders, ...mockOnly].sort(
    (a, b) => scoreFromExploreRow(b) - scoreFromExploreRow(a)
  )
  const sortedForRail: RailRow[] =
    merged.length > 0
      ? merged
      : [...mockProfiles].sort((a, b) => scoreFromExploreRow(b) - scoreFromExploreRow(a))

  const topBuilders = sortedForRail.slice(0, 4).map((p) => ({
    name: railDisplayName(p),
    avatar: (p as { image_url?: string }).image_url || '',
    amount: '$ 3k',
    href: railProfileHref(p),
  }))

  const updates = sortedForRail.slice(4, 8).map((p, i) => ({
    name: railDisplayName(p),
    text: i % 2 === 0 ? 'Updated profile on Buildry' : 'Joined the talent board',
    time: `${24 + i * 7}m`,
  }))

  return (
    <aside className="w-[320px] h-fit sticky top-[120px] border border-slate-100 bg-white p-8 rounded-[32px] hidden xl:block shadow-[0_8px_40px_-12px_rgba(0,0,0,0.03)]">
      <div className="space-y-12">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] mb-8 px-1 border-l-2 border-slate-900 pl-3">
            Top Builders
          </h3>
          <div className="space-y-6">
            {topBuilders.map((p, i) => (
              <Link
                key={`${p.href}-${i}`}
                href={p.href}
                className="flex items-center justify-between group cursor-pointer transition-all hover:opacity-90"
              >
                <div className="flex items-center gap-5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg font-black">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight max-w-[140px] truncate">
                      {p.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight mt-0.5">
                      Buildry builder
                    </p>
                  </div>
                </div>
                <div className="text-[12px] font-black text-slate-900 tabular-nums italic font-mono whitespace-nowrap shrink-0">
                  {p.amount}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] mb-8 px-1 border-l-2 border-slate-900 pl-3">
            Updates
          </h3>
          <div className="space-y-6">
            {updates.map((a, i) => (
              <div key={i} className="flex gap-5 group py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-2 shrink-0 group-hover:bg-blue-400 transition-colors" />
                <div className="min-w-0">
                  <h4 className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tight font-mono">
                    {a.name}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 leading-tight mt-1.5">
                    {a.text} <span className="mx-1 opacity-30">•</span> {a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

export type BuilderShowcaseSectionProps = {
  title?: string
  subtitle?: string
  showRightRail?: boolean
  cta?: { href: string; label: string } | null
}

export default function BuilderShowcaseSection({
  title = 'Top Builders Right Now',
  subtitle = 'Ranked by onchain reputation — not followers',
  showRightRail = true,
  cta = { href: '/explore', label: 'Explore Map' },
}: BuilderShowcaseSectionProps) {
  const [exploreBuilders, setExploreBuilders] = useState<ExploreBuilderPublic[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/explore/builders')
      .then((r) => r.json())
      .then((j: { builders?: ExploreBuilderPublic[] }) => {
        if (cancelled) return
        setExploreBuilders(Array.isArray(j.builders) ? j.builders : [])
      })
      .catch(() => {
        if (!cancelled) setExploreBuilders([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="max-w-[1600px] mx-auto px-8 lg:px-12 pb-24">
      <div
        className={`grid grid-cols-1 gap-14 items-start ${showRightRail ? 'xl:grid-cols-[1fr,320px]' : ''}`}
      >
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-6 border-l-4 border-slate-900 py-2 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                {title}
              </h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.28rem] font-mono">
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                  Live Feed Active
                </p>
              </div>
              {cta ? (
                <Link
                  href={cta.href}
                  className="inline-flex items-center justify-center bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.24em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/10 active:scale-95"
                >
                  {cta.label}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="px-1">
            <div className="flex gap-3 mb-5 overflow-x-auto pb-2">
              {['All Builders', 'Top Score', 'New Launches', 'Open for Work', 'Trending Tokens'].map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                    i === 0
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <BuilderCards firestoreBuilders={exploreBuilders} />
          </div>
        </div>

        {showRightRail ? <RightRail firestoreBuilders={exploreBuilders} /> : null}
      </div>
    </section>
  )
}
