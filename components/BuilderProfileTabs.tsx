'use client'

import React, { useState } from 'react'
import ActivityGrid from './ActivityGrid'
import TokenTab from './TokenTab'
import LaunchTokenModal from './LaunchTokenModal'
import Link from 'next/link'

interface BuilderProfileTabsProps {
  bagsTokens: any[]
  builderName: string
  projects: any[]
  onboardingChecklist: React.ReactNode
}

export default function BuilderProfileTabs({ bagsTokens, builderName, projects, onboardingChecklist }: BuilderProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'activity' | 'token'>('projects')
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)

  const primaryToken = bagsTokens[0] ? {
    name: bagsTokens[0].name,
    symbol: bagsTokens[0].symbol,
    price: '0.0042',
    mcap: '1.2M',
    holders: bagsTokens[0].holders || '142',
    mint: bagsTokens[0].mint
  } : undefined

  return (
    <div className="xl:col-span-2 space-y-12">
      <LaunchTokenModal 
        isOpen={isLaunchModalOpen} 
        onClose={() => setIsLaunchModalOpen(false)} 
        builderName={builderName} 
      />

      {/* Tab Switcher */}
      <div className="flex items-center gap-12 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'projects' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'
          }`}
        >
          Experience <span className="ml-1 text-[9px] text-slate-300">{projects.length || 0}</span>
          {activeTab === 'projects' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 animate-in fade-in slide-in-from-left-2" />}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'activity' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'
          }`}
        >
          Activity
          {activeTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 animate-in fade-in slide-in-from-left-2" />}
        </button>
        <button
          onClick={() => setActiveTab('token')}
          className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${
            activeTab === 'token' ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'
          }`}
        >
          Token
          {activeTab === 'token' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 animate-in fade-in slide-in-from-left-2" />}
        </button>
      </div>

      {activeTab === 'projects' ? (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Verified Projects */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Verified Projects</p>
              <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-slate-900 transition-colors">Add Project +</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.length > 0 ? projects.map((project, i) => (
                <div key={i} className="group p-6 border border-slate-100 bg-white hover:border-slate-300 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🚀</div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified</span>
                  </div>
                  <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{project.name}</h4>
                  <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-4">{project.description || 'Verified project contribution on the Talent Protocol.'}</p>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    {project.website || 'talent.app'}
                  </div>
                </div>
              )) : (
                <div className="col-span-2 py-12 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No verified projects found in registry</p>
                </div>
              )}
            </div>
          </section>

          {/* Reputation Boost Card */}
          <section className="border-t border-slate-100 pt-10">
            {onboardingChecklist}
          </section>

          {/* Bags Tokens */}
          <section className="border-t border-slate-100 pt-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Active Deployments</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bagsTokens.length > 0 ? bagsTokens.map((token: any) => (
                <Link 
                  key={token.mint}
                  href={`/token/${token.mint}`}
                  className="border border-slate-100 p-6 flex items-center gap-5 hover:border-slate-300 transition-all group"
                >
                  <div className="w-14 h-14 bg-slate-50 overflow-hidden border border-slate-100">
                    <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{token.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${token.symbol} · {token.holders} Backers</p>
                  </div>
                </Link>
              )) : (
                <div className="col-span-2 py-12 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No active launches found on Bags.fm</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : activeTab === 'activity' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ActivityGrid />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <TokenTab 
            token={primaryToken} 
            onLaunchClick={() => setIsLaunchModalOpen(true)}
          />
        </div>
      )}
    </div>
  )
}
