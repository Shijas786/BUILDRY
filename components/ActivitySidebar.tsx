'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import mockProfiles from '@/lib/mockProfiles.json'

export default function ActivitySidebar() {
  const [activity, setActivity] = useState<any[]>([])
  const [earners, setEarners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fadeIndex, setFadeIndex] = useState(0)
  const [isOnboarded, setIsOnboarded] = useState(false)

  const seedData = () => {
    // Top earners (builders with scores)
    const sortedByScore = [...mockProfiles].sort((a, b) => {
      const aScore = a.builder_score?.points || (a.scores && (a.scores.find((s: any) => s.slug === 'builder_score_2025')?.points || 0)) || 0
      const bScore = b.builder_score?.points || (b.scores && (b.scores.find((s: any) => s.slug === 'builder_score_2025')?.points || 0)) || 0
      return bScore - aScore
    })

    const earnersList = sortedByScore.slice(0, 4).map((p, i) => {
      const score = p.builder_score?.points || (p.scores && (p.scores.find((s: any) => s.slug === 'builder_score_2025')?.points || 0)) || 0
      return {
        id: p.id,
        name: p.display_name || p.name || `Node-${p.id.slice(0, 4).toUpperCase()}`,
        amount: Math.floor(100 + (score * 8)),
        currency: 'USDC',
        img: p.image_url || `https://i.pravatar.cc/150?u=${p.id}`
      }
    })
    setEarners(earnersList)

    // Activity (shuffling some real data)
    const activityList = mockProfiles.slice(4, 8).map((p, i) => {
      return {
        id: p.id,
        user: p.display_name || p.name || `Node-${p.id.slice(0, 4).toUpperCase()}`,
        handle: p.name || p.id.slice(0, 6),
        time: `${Math.floor(Math.random() * 59)}m`,
        action: i % 2 === 0 ? 'just submitted a bounty' : 'just shipped a module',
        img: p.image_url || `https://i.pravatar.cc/150?u=${p.id}`
      }
    })
    setActivity(activityList)
    setLoading(false)
  }

  useEffect(() => {
    const onboarded = localStorage.getItem('buildry_onboarded') === 'true'
    setIsOnboarded(onboarded)
    seedData()

    const interval = setInterval(() => {
      setFadeIndex((prev) => (prev + 1) % 4)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white border-l border-slate-100 h-full p-6 animate-pulse space-y-12">
        <div className="h-10 w-2/3 bg-slate-50 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-slate-50 rounded-2xl" />
          <div className="h-20 bg-slate-50 rounded-2xl" />
        </div>
        <div className="space-y-6">
          {[1,2,3,4].map(i => (
             <div key={i} className="flex gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-full" />
                <div className="flex-1 space-y-2">
                   <div className="h-3 w-1/2 bg-slate-50 rounded" />
                   <div className="h-2 w-1/4 bg-slate-50 rounded" />
                </div>
             </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-l border-slate-100 h-full flex flex-col overflow-hidden">
      {/* Profile Header / Guest CTA */}
      <div className="p-6 border-b border-slate-50">
        {isOnboarded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
                <img src="https://i.pravatar.cc/150?u=shijas" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-slate-800">Shijas</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-blue-600">4 Points</span>
                  <div className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black">$290</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-lg">
                ?
              </div>
              <div>
                <div className="text-sm font-black text-slate-400">Guest User</div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Not Joined</div>
              </div>
            </div>
            <Link 
              href="/signup" 
              className="w-full py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl text-center shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all font-mono"
            >
              Setup Profile
            </Link>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-10">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-mono">$</div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol</span>
            </div>
            <div className="text-sm font-black text-slate-800 tabular-nums">11.3M USD</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xs">💼</div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ops</span>
            </div>
            <div className="text-sm font-black text-slate-800 tabular-nums">2,689</div>
          </div>
        </div>

        {/* Reputation Leaders / Earners */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Earners</h3>
            <button className="text-[10px] font-black text-blue-600 hover:underline">Leaderboard →</button>
          </div>
          <div className="space-y-4">
            {earners.map((e) => (
              <div key={e.id} className="flex items-center justify-between group cursor-pointer transition-transform hover:translate-x-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-100 shadow-sm bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300">
                    {e.img.includes('pravatar') ? e.name[0] : <img src={e.img} alt={e.name} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800 truncate max-w-[100px]">{e.name}</div>
                    <div className="text-[9px] font-medium text-slate-400">Builder Node Verified</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-black font-mono">$</div>
                  <span className="text-xs font-black text-slate-800 tabular-nums">{e.amount}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{e.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
            <button className="text-[10px] font-black text-blue-600 hover:underline">View All →</button>
          </div>
          <div className="space-y-6">
            {activity.map((a, i) => (
              <div 
                key={a.id} 
                className={`flex items-start gap-3 transition-opacity duration-1000 ${i === fadeIndex ? 'opacity-100' : 'opacity-60'}`}
              >
                <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-slate-50 shrink-0 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase">
                  {a.img.includes('pravatar') ? a.user[0] : <img src={a.img} alt={a.user} className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-black text-slate-800 truncate max-w-[80px]">{a.user}</span>
                    <span className="text-[10px] font-medium text-slate-400 truncate">@{a.handle}</span>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">· {a.time}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 leading-tight">
                    {a.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-all shadow-sm font-mono">
          Privacy Settings
        </button>
      </div>
    </div>
  )
}
