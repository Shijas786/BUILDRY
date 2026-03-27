'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ConnectBridgeModal from './ConnectBridgeModal'

type Role = 'all' | 'UI/UX Designer' | 'Backend Architect' | 'Solana Specialist'

export default function BuilderSearchHub() {
  const [items, setItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('all')
  const [loading, setLoading] = useState(true)
  const [selectedBuilder, setSelectedBuilder] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleConnect = (e: React.MouseEvent, builder: any) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedBuilder(builder)
    setIsModalOpen(true)
  }

  useEffect(() => {
    async function fetchDiscovery() {
      setLoading(true)
      try {
        const url = new URL('/api/discovery', window.location.origin)
        if (searchQuery) url.searchParams.set('query', searchQuery)
        if (selectedRole !== 'all') url.searchParams.set('role', selectedRole)
        
        const res = await fetch(url)
        if (!res.ok) throw new Error('API Error')
        const data = await res.json()
        setItems(data)
      } catch (err) {
        console.error('Failed to fetch discovery feed:', err)
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchDiscovery, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedRole])

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-12">
      {/* 1. Hero Search Section */}
      {/* ... (previous search bar code) ... */}
      <div className="flex flex-col items-center mb-16">
        <div className="w-full max-w-2xl relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder="Search for Builders, Roles, Skills, Projects..." 
            className="w-full h-16 pl-16 pr-6 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-slate-800 font-medium placeholder-slate-400 transition-all text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 2. Role Selection (Discovery Cards) */}
      <div className="mb-16">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="w-12 h-[1px] bg-slate-200"></span>
          Builder Roles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RoleCard 
            title="UI/UX Designer" 
            desc="Visual systems, prototyping, interfaces" 
            count="280+ Profiles"
            icon="🎨"
            active={selectedRole === 'UI/UX Designer'}
            onClick={() => setSelectedRole(selectedRole === 'UI/UX Designer' ? 'all' : 'UI/UX Designer')}
          />
          <RoleCard 
            title="Backend Architect" 
            desc="System design, scalability, robust infra" 
            count="315+ Profiles"
            icon="⚙️"
            active={selectedRole === 'Backend Architect'}
            onClick={() => setSelectedRole(selectedRole === 'Backend Architect' ? 'all' : 'Backend Architect')}
          />
          <RoleCard 
            title="Solana Specialist" 
            desc="Web3 dApps, smart contracts, Rust" 
            count="198+ Profiles"
            icon="⛓️"
            active={selectedRole === 'Solana Specialist'}
            onClick={() => setSelectedRole(selectedRole === 'Solana Specialist' ? 'all' : 'Solana Specialist')}
          />
        </div>
      </div>

      {/* 3. Builder Profiles Grid */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="w-12 h-[1px] bg-slate-200"></span>
          {selectedRole === 'all' ? 'Top Builder Profiles' : `${selectedRole} Results`}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-3xl h-64 animate-pulse"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl mb-4">🔭</div>
            <p className="text-slate-500 font-bold">No builders found matching your criteria</p>
            <button onClick={() => {setSearchQuery(''); setSelectedRole('all')}} className="mt-4 text-blue-600 text-sm font-black uppercase tracking-widest hover:underline">Clear Filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <BuilderProfileCard key={item.mint} builder={item} onConnect={(e) => handleConnect(e, item)} />
            ))}
          </div>
        )}
      </div>

      {selectedBuilder && (
        <ConnectBridgeModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          builder={selectedBuilder} 
        />
      )}
    </div>
  )
}

function RoleCard({ title, desc, count, icon, active, onClick }: { title: string, desc: string, count: string, icon: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`group text-left p-8 rounded-3xl border transition-all duration-300 ${active ? 'bg-blue-600 border-blue-600 shadow-xl' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-inner ${active ? 'bg-white/20' : 'bg-slate-50'}`}>
        {icon}
      </div>
      <h3 className={`font-black text-lg mb-2 ${active ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'}`}>{title}</h3>
      <p className={`text-sm mb-4 leading-relaxed ${active ? 'text-blue-50' : 'text-slate-500'}`}>{desc}</p>
      <div className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-blue-200' : 'text-slate-400'}`}>{count}</div>
    </button>
  )
}

function BuilderProfileCard({ builder, onConnect }: { builder: any, onConnect: (e: React.MouseEvent) => void }) {
  return (
    <div className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden relative">
      <Link 
        href={`/token/${builder.mint}`}
        className="block"
      >
        {/* Top Section: Avatar & Score */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-50 bg-slate-100 shadow-inner group-hover:scale-105 transition-transform">
              <img src={builder.avatar} alt={builder.builderName} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 text-sm truncate">{builder.builderName}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{builder.builderUsername}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-slate-500 font-medium">{builder.location}</span>
              </div>
            </div>
          </div>
          <div className="bg-green-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(34,197,94,0.3)]">
            REPU {builder.score?.toFixed(1) || '9.2'}
          </div>
        </div>

        {/* Role & Bio */}
        <div className="mb-6">
          <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">{builder.role}</div>
          <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-8">Verified {builder.role} with {builder.holders || 20}+ active backers.</div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {builder.skills?.map((skill: string) => (
            <span key={skill} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-black text-slate-600 uppercase tracking-widest">{skill}</span>
          ))}
        </div>
      </Link>

      {/* Bottom Profile Stats & Connect Bridge */}
      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asset</span>
            <span className="font-black text-slate-900 text-xs">${builder.symbol}</span>
          </div>
          <div className="w-[1px] h-6 bg-slate-100" />
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Backers</span>
            <span className="font-black text-slate-900 text-xs">{builder.holders || 12}</span>
          </div>
        </div>
        
        <button 
          onClick={onConnect}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95"
        >
          Connect
        </button>
      </div>
    </div>
  )
}
