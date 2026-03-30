'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import ProfileProjectsGrid from '@/components/ProfileProjectsGrid'

export default function ProjectsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<{ profile: any; projects: any[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const profileSlug = user?.id ?? ''

  const refresh = useCallback(() => {
    if (!profileSlug) return
    fetch(`/api/profile/${encodeURIComponent(profileSlug)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [profileSlug])

  useEffect(() => {
    if (!user?.id) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/profile/${encodeURIComponent(user.id)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  const goToAddProject = () => {
    router.push('/settings?tab=projects&add=1')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-300">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Projects</h1>
          <p className="text-sm text-slate-400 mt-2 mb-8">Sign in to see the same projects as on your public profile.</p>
          <Link
            href="/"
            className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
          >
            Go home
          </Link>
        </div>
      </div>
    )
  }

  const projects = data?.projects ?? []
  const builderId = data?.profile?.id

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Projects</h1>
            <p className="text-xs text-slate-400 mt-1">
              Same list as your profile — manual entries and GitHub showcase.
              {data?.profile?.username ? (
                <>
                  {' '}
                  <Link href={`/profile/${data.profile.username}`} className="text-blue-600 font-bold hover:underline">
                    View public profile
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={goToAddProject}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10 shrink-0"
          >
            New project
          </button>
        </div>

        {loading ? (
          <p className="text-sm font-bold text-slate-300 py-12 text-center">Loading projects…</p>
        ) : (
          <ProfileProjectsGrid
            projects={projects}
            isOwner
            builderProfileDocId={builderId}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  )
}
