'use client'

import React, { useState } from 'react'

const actions = [
  { id: 1, title: 'Verify Your First Website', description: 'Verify a project website to unlock more tracking', icon: '🌐', completed: false },
  { id: 2, title: 'Add Your First Contributor', description: 'Invite a collaborator to one of your projects', icon: '👥', completed: false },
  { id: 3, title: 'GitHub', description: 'Connect your GitHub profile', icon: '🐙', completed: true },
  { id: 4, title: 'Main Role', description: 'Set your primary builder role', icon: '🛠️', completed: true },
  { id: 5, title: 'Location', description: 'Add your base of operations', icon: '📍', completed: true },
  { id: 6, title: 'Add Your First Project', description: 'Create a project to start tracking impact', icon: '📦', completed: true },
  { id: 7, title: 'X (Twitter)', description: 'Verify your social influence', icon: '🐦', completed: true },
  { id: 8, title: 'Wallet', description: 'Connect your EVM wallet via Reown', icon: '💳', completed: true },
  { id: 9, title: 'Talent+', description: 'Join to unlock features and rewards', icon: '✨', completed: true },
  { id: 10, title: 'LinkedIn', description: 'Connect your professional work history', icon: '🔗', completed: true },
]

export default function OnboardingChecklist() {
  const [expanded, setExpanded] = useState(false)
  const completedCount = actions.filter(a => a.completed).length
  const displayedActions = expanded ? actions : actions.slice(0, 4)

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          Recommended Actions
        </h3>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
          {completedCount}/10 completed
        </span>
      </div>

      <div className="relative pl-8">
        {/* Very subtle timeline line */}
        <div className="absolute left-[11px] top-6 bottom-6 w-px bg-slate-100/50" />

        <div className="space-y-4">
          {displayedActions.map((action, i) => (
            <div key={action.id} className="relative group flex items-center">
              
              {/* Timeline Dot */}
              <div className="absolute -left-8 w-6 h-6 flex items-center justify-center bg-white z-10">
                {action.completed ? (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-slate-200 group-hover:border-blue-300 transition-colors" />
                )}
              </div>

              {/* Action Card */}
              <div className="w-full bg-white border border-slate-100/60 rounded-[32px] p-5 flex items-center gap-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:border-slate-200/60 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className={`text-[13px] font-black uppercase tracking-tight mb-0.5 ${action.completed ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600 transition-colors'}`}>
                    {action.title}
                  </h4>
                  <p className="text-[12px] font-bold text-slate-400">
                    {action.description}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] hover:text-slate-900 transition-all"
        >
          {expanded ? 'Show Less' : 'Show More Actions'}
        </button>
      </div>
    </div>
  )
}
