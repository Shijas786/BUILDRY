'use client'

import React from 'react'
import BuilderCards from './BuilderCards'
import mockProfiles from '@/lib/mockProfiles.json'

function RightRail() {
  const sortedProfiles = [...mockProfiles].sort((a, b) => {
    const aScore =
      a.builder_score?.points ||
      (a.scores && (a.scores.find((s: any) => s.slug === 'builder_score_2025')?.points || 0)) ||
      0
    const bScore =
      b.builder_score?.points ||
      (b.scores && (b.scores.find((s: any) => s.slug === 'builder_score_2025')?.points || 0)) ||
      0
    return bScore - aScore
  })

  const topBuilders = sortedProfiles.slice(0, 4).map((p) => ({
    name: p.display_name || p.name || 'Builder',
    avatar: p.image_url || '',
    amount: '$ 3k',
  }))

  const updates = sortedProfiles.slice(4, 8).map((p, i) => ({
    name: p.display_name || p.name || `Builder-${i + 1}`,
    text: i % 2 === 0 ? 'shipped module v3.1' : 'new grant approved',
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
              <div key={i} className="flex items-center justify-between group cursor-pointer transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg font-black">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight max-w-[140px] truncate">
                      {p.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-tight mt-0.5">
                      Decentralized Node
                    </p>
                  </div>
                </div>
                <div className="text-[12px] font-black text-slate-900 tabular-nums italic font-mono whitespace-nowrap">
                  {p.amount}
                </div>
              </div>
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

export default function HomepageBuilderShowcase() {
  return (
    <section className="max-w-[1600px] mx-auto px-8 lg:px-12 pb-24">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,320px] gap-14 items-start">
        <div className="space-y-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between px-6 border-l-4 border-slate-900 py-2 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">
                Top Builders Right Now
              </h2>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.28rem] font-mono">
                Ranked by onchain reputation — not followers
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                  Live Feed Active
                </p>
              </div>
              <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.24em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/10 active:scale-95">
                Explore Map
              </button>
            </div>
          </div>

          <div className="px-1">
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
              {['All Builders', 'Top Score', 'New Launches', 'Open for Work', 'Trending Tokens'].map(
                (tab, i) => (
                  <button
                    key={tab}
                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                      i === 0
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                )
              )}
            </div>
            <BuilderCards />
          </div>
        </div>

        <RightRail />
      </div>
    </section>
  )
}

