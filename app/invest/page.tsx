'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import DealCard from '@/components/DealCard'
import GrantCard from '@/components/GrantCard'
import Link from 'next/link'

type Tab = 'deals' | 'grants' | 'tokens'
type DealFilter = 'all' | 'equity' | 'token' | 'safe' | 'convertible' | 'revenue_share'
type GrantFilter = 'all' | 'grant' | 'fellowship' | 'accelerator' | 'bounty_program'

export default function InvestPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('deals')

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: 'deals', label: 'Deals', desc: 'Invest in startups and projects' },
    { id: 'grants', label: 'Grants & Fellowships', desc: 'Apply for funding' },
    { id: 'tokens', label: 'Token Trading', desc: 'Buy & sell builder tokens' },
  ]

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invest & Trade</h1>
          <p className="text-xs text-slate-400 mt-1">
            Back builders, discover deals, apply to grants, and trade tokens — all in one place
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatBox label="Active Deals" value="24" />
          <StatBox label="Total Raised" value="$2.8M" />
          <StatBox label="Open Grants" value="18" />
          <StatBox label="Tokens Listed" value="142" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-100 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab.id ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'deals' && <DealsTab userId={user?.id} />}
        {activeTab === 'grants' && <GrantsTab userId={user?.id} />}
        {activeTab === 'tokens' && <TokensTab />}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100">
      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{value}</p>
    </div>
  )
}

/* ─── Deals Tab ───────────────────────────────── */

function DealsTab({ userId }: { userId?: string }) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DealFilter>('all')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    const url = filter === 'all' ? '/api/deals' : `/api/deals?type=${filter}`
    fetch(url)
      .then(r => r.json())
      .then(d => setDeals(Array.isArray(d) ? d : []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false))
  }, [filter])

  const handleInvest = async (dealId: string) => {
    if (!userId) return
    await fetch(`/api/deals/${dealId}/invest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investorId: userId, amountUsd: 100 }),
    })
  }

  const DEAL_FILTERS: { id: DealFilter; label: string }[] = [
    { id: 'all', label: 'All Deals' },
    { id: 'equity', label: 'Equity' },
    { id: 'token', label: 'Token' },
    { id: 'safe', label: 'SAFE' },
    { id: 'convertible', label: 'Convertible' },
    { id: 'revenue_share', label: 'Revenue Share' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DEAL_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setLoading(true) }}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10 shrink-0 ml-4"
        >
          Post Deal
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-64 rounded-2xl skeleton" />)}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState title="No deals yet" subtitle="Be the first to post an investment deal." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onInvest={handleInvest} />
          ))}
        </div>
      )}

      {showCreate && <CreateDealModal userId={userId} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setLoading(true); fetch('/api/deals').then(r => r.json()).then(setDeals).finally(() => setLoading(false)) }} />}
    </div>
  )
}

/* ─── Grants Tab ──────────────────────────────── */

function GrantsTab({ userId }: { userId?: string }) {
  const [grants, setGrants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<GrantFilter>('all')

  useEffect(() => {
    const url = filter === 'all' ? '/api/grants' : `/api/grants?type=${filter}`
    fetch(url)
      .then(r => r.json())
      .then(d => setGrants(Array.isArray(d) ? d : []))
      .catch(() => setGrants([]))
      .finally(() => setLoading(false))
  }, [filter])

  const handleApply = async (grantId: string) => {
    if (!userId) return
    await fetch(`/api/grants/${grantId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicantId: userId }),
    })
  }

  const GRANT_FILTERS: { id: GrantFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'grant', label: 'Grants' },
    { id: 'fellowship', label: 'Fellowships' },
    { id: 'accelerator', label: 'Accelerators' },
    { id: 'bounty_program', label: 'Bounty Programs' },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {GRANT_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setLoading(true) }}
            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl skeleton" />)}
        </div>
      ) : grants.length === 0 ? (
        <EmptyState title="No grants listed yet" subtitle="Check back soon for grants and fellowships." />
      ) : (
        <div className="space-y-4">
          {grants.map(grant => (
            <GrantCard key={grant.id} grant={grant} onApply={handleApply} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Tokens Tab ──────────────────────────────── */

function TokensTab() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tokens/trending')
      .then(r => r.json())
      .then(d => setTokens(Array.isArray(d) ? d : []))
      .catch(() => setTokens([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-slate-400">Live token data from Bags.fm</p>
        <Link
          href="/launch"
          className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest"
        >
          Launch your token
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
        </div>
      ) : tokens.length === 0 ? (
        <EmptyState title="No tokens found" subtitle="Connect your Bags API key to see live data." />
      ) : (
        <div>
          {/* Table header */}
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,100px] gap-4 px-4 pb-3 border-b border-slate-100 mb-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Token</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Price</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">24h</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Mcap</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</span>
          </div>

          {tokens.slice(0, 20).map((t: any, i: number) => (
            <Link
              key={t.mint || i}
              href={`/token/${t.mint}`}
              className="grid grid-cols-[2fr,1fr,1fr,1fr,100px] gap-4 items-center px-4 py-3 border-b border-slate-50 hover:bg-slate-50/60 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  {t.imageUrl && <img src={t.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{t.name}</p>
                  <p className="text-[10px] text-slate-400">${t.symbol}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900 tabular-nums text-right">
                ${t.price < 0.01 ? t.price.toFixed(6) : t.price.toFixed(2)}
              </p>
              <p className={`text-sm font-bold tabular-nums text-right ${t.priceChange24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h?.toFixed(1)}%
              </p>
              <p className="text-sm font-bold text-slate-500 tabular-nums text-right">
                ${t.marketCap >= 1_000_000 ? `${(t.marketCap / 1_000_000).toFixed(1)}M` : t.marketCap >= 1_000 ? `${(t.marketCap / 1_000).toFixed(0)}K` : t.marketCap}
              </p>
              <div className="text-right">
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Trade
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Create Deal Modal ───────────────────────── */

function CreateDealModal({ userId, onClose, onCreated }: { userId?: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dealType, setDealType] = useState('equity')
  const [target, setTarget] = useState('')
  const [minInvest, setMinInvest] = useState('')
  const [valuation, setValuation] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !title || !description) return
    setLoading(true)

    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: userId,
          title,
          description,
          dealType,
          amountTargetUsd: target ? parseFloat(target) : null,
          minInvestmentUsd: minInvest ? parseFloat(minInvest) : null,
          valuationUsd: valuation ? parseFloat(valuation) : null,
        }),
      })
      onCreated()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-slate-900 mb-6">Post a Deal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Deal title" required
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the opportunity..." required rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300 resize-none" />
          <select value={dealType} onChange={e => setDealType(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none">
            <option value="equity">Equity</option>
            <option value="token">Token</option>
            <option value="safe">SAFE</option>
            <option value="convertible">Convertible Note</option>
            <option value="revenue_share">Revenue Share</option>
          </select>
          <div className="grid grid-cols-3 gap-3">
            <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target ($)" type="number"
              className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
            <input value={minInvest} onChange={e => setMinInvest(e.target.value)} placeholder="Min invest ($)" type="number"
              className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
            <input value={valuation} onChange={e => setValuation(e.target.value)} placeholder="Valuation ($)" type="number"
              className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
            <button type="submit" disabled={loading || !title || !description}
              className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30">
              {loading ? 'Posting...' : 'Post Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Shared ──────────────────────────────────── */

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center py-20">
      <h3 className="text-xl font-black text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}
