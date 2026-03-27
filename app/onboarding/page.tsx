'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoleStore, type UserRole } from '@/store/role'
import { useAuth } from '@/context/AuthProvider'
import { updateUserRole } from '@/lib/auth'

const ROLES: { id: UserRole; title: string; subtitle: string; description: string; iconPath: string }[] = [
  {
    id: 'developer',
    title: 'Developer',
    subtitle: 'Ship & Earn',
    description: 'Showcase your skills, contribute to projects, find work, and build your onchain reputation.',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'founder',
    title: 'Founder',
    subtitle: 'Build in Public',
    description: 'Share updates, showcase milestones, launch your token, and grow your startup audience.',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'investor',
    title: 'Investor',
    subtitle: 'Discover & Back',
    description: 'Find promising startups early, back verified builders, and track your portfolio.',
    iconPath: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    id: 'recruiter',
    title: 'Recruiter',
    subtitle: 'Find Talent',
    description: 'Post jobs, discover top developers by reputation score, and hire with confidence.',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
]

const ROLE_COLORS: Record<UserRole, string> = {
  developer: 'border-blue-500 bg-blue-500/5 shadow-blue-500/10',
  founder: 'border-violet-500 bg-violet-500/5 shadow-violet-500/10',
  investor: 'border-emerald-500 bg-emerald-500/5 shadow-emerald-500/10',
  recruiter: 'border-amber-500 bg-amber-500/5 shadow-amber-500/10',
}

const ROLE_ICON_COLORS: Record<UserRole, string> = {
  developer: 'text-blue-500',
  founder: 'text-violet-500',
  investor: 'text-emerald-500',
  recruiter: 'text-amber-500',
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const { setActiveRole } = useRoleStore()
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return

    // Not logged in users should not stay on onboarding.
    if (!user) {
      router.replace('/')
      return
    }

    // Existing users with role already set should skip onboarding.
    if (user.account_type) {
      setActiveRole(user.account_type)
      router.replace('/feed')
    }
  }, [authLoading, user, router, setActiveRole])

  const handleContinue = async () => {
    if (!selected) return
    setLoading(true)

    setActiveRole(selected)

    if (user?.id) {
      await updateUserRole(user.id, selected)
      await refreshUser()
    }

    router.push('/feed')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />

      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl mb-8">
        B
      </div>

      <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight text-center mb-3">
        Choose your path
      </h1>
      <p className="text-base text-slate-400 font-medium text-center mb-12 max-w-md">
        This shapes your dashboard, feed, and tools. You can switch anytime from the sidebar.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl mb-12">
        {ROLES.map((role) => {
          const isSelected = selected === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 group ${
                isSelected
                  ? `${ROLE_COLORS[role.id]} shadow-xl scale-[1.02]`
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                isSelected ? `${ROLE_ICON_COLORS[role.id]} bg-white` : 'text-slate-300 bg-slate-50'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={role.iconPath} />
                </svg>
              </div>

              <div className="mb-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{role.title}</h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${
                  isSelected ? ROLE_ICON_COLORS[role.id] : 'text-slate-300'
                }`}>{role.subtitle}</p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{role.description}</p>

              {isSelected && (
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${ROLE_ICON_COLORS[role.id]} bg-white`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className="bg-slate-900 text-white px-12 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10"
      >
        {loading ? 'Setting up...' : 'Continue'}
      </button>

      <p className="text-[10px] text-slate-300 font-medium mt-6 uppercase tracking-widest">
        You can always switch roles later
      </p>
    </div>
  )
}
