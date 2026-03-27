'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ExplorePage() {
  const [builders, setBuilders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/talent/top-builders')
      .then(r => r.json())
      .then(data => setBuilders(Array.isArray(data) ? data : []))
      .catch(() => setBuilders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Explore Builders</h1>
          <p className="text-xs text-slate-400 mt-1">Discover top-ranked builders by reputation score</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 rounded-2xl skeleton" />)}
          </div>
        ) : builders.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-black text-slate-200 mb-2">No builders found</h3>
            <p className="text-sm text-slate-300">Check back later or connect your APIs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {builders.map((b: any, i: number) => (
              <Link
                key={b.id || i}
                href={`/profile/${b.username || b.id}`}
                className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {b.avatar ? (
                      <img src={b.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-slate-300">{(b.name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{b.name || 'Builder'}</p>
                    <p className="text-[10px] text-slate-400 truncate">@{b.username || 'unknown'}</p>
                  </div>
                </div>
                {b.score > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Score</span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">{b.score}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
