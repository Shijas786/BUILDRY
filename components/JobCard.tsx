'use client'

import React from 'react'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  description: string
  category: string
  skills_required?: string[]
  budget_usd?: number
  budget_type?: string
  payment_currency?: string
  status: string
  created_at: string
  users?: {
    name: string
    avatar_url?: string
  }
}

export default function JobCard({ job, onApply }: { job: Job; onApply?: (jobId: string) => void }) {
  const timeAgo = getTimeAgo(job.created_at)

  return (
    <div className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-blue-50 text-blue-500">{job.category}</span>
            <span className="text-[10px] text-slate-300">{timeAgo}</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{job.title}</h3>
          {job.users?.name && (
            <p className="text-[11px] text-slate-400 mt-0.5">Posted by {job.users.name}</p>
          )}
        </div>
        {job.budget_usd && (
          <div className="text-right shrink-0 ml-4">
            <p className="text-lg font-black text-slate-900 tabular-nums">${job.budget_usd.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase">{job.budget_type || 'Fixed'}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{job.description}</p>

      {job.skills_required && job.skills_required.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {job.skills_required.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-50 text-[9px] font-bold text-slate-500 border border-slate-100">{s}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex items-center gap-3">
          {job.payment_currency && (
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Pay in {job.payment_currency}</span>
          )}
        </div>
        {onApply && (
          <button
            onClick={() => onApply(job.id)}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
