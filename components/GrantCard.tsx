'use client'

import React from 'react'

interface Grant {
  id: string
  title: string
  description: string
  organization: string
  grant_type: string
  amount_usd?: number
  currency?: string
  application_url?: string
  deadline?: string
  tags?: string[]
  ecosystem?: string
  status: string
  applicants_count: number
  created_at: string
}

const GRANT_TYPE_STYLES: Record<string, string> = {
  grant: 'bg-emerald-50 text-emerald-600',
  fellowship: 'bg-violet-50 text-violet-600',
  accelerator: 'bg-blue-50 text-blue-600',
  bounty_program: 'bg-amber-50 text-amber-600',
}

export default function GrantCard({ grant, onApply }: { grant: Grant; onApply?: (grantId: string) => void }) {
  const daysLeft = grant.deadline
    ? Math.max(0, Math.ceil((new Date(grant.deadline).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${GRANT_TYPE_STYLES[grant.grant_type] || 'bg-slate-50 text-slate-400'}`}>
              {grant.grant_type.replace('_', ' ')}
            </span>
            {grant.ecosystem && (
              <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase bg-slate-900 text-white">{grant.ecosystem}</span>
            )}
            {daysLeft !== null && daysLeft <= 14 && (
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${daysLeft <= 3 ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{grant.title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">by {grant.organization}</p>
        </div>
        {grant.amount_usd && (
          <div className="text-right shrink-0 ml-4">
            <p className="text-xl font-black text-slate-900 tabular-nums">
              ${grant.amount_usd >= 1000 ? `${(grant.amount_usd / 1000).toFixed(0)}K` : grant.amount_usd.toLocaleString()}
            </p>
            <p className="text-[9px] font-bold text-slate-300 uppercase">{grant.currency || 'USD'}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{grant.description}</p>

      {grant.tags && grant.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {grant.tags.slice(0, 5).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-50 text-slate-400">{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <span className="text-[10px] font-bold text-slate-300">
          {grant.applicants_count} applicant{grant.applicants_count !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-3">
          {grant.application_url && (
            <a
              href={grant.application_url}
              target="_blank"
              rel="noopener"
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
            >
              External link
            </a>
          )}
          {onApply && grant.status === 'open' && (
            <button
              onClick={() => onApply(grant.id)}
              className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
