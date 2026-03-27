'use client'

import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import Image from 'next/image'

interface Builder {
  id: string
  name: string
  username: string
  avatar: string
  score: number
}

const SpotlightCard = ({ builder, featured = false }: { builder: Builder; featured?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-500 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 ${
        featured ? 'col-span-2 row-span-2 p-8' : 'p-6'
      }`}
    >
      {/* Spotlight Effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.08), transparent 80%)`,
        }}
      />

      <div className={`flex flex-col h-full ${featured ? 'justify-between' : 'justify-center items-center text-center'}`}>
        <div className={`relative ${featured ? 'flex items-start gap-6' : 'mb-4'}`}>
          <div className={`relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl ${featured ? 'w-24 h-24' : 'w-16 h-16'}`}>
            <Image
              src={builder.avatar || `https://i.pravatar.cc/150?u=${builder.username}`}
              alt={builder.name}
              fill
              className="object-cover"
            />
          </div>
          
          {featured && (
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">{builder.name}</h3>
              <p className="text-blue-400 font-mono text-sm">@{builder.username}</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <span className="text-xs text-white/50 uppercase tracking-wider">Builder Score</span>
                <span className="text-lg font-bold text-white">{builder.score}</span>
              </div>
            </div>
          )}
        </div>

        {!featured && (
          <>
            <h3 className="text-sm font-semibold text-white mb-0.5 truncate w-full">{builder.name}</h3>
            <p className="text-xs text-white/40 font-mono mb-3">@{builder.username}</p>
            <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <span className="text-xs font-bold text-white">{builder.score}</span>
            </div>
          </>
        )}

        {featured && (
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Rank</p>
              <p className="text-xl font-bold text-white">Top 1%</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Status</p>
              <p className="text-xl font-bold text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Verified
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuilderSpotlight() {
  const [builders, setBuilders] = useState<Builder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBuilders = async () => {
      try {
        const res = await axios.get('/api/talent/top-builders')
        setBuilders(res.data.slice(0, 5)) // We'll show 5 builders in the bento
      } catch (err) {
        console.error('Failed to fetch builders for spotlight:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchBuilders()
  }, [])

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (builders.length === 0) return null

  const sortedBuilders = [...builders].sort((a, b) => b.score - a.score)
  const featured = sortedBuilders[0]
  const others = sortedBuilders.slice(1)

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Top Builders</h2>
          <p className="text-white/50">Verified reputations from Talent Protocol</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">Updated</p>
          <p className="text-xs font-mono text-white/60">Live feed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[180px]">
        {/* Featured Builder */}
        <SpotlightCard builder={featured} featured />
        
        {/* Secondary Builders */}
        {others.map((b) => (
          <SpotlightCard key={b.id} builder={b} />
        ))}

        {/* Call to action card */}
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/[0.04] transition-colors duration-300">
           <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
             </svg>
           </div>
           <p className="text-xs font-medium text-white/30 tracking-wide">View More Builders</p>
        </div>
      </div>
    </div>
  )
}
