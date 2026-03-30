'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import FollowButton from '@/components/FollowButton'
import { useAuth } from '@/context/AuthProvider'
import ProfileActivitySection from '@/components/ProfileActivitySection'
import ProfileProjectsGrid from '@/components/ProfileProjectsGrid'
import ProfileTokensHub from '@/components/ProfileTokensHub'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import BagsLaunchBadge from '@/components/BagsLaunchBadge'
import { farcasterShowcaseFromStored } from '@/lib/socialShowcase'
import { looksLikeFirebaseAuthUid } from '@/lib/firebaseUid'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

interface ProfileData {
  profile: any
  github: any
  socialShowcase?: {
    linkedin: {
      name: string | null
      picture: string | null
      headline: string | null
      linkedinUrl: string | null
    } | null
    github: {
      username: string
      avatarUrl: string
      bio: string | null
      publicRepos: number
      followers: number
      totalStars: number
      oauthName?: string | null
      oauthBlog?: string | null
      oauthCompany?: string | null
      htmlUrl?: string | null
    } | null
    farcaster: {
      fid: number
      username: string
      displayName: string
      avatar?: string
      bio?: string
      followers: number
      following: number
      powerBadge: boolean
    } | null
    farcasterFromConnect: Record<string, unknown> | null
  }
  onchain: any
  posts: any[]
  projects: any[]
  githubContributionSummary: any
  tokens: any[]
  followersCount: number
  contributions?: BuilderContributionsSnapshot
  github_pat_configured?: boolean
  github_graphql_error?: string | null
}

type Tab = 'posts' | 'projects' | 'tokens' | 'activity' | 'services'

function shortAddr(a: string | null | undefined): string {
  if (!a || a.length < 10) return a || '—'
  return `${a.slice(0, 4)}…${a.slice(-4)}`
}

