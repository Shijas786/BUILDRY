'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getTopProfiles } from '@/lib/talent'
import mockProfiles from '@/lib/mockProfiles.json'
import mockProjects from '@/lib/mockProjects.json'

interface BuilderCardData {
  id: string | number
  name: string
  handle: string
  initials: string
  avatarBg: string
  avatar?: string
  score: number
  status: string
  statusColor: string
  tags: string[]
  bio: string
  skills: string[]
  token: { name: string, price: string, change: string } | null
  stats: { contracts: number, projects: number, reviews: number }
  project?: { name: string, description?: string }
}

export default function BuilderCards() {
  const [builders, setBuilders] = useState<BuilderCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [startIndex, setStartIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const transformProfiles = (profiles: any[]) => {
    return profiles.map((p, i) => {
      const name = p.display_name || p.name || `Node-${p.id.slice(0, 4).toUpperCase()}`
      const username = p.name || p.id.slice(0, 8)
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      const bgs = ['bg-slate-900', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-rose-600']
      
      const scoreData = p.builder_score || (p.scores && p.scores.find((s: any) => s.slug === 'builder_score_2025'))
      const score = scoreData ? scoreData.points : 0
      
      const status = score > 50 ? 'LEGEND' : score > 20 ? 'ELITE' : 'RISING'
      const statusColor = score > 50 ? 'text-amber-500' : score > 20 ? 'text-blue-500' : 'text-purple-500'

      // Find project match
      const projectMatch = mockProjects.find(mp => mp.creator === name || mp.creator === p.name)
      
      return {
        id: p.id || i,
        name,
        handle: `@${username}`,
        initials,
        avatarBg: bgs[i % bgs.length],
        avatar: p.image_url,
        score,
        status,
        statusColor,
        tags: p.tags && p.tags.length > 0 ? p.tags.slice(0, 3) : ['GitHub', 'Verified', 'Dev'].slice(0, 1 + (i % 3)),
        bio: p.bio || 'Verified Web3 builder with proven on-chain impact and high-velocity shipping history.',
        skills: ['React', 'Solidity', 'Go', 'Rust'].slice(0, 2 + (i % 3)),
        token: i % 2 === 0 ? { name: `$${username.toUpperCase().slice(0, 4)}`, price: '$0.0084', change: '+12.4%' } : null,
        stats: { 
          contracts: 5 + (i % 15), 
          projects: projectMatch ? 1 : (2 + (i % 8)), 
          reviews: 4.5 + (Math.random() * 0.5) 
        },
        project: projectMatch ? { name: projectMatch.name } : undefined
      }
    })
  }

  const fetchBuilders = async () => {
    // Start with seeded mock data to ensure immediate UI
    const seeded = transformProfiles(mockProfiles)
    setBuilders(seeded)
    setLoading(false)

    // Then try to fetch live data to update
    try {
      const liveProfiles = await getTopProfiles(20)
      if (liveProfiles && liveProfiles.length > 0) {
        // Transform the TalentProfile interface from lib/talent back to local structure or vice-versa
        // Actually, we'll stick to mockProfiles for stability as requested by the user
      }
    } catch (err) {
      console.error('Initial fetch failed, using seeded data')
    }
  }

  useEffect(() => {
    fetchBuilders()
  }, [])

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(next, 7000)
  }

  useEffect(() => {
    if (builders.length > 0) {
      resetTimer()
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [builders])

  const next = () => {
    if (builders.length === 0) return
    setIsAnimating(true)
    setStartIndex((prev) => (prev + 1) % builders.length)
    resetTimer()
    setTimeout(() => setIsAnimating(false), 500)
  }

  const prev = () => {
    if (builders.length === 0) return
    setIsAnimating(true)
    setStartIndex((prev) => (prev - 1 + builders.length) % builders.length)
    resetTimer()
    setTimeout(() => setIsAnimating(false), 500)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-50/40 rounded-[48px] p-10 border border-slate-100/50 animate-pulse min-h-[580px]">
            <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 rounded-full bg-slate-100" />
              <div className="w-20 h-10 bg-slate-100 rounded-lg" />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-1/2 bg-slate-100 rounded" />
              <div className="h-4 w-1/3 bg-slate-100 rounded" />
              <div className="h-20 w-full bg-slate-100 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Double the list to support seamless wrapping
  const displayItems = [...builders, ...builders]
  const visibleItems = displayItems.slice(startIndex, startIndex + 3)

  return (
    <div className="relative w-full group/main px-4">
      {/* Absolute Arrows */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-20 flex justify-between pointer-events-none px-2 lg:-mx-12">
        <button 
          onClick={prev} 
          className="text-slate-300 hover:text-blue-600 transition-all pointer-events-auto active:scale-90 p-4"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button 
          onClick={next} 
          className="text-slate-300 hover:text-blue-600 transition-all pointer-events-auto active:scale-90 p-4"
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="overflow-hidden">
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 transition-transform duration-500 ease-out"
          style={{ 
            opacity: isAnimating ? 0.95 : 1,
            transform: isAnimating ? 'scale(0.995)' : 'scale(1)'
          }}
        >
          {visibleItems.map((b, i) => (
            <div 
              key={`${b.id}-${startIndex}-${i}`} 
              className="bg-slate-50/40 backdrop-blur-sm rounded-[48px] p-10 border border-slate-100/50 hover:bg-white transition-all duration-500 hover:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.06)] group/card min-h-[580px] flex flex-col animate-fade-in"
            >
              <div className="flex justify-between items-start mb-10">
                <div className={`w-16 h-16 rounded-full ${b.avatarBg} flex items-center justify-center text-white text-xl font-black shadow-lg ring-4 ring-white overflow-hidden`}>
                  {b.avatar ? <img src={b.avatar} alt={b.name} className="w-full h-full object-cover" /> : b.initials}
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${b.statusColor}`}>{b.status}</p>
                  <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none">{b.score}</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Builder Score</p>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1 truncate">{b.name}</h4>
                <p className="text-[12px] font-bold text-slate-400 mb-6">{b.handle}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {b.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-sm">{tag}</span>
                  ))}
                </div>
                <p className="text-[13px] font-medium text-slate-600 leading-relaxed min-h-[3.2rem] line-clamp-2">{b.bio}</p>
                
                {/* Featured Project */}
                {b.project && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Project</span>
                    <span className="text-[11px] font-bold text-slate-900 truncate">{b.project.name}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-10">
                {b.skills.map(skill => (
                  <span key={skill} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white border border-slate-100 text-slate-400">{skill}</span>
                ))}
              </div>

              <div className="mt-auto border-t border-slate-100 pt-8">
                {b.token ? (
                  <div className="flex items-center gap-2 mb-10">
                    <span className="text-[11px] font-black text-slate-900 font-mono">{b.token.name}</span>
                    <span className="text-slate-200">•</span>
                    <span className="text-[11px] font-black text-slate-400 font-mono">{b.token.price}</span>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-lg ml-auto">{b.token.change}</span>
                  </div>
                ) : (
                  <div className="mb-10 text-[11px] font-black text-slate-300 uppercase tracking-widest italic font-mono">No Token Yet</div>
                )}

                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="text-left">
                    <p className="text-xl font-black text-slate-900 font-mono">{b.stats.contracts}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Contracts</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-slate-900 font-mono">{b.stats.projects}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Projects</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-slate-900 font-mono italic">{b.stats.reviews.toFixed(1)}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Rating</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    href={`/builder/${b.handle.replace('@', '')}`}
                    className="bg-white border border-slate-100 text-slate-900 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center justify-center font-mono"
                  >
                    Profile
                  </Link>
                  <button className="bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 whitespace-nowrap font-mono">
                    {b.token ? `Buy ${b.token.name}` : 'Hire Builder'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-16 px-12">
        {builders.slice(0, Math.min(builders.length, 12)).map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-700 ${startIndex === i ? 'w-10 bg-blue-600' : 'w-2 bg-slate-200'}`} 
          />
        ))}
      </div>
    </div>
  )
}
