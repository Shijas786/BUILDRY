'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import mockProfiles from '@/lib/mockProfiles.json'
import mockProjects from '@/lib/mockProjects.json'
import type { ExploreBuilderPublic } from '@/lib/exploreBuilders'

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
  token: { name: string; price: string; change: string } | null
  stats: { contracts: number; projects: number; reviews: number }
  project?: { name: string; description?: string }
  profileHref: string
  bannerUrl?: string
}

type ExploreOrMock = ExploreBuilderPublic | (typeof mockProfiles)[number]

function mergeProfilesForExplore(
  firestore: ExploreBuilderPublic[],
  mock: typeof mockProfiles
): ExploreOrMock[] {
  const seen = new Set(firestore.map((p) => p.name.trim().toLowerCase()))
  const rest = mock.filter((p) => {
    const h = String(p.name || '').trim().toLowerCase()
    return h && !seen.has(h)
  })
  return [...firestore, ...rest]
}

export default function BuilderCards({ firestoreBuilders }: { firestoreBuilders?: ExploreBuilderPublic[] }) {
  const [builders, setBuilders] = useState<BuilderCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [startIndex, setStartIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const transformProfiles = (profiles: ExploreOrMock[]) => {
    return profiles.map((p: any, i: number) => {
      const name = p.display_name || p.name || `Node-${String(p.id).slice(0, 4).toUpperCase()}`
      const username = p.name || String(p.id).slice(0, 8)
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      const bgs = ['bg-slate-900', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-rose-600']

      const scoreData = p.builder_score || (p.scores && p.scores.find((s: any) => s.slug === 'builder_score_2025'))
      const score = scoreData ? scoreData.points : 0

      const status = score > 50 ? 'LEGEND' : score > 20 ? 'ELITE' : 'RISING'
      const statusColor = score > 50 ? 'text-amber-500' : score > 20 ? 'text-blue-500' : 'text-purple-500'

      const projectMatch = mockProjects.find((mp) => mp.creator === name || mp.creator === p.name)

      const profileHref =
        typeof p.profileHref === 'string' && p.profileHref.startsWith('/')
          ? p.profileHref
          : `/builder/${String(username).replace(/^@/, '')}`

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
        skills:
          profileHref.startsWith('/profile/') && p.tags && p.tags.length > 0
            ? p.tags.slice(0, 5)
            : ['React', 'Solidity', 'Go', 'Rust'].slice(0, 2 + (i % 3)),
        token:
          profileHref.startsWith('/profile/')
            ? null
            : i % 2 === 0
              ? { name: `$${String(username).toUpperCase().slice(0, 4)}`, price: '$0.0084', change: '+12.4%' }
              : null,
        stats: {
          contracts: 5 + (i % 15),
          projects: projectMatch ? 1 : 2 + (i % 8),
          reviews: 4.5 + ((i * 7) % 10) / 10,
        },
        project: projectMatch ? { name: projectMatch.name } : undefined,
        profileHref,
        bannerUrl:
          typeof p.banner_url === 'string' && p.banner_url.trim().length > 8 ? p.banner_url.trim() : undefined,
      }
    })
  }

  const mergedSource = useMemo(() => {
    const fs = firestoreBuilders ?? []
    return mergeProfilesForExplore(fs, mockProfiles)
  }, [firestoreBuilders])

  useEffect(() => {
    setLoading(true)
    const cards = transformProfiles(mergedSource)
    setBuilders(cards)
    setLoading(false)
  }, [mergedSource])

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-50/40 rounded-3xl p-5 border border-slate-100/50 animate-pulse min-h-[380px]"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="w-12 h-12 rounded-full bg-slate-100" />
              <div className="w-16 h-8 bg-slate-100 rounded-md" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-1/2 bg-slate-100 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
              <div className="h-14 w-full bg-slate-100 rounded-xl" />
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
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-20 flex justify-between pointer-events-none px-1 lg:-mx-8">
        <button
          onClick={prev}
          type="button"
          className="text-slate-300 hover:text-blue-600 transition-all pointer-events-auto active:scale-90 p-2"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={next}
          type="button"
          className="text-slate-300 hover:text-blue-600 transition-all pointer-events-auto active:scale-90 p-2"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="overflow-hidden">
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 transition-transform duration-500 ease-out"
          style={{ 
            opacity: isAnimating ? 0.95 : 1,
            transform: isAnimating ? 'scale(0.995)' : 'scale(1)'
          }}
        >
          {visibleItems.map((b, i) => (
            <div
              key={`${b.id}-${startIndex}-${i}`}
              className="bg-slate-50/40 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-100/50 hover:bg-white transition-all duration-500 hover:shadow-lg hover:shadow-slate-900/5 group/card min-h-0 flex flex-col animate-fade-in"
            >
              {b.bannerUrl ? (
                <div className="relative h-24 w-full shrink-0 bg-gradient-to-br from-slate-200 to-slate-300">
                  <img
                    src={b.bannerUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/10 to-transparent" />
                </div>
              ) : null}

              <div className={`flex flex-col flex-1 px-5 pb-5 pt-5 ${b.bannerUrl ? 'pt-2' : ''}`}>
                <div className={`flex justify-between items-start mb-4 ${b.bannerUrl ? '-mt-8 relative z-10' : ''}`}>
                  <div
                    className={`w-12 h-12 rounded-full ${b.avatarBg} flex items-center justify-center text-white text-sm font-black shadow-md overflow-hidden ring-2 ring-white`}
                  >
                    {b.avatar ? <img src={b.avatar} alt={b.name} className="w-full h-full object-cover" /> : b.initials}
                  </div>
                  <div className={`text-right ${b.bannerUrl ? 'drop-shadow-sm' : ''}`}>
                    <p
                      className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${b.bannerUrl ? 'text-white/90' : b.statusColor}`}
                    >
                      {b.status}
                    </p>
                    <div
                      className={`text-3xl font-black tracking-tighter leading-none tabular-nums ${b.bannerUrl ? 'text-white' : 'text-slate-900'}`}
                    >
                      {b.score}
                    </div>
                    <p
                      className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${b.bannerUrl ? 'text-white/70' : 'text-slate-400'}`}
                    >
                      Score
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="text-base font-black text-slate-900 uppercase tracking-tight mb-0.5 truncate">{b.name}</h4>
                  <p className="text-[11px] font-bold text-slate-400 mb-3">{b.handle}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {b.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[12px] font-medium text-slate-600 leading-snug min-h-[2.5rem] line-clamp-2">{b.bio}</p>

                  {b.project && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Project
                      </span>
                      <span className="text-[10px] font-bold text-slate-900 truncate">{b.project.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {b.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-100 text-slate-500"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-auto border-t border-slate-100 pt-4">
                  {b.token ? (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-black text-slate-900 font-mono">{b.token.name}</span>
                      <span className="text-slate-200">•</span>
                      <span className="text-[10px] font-black text-slate-400 font-mono">{b.token.price}</span>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded ml-auto">
                        {b.token.change}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-4 text-[9px] font-black text-slate-300 uppercase tracking-wider italic font-mono">
                      No Token Yet
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-left">
                      <p className="text-base font-black text-slate-900 font-mono tabular-nums">{b.stats.contracts}</p>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Contracts</p>
                    </div>
                    <div className="text-left">
                      <p className="text-base font-black text-slate-900 font-mono tabular-nums">{b.stats.projects}</p>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Projects</p>
                    </div>
                    <div className="text-left">
                      <p className="text-base font-black text-slate-900 font-mono italic tabular-nums">
                        {b.stats.reviews.toFixed(1)}
                      </p>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Rating</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={b.profileHref}
                      className="bg-white border border-slate-100 text-slate-900 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center justify-center font-mono"
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      className="bg-slate-900 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-blue-600 transition-all shadow-md shadow-slate-900/10 active:scale-95 whitespace-nowrap font-mono"
                    >
                      {b.token ? `Buy ${b.token.name}` : 'Hire Builder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-2 mt-8 px-8">
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
