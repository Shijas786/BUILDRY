'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function ProjectsPage() {
  const router = useRouter()

  const goToAddProject = () => {
    router.push('/settings?tab=projects&add=1')
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Projects</h1>
            <p className="text-xs text-slate-400 mt-1">Manage and showcase your projects</p>
          </div>
          <button
            type="button"
            onClick={goToAddProject}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10"
          >
            New project
          </button>
        </div>

        <div className="text-center py-20">
          <h3 className="text-xl font-black text-slate-200 mb-2">No projects yet</h3>
          <p className="text-sm text-slate-300 mb-6">Create your first project to start building in public.</p>
          <button
            type="button"
            onClick={goToAddProject}
            className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98]"
          >
            Add your first project
          </button>
        </div>
      </div>
    </div>
  )
}
