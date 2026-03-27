'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'

const POST_TYPES = [
  { id: 'update', label: 'Update', color: 'bg-slate-100 text-slate-600' },
  { id: 'milestone', label: 'Milestone', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'launch', label: 'Launch', color: 'bg-violet-50 text-violet-600' },
  { id: 'hiring', label: 'Hiring', color: 'bg-amber-50 text-amber-600' },
  { id: 'showcase', label: 'Showcase', color: 'bg-blue-50 text-blue-600' },
]

export default function PostComposer({ onPostCreated }: { onPostCreated?: () => void }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('update')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!user) return null

  const handleSubmit = async () => {
    if (!content.trim()) return
    setLoading(true)

    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          content: content.trim(),
          postType,
          milestoneTitle: postType === 'milestone' ? milestoneTitle : null,
        }),
      })
      setContent('')
      setMilestoneTitle('')
      setPostType('update')
      setExpanded(false)
      onPostCreated?.()
    } catch {}

    setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-5 transition-all shadow-sm">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-500 shrink-0">
          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); if (!expanded) setExpanded(true) }}
            onFocus={() => setExpanded(true)}
            placeholder="Share an update, milestone, or showcase your work..."
            className="w-full resize-none text-sm text-slate-900 placeholder-slate-300 focus:outline-none bg-transparent min-h-[48px] leading-relaxed"
            rows={expanded ? 4 : 2}
          />

          {expanded && (
            <div className="mt-3 space-y-3 fade-in">
              {/* Post type selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {POST_TYPES.map(pt => (
                  <button
                    key={pt.id}
                    onClick={() => setPostType(pt.id)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      postType === pt.id
                        ? `${pt.color} ring-1 ring-current/20`
                        : 'bg-slate-50 text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>

              {postType === 'milestone' && (
                <input
                  value={milestoneTitle}
                  onChange={e => setMilestoneTitle(e.target.value)}
                  placeholder="Milestone title (e.g. 'Raised $2M Seed Round')"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300"
                />
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <button className="text-slate-300 hover:text-slate-500 transition-colors" title="Add image">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="text-slate-300 hover:text-slate-500 transition-colors" title="Add link">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || loading}
                  className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:opacity-30"
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
