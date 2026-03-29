'use client'

import React from 'react'
import PostComposer from '@/components/PostComposer'
import FeedList from '@/components/FeedList'
import { useAuth } from '@/context/AuthProvider'
import { useRoleStore } from '@/store/role'
import Link from 'next/link'

export default function FeedPage() {
  const { user } = useAuth()
  const { activeRole } = useRoleStore()
  const [refreshKey, setRefreshKey] = React.useState(0)

  return (
    <div className="min-h-screen bg-slate-50/40">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Live Network Feed</h1>
            <p className="text-xs text-slate-400 mt-1">Real updates from builders, founders, and investors in one stream.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Real-time</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-6 items-start">
          {/* LEFT: Updates stream */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {activeRole === 'developer' && (
                <>
                  <QuickAction href="/jobs" label="Browse Jobs" desc="Find your next gig" />
                  <QuickAction href="/explore" label="Explore Builders" desc="Connect with devs" />
                </>
              )}
              {activeRole === 'founder' && (
                <>
                  <QuickAction href="/launch" label="Launch Token" desc="Deploy on Bags" />
                  <QuickAction href="/jobs" label="Hire Talent" desc="Find builders" />
                </>
              )}
              {activeRole === 'investor' && (
                <>
                  <QuickAction href="/invest" label="Invest & Trade" desc="Discover live deals" />
                  <QuickAction href="/projects" label="Portfolio" desc="Track backed projects" />
                </>
              )}
              {activeRole === 'recruiter' && (
                <>
                  <QuickAction href="/jobs/new" label="Post Job" desc="Find talent fast" />
                  <QuickAction href="/explore" label="Talent Board" desc="Browse builders" />
                </>
              )}
            </div>

            <PostComposer onPostCreated={() => setRefreshKey((k) => k + 1)} />
            <FeedList key={refreshKey} />
          </div>

          {/* RIGHT: Profiles rail */}
          <RightProfilesRail />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group"
    >
      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{label}</p>
      <p className="text-[10px] text-slate-300 mt-0.5">{desc}</p>
    </Link>
  )
}

function RightProfilesRail() {
  const [builders, setBuilders] = React.useState<any[]>([])
  const [tokens, setTokens] = React.useState<any[]>([])
  const [loadingBuilders, setLoadingBuilders] = React.useState(true)
  const [loadingTokens, setLoadingTokens] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/talent/top-builders')
      .then((r) => r.json())
      .then((data) => setBuilders(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => setBuilders([]))
      .finally(() => setLoadingBuilders(false))

    fetch('/api/tokens/trending')
      .then((r) => r.json())
      .then((data) => setTokens(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setTokens([]))
      .finally(() => setLoadingTokens(false))
  }, [])

  return (
      <aside className="xl:sticky xl:top-6 space-y-4">
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Founders & Builders</h3>
          <Link href="/explore" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800">
            View all
          </Link>
        </div>

        {loadingBuilders ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl skeleton" />
            ))}
          </div>
        ) : builders.length === 0 ? (
          <p className="text-xs text-slate-300">No builders available right now.</p>
        ) : (
          <div className="space-y-2">
            {builders.map((b, i) => (
              <Link
                key={b.id || i}
                href={`/profile/${b.username || b.id || 'builder'}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  {b.avatar ? (
                    <img src={b.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-slate-300">
                      {(b.name || 'B').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {b.name || 'Builder'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">@{b.username || 'unknown'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Score</p>
                  <p className="text-xs font-black text-slate-900 tabular-nums">{b.score || 0}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4">Live Movers</h3>
        {loadingTokens ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg skeleton" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-xs text-slate-300">No token data.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((t, i) => (
              <Link
                key={t.mint || i}
                href={`/token/${t.mint}`}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{t.symbol || 'TOKEN'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{t.name || ''}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-black text-slate-900 tabular-nums">
                    ${Number(t.price || 0).toFixed(4)}
                  </p>
                  <p
                    className={`text-[10px] font-bold tabular-nums ${
                      Number(t.priceChange24h || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {Number(t.priceChange24h || 0) >= 0 ? '+' : ''}
                    {Number(t.priceChange24h || 0).toFixed(1)}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
