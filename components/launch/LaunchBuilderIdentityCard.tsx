'use client'

import React from 'react'
import { exploreScoreFromProfile } from '@/lib/exploreBuilders'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

type Props = {
  loading: boolean
  profile: Record<string, unknown> | null
  socialShowcase: {
    github?: {
      username: string
      avatarUrl: string
      oauthName?: string | null
    } | null
  } | null
  contributions: BuilderContributionsSnapshot | undefined
  fallbackName: string | null
  fallbackAvatar: string | null
  onRefresh: () => void
  refreshing: boolean
}

export default function LaunchBuilderIdentityCard({
  loading,
  profile,
  socialShowcase,
  contributions,
  fallbackName,
  fallbackAvatar,
  onRefresh,
  refreshing,
}: Props) {
  const gh = socialShowcase?.github
  const username =
    typeof profile?.username === 'string' && profile.username.trim()
      ? profile.username.trim()
      : null
  const displayName =
    gh?.oauthName?.trim() ||
    username ||
    (typeof profile?.users === 'object' && profile.users && typeof (profile.users as { name?: string }).name === 'string'
      ? (profile.users as { name: string }).name
      : null) ||
    fallbackName ||
    'Builder'

  const avatarUrl =
    gh?.avatarUrl ||
    (typeof profile?.avatar_url === 'string' ? profile.avatar_url : null) ||
    fallbackAvatar

  const builderScore =
    profile && Object.keys(profile).length > 0 ? exploreScoreFromProfile(profile) : null

  const ghContrib = contributions?.github
  const streakDays = ghContrib?.currentStreakDays ?? 0
  const activity365 = ghContrib?.activityPoints365d ?? 0
  const stars = ghContrib?.totalStars ?? 0

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-1 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400" aria-hidden />
      <div className="relative rounded-[0.875rem] bg-white/90 px-5 py-5 backdrop-blur-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="relative shrink-0">
              <div className="size-16 overflow-hidden rounded-2xl border-2 border-white bg-slate-100 shadow-md ring-2 ring-slate-900/5 sm:size-[4.5rem]">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-2xl font-black text-slate-300">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-slate-900 text-[10px] shadow-md ring-2 ring-white"
                title="Verified builder context"
                aria-hidden
              >
                <svg className="size-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-600">Attached to this launch</p>
              <h2 className="truncate text-lg font-black text-slate-900 sm:text-xl">{displayName}</h2>
              {username && <p className="truncate text-sm font-semibold text-slate-500">@{username}</p>}
              {gh?.username && (
                <p className="mt-1 truncate text-xs font-medium text-slate-400">
                  GitHub <span className="text-slate-600">{gh.username}</span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || refreshing}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? '…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Builder score</p>
              <p className="mt-1 text-xl font-black tabular-nums text-slate-900">
                {builderScore != null ? builderScore : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">GitHub streak</p>
              <p className="mt-1 text-xl font-black tabular-nums text-slate-900">{streakDays}</p>
              <p className="text-[9px] text-slate-400">days</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">365d · stars</p>
              <p className="mt-1 text-sm font-black leading-tight text-slate-900">
                <span className="tabular-nums">{activity365}</span>
                <span className="mx-1 text-slate-300">·</span>
                <span className="tabular-nums">{stars}</span>
              </p>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] font-medium leading-relaxed text-slate-400">
          This card pulls from your live Buildry profile and public GitHub signals—refresh after you update Settings or ship
          commits so your token launch stays accurate.
        </p>
      </div>
    </div>
  )
}
