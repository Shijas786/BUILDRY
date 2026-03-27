'use client'

import React from 'react'
import Link from 'next/link'

interface Deal {
  id: string
  title: string
  description: string
  deal_type: string
  amount_target_usd?: number
  amount_raised_usd?: number
  min_investment_usd?: number
  valuation_usd?: number
  equity_pct?: number
  token_mint?: string
  token_price_usd?: number
  status: string
  deadline?: string
  tags?: string[]
  backers_count: number
  created_at: string
  users?: { id: string; name: string; avatar_url?: string }
  projects?: { title: string; category?: string }
}

const DEAL_TYPE_STYLES: Record<string, string> = {
  equity: 'bg-violet-50 text-violet-600',
  token: 'bg-blue-50 text-blue-600',
  safe: 'bg-emerald-50 text-emerald-600',
  convertible: 'bg-amber-50 text-amber-600',
  revenue_share: 'bg-rose-50 text-rose-600',
}

export default function DealCard({ deal, onInvest }: { deal: Deal; onInvest?: (dealId: string) => void }) {
  const progress = deal.amount_target_usd && deal.amount_raised_usd
    ? Math.min(100, Math.round((deal.amount_raised_usd / deal.amount_target_usd) * 100))
    : 0

  const daysLeft = deal.deadline
    ? Math.max(0, Math.ceil((new Date(deal.deadline).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${DEAL_TYPE_STYLES[deal.deal_type] || 'bg-slate-50 text-slate-400'}`}>
              {deal.deal_type.replace('_', ' ')}
            </span>
            {deal.projects?.category && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase bg-slate-50 text-slate-400">{deal.projects.category}</span>
            )}
            {daysLeft !== null && daysLeft <= 7 && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-red-50 text-red-500">
                {daysLeft === 0 ? 'Ending today' : `${daysLeft}d left`}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">{deal.title}</h3>
          {deal.users?.name && (
            <Link href={`/profile/${deal.users.id || deal.users.name}`} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
              by {deal.users.name}
            </Link>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-5">{deal.description}</p>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {deal.amount_target_usd && (
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Raising</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">${formatCompact(deal.amount_target_usd)}</p>
          </div>
        )}
        {deal.valuation_usd && (
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Valuation</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">${formatCompact(deal.valuation_usd)}</p>
          </div>
        )}
        {deal.min_investment_usd && (
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Min Invest</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">${formatCompact(deal.min_investment_usd)}</p>
          </div>
        )}
        {deal.token_price_usd && (
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Token Price</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">${deal.token_price_usd}</p>
          </div>
        )}
        {deal.equity_pct && (
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider mb-0.5">Equity</p>
            <p className="text-sm font-black text-slate-900 tabular-nums">{deal.equity_pct}%</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {deal.amount_target_usd && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400">{progress}% funded</span>
            <span className="text-[10px] font-bold text-slate-300">{deal.backers_count} backers</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {deal.tags && deal.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-5">
          {deal.tags.slice(0, 4).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-50 text-slate-400">{t}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className="text-[10px] font-bold text-slate-300">{new Date(deal.created_at).toLocaleDateString()}</span>
        {onInvest && deal.status === 'open' && (
          <button
            onClick={() => onInvest(deal.id)}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
          >
            Invest
          </button>
        )}
      </div>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}
