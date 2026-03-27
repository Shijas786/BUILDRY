'use client'

import React, { useEffect, useState } from 'react'
import JobCard from '@/components/JobCard'
import { useAuth } from '@/context/AuthProvider'

const CATEGORIES = ['All', 'Development', 'Design', 'Audit', 'Consulting', 'Marketing', 'Community']

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [showPostModal, setShowPostModal] = useState(false)

  useEffect(() => {
    const url = activeCategory === 'All'
      ? '/api/jobs'
      : `/api/jobs?category=${activeCategory}`
    fetch(url)
      .then(r => r.json())
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [activeCategory])

  const handleApply = async (jobId: string) => {
    if (!user) return
    await fetch(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ builderId: user.id }),
    })
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Jobs & Bounties</h1>
            <p className="text-xs text-slate-400 mt-1">Find your next opportunity or hire top talent</p>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            Post a Job
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setLoading(true) }}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-2xl skeleton" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-black text-slate-200 mb-2">No jobs posted yet</h3>
            <p className="text-sm text-slate-300">Be the first to post a job or bounty.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>

      {showPostModal && <PostJobModalWired onClose={() => setShowPostModal(false)} onCreated={() => { setShowPostModal(false); setLoading(true); fetch('/api/jobs').then(r => r.json()).then(setJobs).finally(() => setLoading(false)) }} />}
    </div>
  )
}

function PostJobModalWired({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Development')
  const [skills, setSkills] = useState('')
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !title || !description) return
    setLoading(true)

    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user.id,
          title,
          description,
          category,
          skillsRequired: skills.split(',').map(s => s.trim()).filter(Boolean),
          budgetUsd: budget ? parseInt(budget) : null,
        }),
      })
      onCreated()
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-black text-slate-900 mb-6">Post a Job</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Job title"
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300"
            required
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the role, requirements, and expectations..."
            className="w-full h-28 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300 resize-none"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none"
            >
              {['Development', 'Design', 'Audit', 'Consulting', 'Marketing', 'Community'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="Budget (USD)"
              type="number"
              className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none placeholder-slate-300"
            />
          </div>
          <input
            value={skills}
            onChange={e => setSkills(e.target.value)}
            placeholder="Required skills (comma-separated)"
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300"
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
            <button
              type="submit"
              disabled={loading || !title || !description}
              className="bg-slate-900 text-white px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30"
            >
              {loading ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
