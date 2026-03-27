'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

type SortOption = 'newest' | 'score' | 'backers'

export default function DiscoveryFeed() {
  const [items, setItems] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('score')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDiscovery() {
      setLoading(true)
      try {
        const res = await fetch('/api/discovery')
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setItems(data)
      } catch (err) {
        console.error('Failed to fetch discovery feed:', err)
        // Fallback to empty or handled error state
      } finally {
        setLoading(false)
      }
    }
    fetchDiscovery()
  }, [])

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'score') return (b.score || 0) - (a.score || 0)
    if (sortBy === 'backers') return (b.holders || 0) - (a.holders || 0)
    // For 'newest', if we have no creation date, we maintain initial order
    return 0
  })

  return (
    <section id="feed" className="py-8">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-50 rounded-3xl h-[280px] animate-pulse border border-slate-100"></div>
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-slate-900 font-black text-sm uppercase tracking-widest">No Builders Found</div>
          <div className="text-slate-400 text-xs mt-2">Check your API keys or try again later.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item, i) => (
            <Link 
              href={`/token/${item.mint}`} 
              key={item.mint || i}
              className="group bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-[0_12px_40px_rgba(37,99,235,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col h-full"
            >
              {/* Score Badge */}
              <div className="absolute top-4 right-4 z-10 bg-slate-50 border border-slate-100 text-slate-800 text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.verified ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                REPU {item.score || 'N/A'}
              </div>

              {/* Header: Builder Info */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 shrink-0 bg-slate-50 shadow-inner">
                  <img src={item.avatar || `https://unavatar.io/twitter/${item.builderUsername}`} alt={item.builderName} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition-colors truncate">{item.builderName}</h3>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">@{item.builderUsername}</div>
                </div>
              </div>

              {/* Project Card (Live Token Data) */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-auto">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{item.symbol || 'BUILDER'}</div>
                  {item.priceChange24h !== 0 && (
                    <div className={`text-[9px] font-black ${item.priceChange24h > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.priceChange24h > 0 ? '↑' : '↓'} {Math.abs(item.priceChange24h).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-black text-slate-800 text-sm line-clamp-1">{item.name}</div>
                  <div className="flex items-center gap-1 bg-blue-100/50 border border-blue-200/50 px-1.5 py-0.5 rounded-md">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">Bags Verified</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 mt-5 pt-5 border-t border-slate-50">
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</div>
                  <div className="font-black text-slate-900 text-xs">${Number(item.price).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Backers</div>
                  <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    {item.holders || item.backerCount || 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