function BuilderContributionsGrid({ c }: { c: BuilderContributionsSnapshot | undefined }) {
  if (!c) return null
  const hasAny =
    c.github ||
    c.solana.wallet ||
    c.evm.wallet ||
    c.projects.total > 0 ||
    c.posts > 0
  if (!hasAny) return null

  return (
    <div className="mb-8">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-3">
        Ship log <span className="font-normal normal-case text-slate-400">(public signals, estimates)</span>
      </p>
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-0">
        {/* Code + Buildry product signals */}
        <div className="min-w-0 flex-1 md:pr-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Code &amp; projects
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {c.github && (
              <>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">GitHub repos</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{c.github.publicRepos}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stars received</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{c.github.totalStars.toLocaleString()}</p>
                </div>
                {c.github.graphqlCommitContributionsTotal != null && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Commits (GitHub graph)
                    </p>
                    <p className="text-lg font-black text-slate-900 tabular-nums">
                      {c.github.graphqlCommitContributionsTotal.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {c.github.graphqlCommitContributionsYears?.length
                        ? `totalCommitContributions · last ${c.github.graphqlCommitContributionsYears.length} calendar yrs`
                        : 'totalCommitContributions (GraphQL)'}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">365d activity</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{c.github.activityPoints365d}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">from public events (not raw commits)</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active days</p>
                  <p className="text-lg font-black text-slate-900 tabular-nums">{c.github.activeDays365d}</p>
                </div>
              </>
            )}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projects listed</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{c.projects.total}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {c.projects.manual} manual · {c.projects.fromGitHub} GitHub
              </p>
            </div>
          </div>
        </div>

        <div
          className="h-1.5 shrink-0 rounded-full bg-slate-900 md:hidden"
          aria-hidden
        />
        <div
          className="hidden w-1.5 shrink-0 rounded-full bg-slate-900 md:block self-stretch min-h-[8rem]"
          aria-hidden
        />

        {/* On-chain footprint */}
        <div className="min-w-0 flex-1 md:pl-6">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            On-chain footprint
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">Solana · Helius</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{c.solana.heliusTransactionsSampled}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                tx sample
                {c.solana.verifiedWalletCount > 1 ? ` · ${c.solana.verifiedWalletCount} wallets` : ''}
              </p>
              {c.solana.wallet && (
                <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={c.solana.wallet}>
                  {shortAddr(c.solana.wallet)}
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">Programs (est.)</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{c.solana.programsDeployedEstimate}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                deploy/create heuristic
                {c.solana.verifiedWalletCount > 1 ? ` · ${c.solana.verifiedWalletCount} wallets` : ''}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">EVM txs (est.)</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">
                {c.evm.transactionCountEstimate.toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                nonces + L1 sample
                {c.evm.verifiedWalletCount > 1 ? ` · ${c.evm.verifiedWalletCount} wallets` : ''}
              </p>
              {c.evm.wallet && (
                <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={c.evm.wallet}>
                  {shortAddr(c.evm.wallet)}
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">EVM contracts (est.)</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{c.evm.contractsDeployedEstimate}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Alchemy + Etherscan
                {c.evm.verifiedWalletCount > 1 ? ` · ${c.evm.verifiedWalletCount} wallets` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AiBuilderNarrative({
  state,
}: {
  state: { status: 'idle' | 'loading' | 'ok' | 'empty' | 'config'; text?: string; note?: string }
}) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="mb-8 p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white animate-pulse">
        <div className="h-3 w-40 bg-slate-200 rounded mb-3" />
        <div className="h-3 w-full bg-slate-100 rounded mb-2" />
        <div className="h-3 max-w-xl bg-slate-100 rounded" />
      </div>
    )
  }
  if (state.status === 'config') {
    return (
      <div className="mb-8 p-4 rounded-2xl border border-dashed border-indigo-200/80 bg-indigo-50/30 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-800 mb-2">AI builder snapshot is not enabled on this deployment.</p>
        <p className="mb-2">
          Add <span className="font-mono text-[11px] bg-white/80 px-1 rounded">ANTHROPIC_API_KEY</span> as a{' '}
          <strong>server</strong> secret (Vercel → Project → Settings → Environment Variables → Production), then redeploy.
          Use a key from{' '}
          <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold underline underline-offset-2">
            console.anthropic.com
          </a>
          . See <span className="font-mono text-[11px]">README.md</span> → Environment Variables.
        </p>
        <p className="text-[11px] text-slate-500">
          Claude then generates the short “Builder snapshot” from LinkedIn, GitHub, Farcaster, and public on-chain signals.
        </p>
      </div>
    )
  }
  if (state.status !== 'ok' || !state.text) return null

  return (
    <div className="mb-8 p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-white">
      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">Builder snapshot · AI</p>
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">{state.text}</div>
      <p className="text-[9px] text-slate-400 mt-3">
        Generated from public profile data; not financial or employment advice.
      </p>
    </div>
  )
}

function warpcastProfileUrl(username: string, fid?: number): string {
  if (fid != null && (username.startsWith('!') || username === '')) {
    return `https://warpcast.com/~/profiles/${fid}`
  }
  const u = username.replace(/^@/, '').replace(/^!/, '')
  if (!u && fid != null) return `https://warpcast.com/~/profiles/${fid}`
  return `https://warpcast.com/${u}`
}

function ConnectedSocialShowcase({
  linkedin,
  github,
  farcaster,
}: {
  linkedin: NonNullable<ProfileData['socialShowcase']>['linkedin']
  github: NonNullable<ProfileData['socialShowcase']>['github']
  farcaster: {
    username: string
    displayName: string
    bio?: string
    avatar?: string
    fid?: number
    followers: number
    following: number
    powerBadge: boolean
    source: 'neynar' | 'connected'
  } | null
}) {
  if (!linkedin && !github && !farcaster) return null

  return (
    <div className="mb-8">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-4">Connected profiles</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {linkedin && (linkedin.linkedinUrl || linkedin.name || linkedin.picture) && (
          (() => {
            const inner = (
              <>
                <div className="w-14 h-14 rounded-xl bg-[#0A66C2]/10 overflow-hidden shrink-0 flex items-center justify-center text-[#0A66C2] font-black">
                  {linkedin.picture ? (
                    <img src={linkedin.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    'in'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#0A66C2] mb-1">LinkedIn</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{linkedin.name || 'Connected'}</p>
                  {linkedin.headline && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">{linkedin.headline}</p>
                  )}
                </div>
              </>
            )
            const shell =
              'flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-[#0A66C2]/30 hover:bg-white transition-all'
            return linkedin.linkedinUrl ? (
              <a href={linkedin.linkedinUrl} target="_blank" rel="noopener" className={shell}>
                {inner}
              </a>
            ) : (
              <div className={shell}>{inner}</div>
            )
          })()
        )}

        {github && (
          <a
            href={github.htmlUrl || `https://github.com/${github.username}`}
            target="_blank"
            rel="noopener"
            className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0">
              {github.avatarUrl ? (
                <img src={github.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs font-black">GH</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">GitHub</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {github.oauthName || github.username}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {github.publicRepos} repos · {github.followers.toLocaleString()} followers ·{' '}
                {github.totalStars.toLocaleString()} stars
              </p>
              {(github.bio || github.oauthCompany) && (
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {[github.bio, github.oauthCompany].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </a>
        )}

        {farcaster && (
          <a
            href={warpcastProfileUrl(farcaster.username, farcaster.fid)}
            target="_blank"
            rel="noopener"
            className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-violet-50/40 hover:border-violet-200 hover:bg-white transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-violet-100 overflow-hidden shrink-0 flex items-center justify-center">
              {farcaster.avatar ? (
                <img src={farcaster.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-violet-600 font-black text-lg">FC</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-500 mb-1">
                Farcaster{farcaster.powerBadge ? ' ⚡' : ''}
              </p>
              <p className="text-sm font-bold text-slate-900 truncate">{farcaster.displayName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                @{farcaster.username.replace(/^!/, '') || '—'}
                {farcaster.fid != null ? ` · FID ${farcaster.fid}` : ''}
                {farcaster.followers > 0 ? ` · ${farcaster.followers.toLocaleString()} followers` : ''}
              </p>
              {farcaster.bio && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">{farcaster.bio}</p>
              )}
              {farcaster.source === 'connected' && (
                <p className="text-[10px] text-violet-400 mt-1">Add NEYNAR_API_KEY for live stats</p>
              )}
            </div>
          </a>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const params = useParams()
  const username = params.username as string
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [aiNarrative, setAiNarrative] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'empty' | 'config'
    text?: string
    note?: string
  }>({ status: 'idle' })

  const refreshProfile = useCallback(() => {
    fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [username])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  useEffect(() => {
    if (!data?.profile) return
    setAiNarrative({ status: 'loading' })
    let cancelled = false
    fetch(`/api/profile/${encodeURIComponent(username)}/builder-narrative`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) return { narrative: null, reason: j.error || 'request_failed' }
        return j
      })
      .then((j) => {
        if (cancelled) return
        if (j.narrative) setAiNarrative({ status: 'ok', text: j.narrative })
        else if (j.reason) setAiNarrative({ status: 'config', note: j.reason })
        else setAiNarrative({ status: 'empty' })
      })
      .catch(() => {
        if (!cancelled) setAiNarrative({ status: 'empty' })
      })
    return () => {
      cancelled = true
    }
  }, [username, data?.profile?.id])

  if (loading) return <ProfileSkeleton />

  const p = data?.profile
  const github = data?.github
  const socialShowcase = data?.socialShowcase
  const onchain = data?.onchain

  const fcLive = socialShowcase?.farcaster
  const fcStored = farcasterShowcaseFromStored(socialShowcase?.farcasterFromConnect ?? null)
  const fcDisplay = fcLive
    ? {
        username: fcLive.username,
        displayName: fcLive.displayName,
        bio: fcLive.bio,
        avatar: fcLive.avatar,
        fid: fcLive.fid,
        followers: fcLive.followers,
        following: fcLive.following,
        powerBadge: fcLive.powerBadge,
        source: 'neynar' as const,
      }
    : fcStored
      ? {
          username: fcStored.username,
          displayName: fcStored.displayName,
          bio: fcStored.bio,
          avatar: fcStored.avatar,
          fid: fcStored.fid,
          followers: 0,
          following: 0,
          powerBadge: false,
          source: 'connected' as const,
        }
      : null

  if (!p) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Builder not found</h1>
          <p className="text-slate-400 mb-8">No profile exists for @{username}</p>
          <Link href="/explore" className="text-sm font-bold text-blue-600 hover:underline">Explore builders</Link>
        </div>
      </div>
    )
  }

  const hasTokens = (data?.tokens?.length || 0) > 0
  const primaryBagsMint =
    hasTokens && data?.tokens?.[0]?.mint ? String(data.tokens[0].mint) : null
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: data?.posts.length },
    { id: 'projects', label: 'Projects', count: data?.projects.length },
    ...(hasTokens
      ? [
          {
            id: 'tokens' as Tab,
            label: (data?.tokens?.length || 0) === 1 ? 'Token' : 'Tokens',
            count: data?.tokens.length,
          },
        ]
      : []),
    { id: 'activity', label: 'Activity' },
    { id: 'services', label: 'Services' },
  ]

  const showHandleHint = !p.username && looksLikeFirebaseAuthUid(username)

  return (
    <div className="min-h-screen bg-slate-50/40">
      {showHandleHint && (
        <div className="bg-amber-50 border-b border-amber-100 text-amber-900">
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 text-center text-[11px] font-medium">
            This profile is opened with an account ID (no public handle yet).{' '}
            <Link href="/settings" className="font-bold text-amber-950 underline underline-offset-2 hover:no-underline">
              Set a username in Settings
            </Link>{' '}
            for a short URL and better discovery.
          </div>
        </div>
      )}
      {/* Banner — taller so cover art reads clearly below the sidebar */}
      <div className="relative min-h-[13rem] h-[min(38vh,22rem)] sm:min-h-[15rem] sm:h-[min(40vh,24rem)] md:min-h-[17rem] md:h-[min(42vh,26rem)] bg-gradient-to-br from-slate-100 to-slate-50">
        {p.banner_url && <img src={p.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>

      {/* Profile header */}
      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 sm:-mt-[4.5rem] sm:px-6 md:-mt-20 md:px-8">
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6 md:p-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden">
              {(p.avatar_url || socialShowcase?.github?.avatarUrl || socialShowcase?.linkedin?.picture || github?.avatarUrl) ? (
                <img
                  src={p.avatar_url || socialShowcase?.github?.avatarUrl || socialShowcase?.linkedin?.picture || github?.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-300">
                  {(p.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {hasTokens && <BagsLaunchBadge mint={primaryBagsMint} variant="float" />}
          </div>
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight truncate">
                {p.username || p.users?.name || username}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                {p.users?.account_type || 'builder'}
              </span>
              {hasTokens && <BagsLaunchBadge mint={primaryBagsMint} variant="inline" />}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-300 mb-1">@{p.username || username}</p>
            {p.tagline && <p className="text-sm text-slate-500 truncate">{p.tagline}</p>}
          </div>
          {user?.id === p.id ? (
            <Link
              href="/settings"
              className="w-full shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-black active:scale-95 sm:w-auto"
            >
              Edit profile
            </Link>
          ) : (
            <div className="w-full sm:w-auto">
              <FollowButton builderId={p.id} />
            </div>
          )}
        </div>

        {/* Bio + socials */}
        {p.bio && <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">{p.bio}</p>}
        <div className="flex items-center gap-6 flex-wrap mb-7 text-[11px] font-bold text-slate-400">
          {p.location && <span>{p.location}</span>}
          {p.github_username && (
            <a href={`https://github.com/${p.github_username}`} target="_blank" rel="noopener" className="hover:text-slate-900 transition-colors">
              github.com/{p.github_username}
            </a>
          )}
          {p.twitter_handle && (
            <a href={`https://x.com/${p.twitter_handle}`} target="_blank" rel="noopener" className="hover:text-slate-900 transition-colors">
              @{p.twitter_handle}
            </a>
          )}
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener" className="hover:text-slate-900 transition-colors">{p.website}</a>
          )}
          {socialShowcase?.linkedin?.linkedinUrl && (
            <a
              href={socialShowcase.linkedin.linkedinUrl}
              target="_blank"
              rel="noopener"
              className="hover:text-[#0A66C2] transition-colors"
            >
              LinkedIn
            </a>
          )}
          {fcDisplay && (
            <a
              href={warpcastProfileUrl(fcDisplay.username, fcDisplay.fid)}
              target="_blank"
              rel="noopener"
              className="hover:text-violet-600 transition-colors"
            >
              Farcaster{fcDisplay.fid ? ` · FID ${fcDisplay.fid}` : ''}
            </a>
          )}
          <span>{data?.followersCount || 0} followers</span>
        </div>

        <ConnectedSocialShowcase
          linkedin={socialShowcase?.linkedin ?? null}
          github={socialShowcase?.github ?? null}
          farcaster={fcDisplay}
        />

        <AiBuilderNarrative state={aiNarrative} />

        <BuilderContributionsGrid c={data?.contributions} />

        {/* Skills & stack (edit in Settings → Edit profile) */}
        {((p.skills && p.skills.length > 0) || (github?.topLanguages && github.topLanguages.length > 0)) && (
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">Skills & stack</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(p.skills || []).map((s: string) => (
                <span key={s} className="px-3 py-1 rounded-md bg-slate-100/80 text-[10px] font-bold text-slate-600 border border-slate-200/60">
                  {s}
                </span>
              ))}
              {github?.topLanguages
                ?.filter((l: string) => !(p.skills || []).includes(l))
                .slice(0, 6)
                .map((l: string) => (
                  <span key={l} className="px-3 py-1 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100">
                    {l}
                  </span>
                ))}
            </div>
          </div>
        )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 flex gap-0 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-slate-900 bg-slate-50/50'
                  : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50/40'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-[9px] font-bold text-slate-300">{tab.count}</span>
              )}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-20 bg-white rounded-2xl border border-slate-100 p-5 md:p-6">
          {activeTab === 'posts' && <PostsTab posts={data?.posts || []} />}
          {activeTab === 'projects' && (
            <ProfileProjectsGrid
              projects={data?.projects || []}
              isOwner={Boolean(user?.id && p.id && user.id === p.id)}
              builderProfileDocId={p.id}
              onRefresh={refreshProfile}
            />
          )}
          {activeTab === 'tokens' && (
            <ProfileTokensHub
              tokens={(data?.tokens || []) as Record<string, unknown>[]}
              profileSolWallet={primaryWalletsFromProfile(p as Record<string, unknown>).sol_wallet}
            />
          )}
          {activeTab === 'activity' && (
            <ProfileActivitySection
              github={github}
              onchain={onchain}
              profile={p}
              githubContributionSummary={data?.githubContributionSummary}
              contributions={data?.contributions}
              githubPatConfigured={data?.github_pat_configured}
              githubGraphqlError={data?.github_graphql_error}
            />
          )}
          {activeTab === 'services' && <ServicesTab profile={p} />}
        </div>
      </div>
    </div>
  )
}

function PostsTab({ posts }: { posts: any[] }) {
  if (!posts.length) {
    return <EmptyState title="No posts yet" subtitle="This builder hasn't posted anything yet." />
  }
  return (
    <div className="space-y-4">
      {posts.map(post => (
        <div key={post.id} className="p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-slate-50 text-slate-400">{post.post_type}</span>
            <span className="text-[10px] text-slate-300">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          {post.milestone_title && <h3 className="text-sm font-bold text-slate-900 mb-1">{post.milestone_title}</h3>}
          <p className="text-sm text-slate-600 leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-300">
            <span>{post.likes_count || 0} likes</span>
            <span>{post.comments_count || 0} comments</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ServicesTab({ profile }: { profile: any }) {
  if (!profile?.open_for_work) {
    return <EmptyState title="Not available" subtitle="This builder is not currently open for work." />
  }
  return (
    <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Open for work</span>
      </div>
      {profile.hourly_rate_usd && (
        <p className="text-2xl font-black text-slate-900 mb-1">${profile.hourly_rate_usd}/hr</p>
      )}
      <p className="text-xs text-slate-400 capitalize">{profile.availability?.replace('_', ' ')}</p>
    </div>
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center py-16">
      <h3 className="text-lg font-black text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-300">{subtitle}</p>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-48 skeleton" />
      <div className="max-w-4xl mx-auto px-8 -mt-16">
        <div className="flex items-end gap-6 mb-8">
          <div className="w-28 h-28 rounded-3xl skeleton shrink-0" />
          <div className="flex-1 pb-2 space-y-3">
            <div className="w-48 h-6 skeleton rounded" />
            <div className="w-64 h-4 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
        </div>
      </div>
    </div>
  )
}
