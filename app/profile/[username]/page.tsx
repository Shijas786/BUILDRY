'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import FollowButton from '@/components/FollowButton'
import { farcasterShowcaseFromStored } from '@/lib/socialShowcase'
import { looksLikeFirebaseAuthUid } from '@/lib/firebaseUid'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

interface ProfileData {
  profile: any
  talent: any
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
          <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">Solana · Helius</p>
          <p className="text-lg font-black text-slate-900 tabular-nums">{c.solana.heliusTransactionsSampled}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">tx sample</p>
          {c.solana.wallet && (
            <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={c.solana.wallet}>
              {shortAddr(c.solana.wallet)}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100">
          <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">Programs (est.)</p>
          <p className="text-lg font-black text-slate-900 tabular-nums">{c.solana.programsDeployedEstimate}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">deploy/create heuristic</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">EVM contracts (est.)</p>
          <p className="text-lg font-black text-slate-900 tabular-nums">{c.evm.contractsDeployedEstimate}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Etherscan mainnet</p>
          {c.evm.wallet && (
            <p className="text-[9px] font-mono text-slate-400 mt-1 truncate" title={c.evm.wallet}>
              {shortAddr(c.evm.wallet)}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projects listed</p>
          <p className="text-lg font-black text-slate-900 tabular-nums">{c.projects.total}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">
            {c.projects.manual} manual · {c.projects.fromGitHub} GitHub
          </p>
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
      <div className="mb-8 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
        AI builder summary is off. Set <span className="font-mono">ANTHROPIC_API_KEY</span> on the server to enable Claude-powered
        profile copy from LinkedIn, GitHub, Farcaster, and on-chain signals.
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

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then(r => r.json())
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
  const talent = data?.talent
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
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'posts', label: 'Posts', count: data?.posts.length },
    { id: 'projects', label: 'Projects', count: data?.projects.length },
    ...(hasTokens ? [{ id: 'tokens' as Tab, label: 'Tokens', count: data?.tokens.length }] : []),
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
      {/* Banner */}
      <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-50 relative">
        {p.banner_url && <img src={p.banner_url} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 -mt-14 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mb-6">
        <div className="flex items-end gap-6 mb-5">
          <div className="w-28 h-28 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden shrink-0">
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
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight truncate">
                {p.username || p.users?.name || username}
              </h1>
              {p.talent_protocol_verified && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                  Verified
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                {p.users?.account_type || 'builder'}
              </span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-300 mb-1">@{p.username || username}</p>
            {p.tagline && <p className="text-sm text-slate-500 truncate">{p.tagline}</p>}
          </div>
          <FollowButton builderId={p.id} />
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

        {/* Reputation stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <InfoGroup
            title="Reputation"
            items={[
              { label: 'Builder Score', value: talent?.score || p.overall_score || 0 },
              { label: 'Followers', value: data?.followersCount || 0 },
            ]}
          />
          <InfoGroup
            title="Code Proof"
            items={[
              { label: 'GitHub Stars', value: github?.totalStars || p.github_stars || 0 },
              { label: 'Repos', value: github?.publicRepos || p.github_repos || 0 },
            ]}
          />
          <InfoGroup
            title="Onchain Footprint"
            items={[
              { label: 'Onchain Txns', value: onchain?.transactions || p.sol_transactions || 0 },
              { label: 'EVM Contracts', value: onchain?.evmDeployments?.deployedContracts || 0 },
            ]}
          />
        </div>

        <BuilderContributionsGrid c={data?.contributions} />

        {/* Skills */}
        {p.skills && p.skills.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {p.skills.map((s: string) => (
              <span key={s} className="px-3 py-1 rounded-md bg-slate-100/80 text-[10px] font-bold text-slate-600 border border-slate-200/60">{s}</span>
            ))}
            {github?.topLanguages?.filter((l: string) => !p.skills.includes(l)).slice(0, 4).map((l: string) => (
              <span key={l} className="px-3 py-1 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100">{l}</span>
            ))}
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
          {activeTab === 'projects' && <ProjectsTab projects={data?.projects || []} />}
          {activeTab === 'tokens' && <TokensTab tokens={data?.tokens || []} />}
          {activeTab === 'activity' && (
            <ActivityTab
              github={github}
              onchain={onchain}
              profile={p}
              githubContributionSummary={data?.githubContributionSummary}
            />
          )}
          {activeTab === 'services' && <ServicesTab profile={p} />}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}

function InfoGroup({ title, items }: { title: string; items: { label: string; value: number | string }[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
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

function ProjectsTab({ projects }: { projects: any[] }) {
  if (!projects.length) {
    return <EmptyState title="No projects yet" subtitle="Projects will appear here once added." />
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map(proj => (
        <div key={proj.id} className="p-5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${proj.status === 'launched' ? 'bg-emerald-500' : proj.status === 'building' ? 'bg-amber-500' : 'bg-slate-300'}`} />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{proj.status}</span>
            {proj.source && (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${proj.source === 'github' ? 'text-violet-600 bg-violet-50' : 'text-slate-500 bg-slate-50'}`}>
                {proj.source}
              </span>
            )}
            {proj.has_token && <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Token</span>}
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">{proj.title}</h3>
          <p className="text-xs text-slate-400 line-clamp-2">{proj.description}</p>
          {proj.tags && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {proj.tags.slice(0, 4).map((t: string) => (
                <span key={t} className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-400">{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ActivityTab({
  github,
  onchain,
  profile,
  githubContributionSummary,
}: {
  github: any
  onchain: any
  profile: any
  githubContributionSummary: any
}) {
  const stats = [
    { label: 'GitHub Repos', value: github?.publicRepos || profile?.github_repos || 0 },
    { label: 'GitHub Stars', value: github?.totalStars || profile?.github_stars || 0 },
    { label: 'GitHub Followers', value: github?.followers || 0 },
    { label: 'SOL Transactions', value: onchain?.transactions || profile?.sol_transactions || 0 },
    { label: 'SOL Programs', value: onchain?.solanaDeployments?.deployedPrograms || 0 },
    { label: 'EVM Contracts', value: onchain?.evmDeployments?.deployedContracts || 0 },
    { label: 'Wallet Age (days)', value: onchain?.solanaDeployments?.walletAgeDays || profile?.sol_wallet_age_days || 0 },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>
      {github?.topLanguages && github.topLanguages.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Languages</p>
          <div className="flex items-center gap-2 flex-wrap">
            {github.topLanguages.map((l: string) => (
              <span key={l} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold">{l}</span>
            ))}
          </div>
        </div>
      )}

      {githubContributionSummary?.points?.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">GitHub Contributions (Last 365 days)</p>
          <div className="flex flex-wrap gap-[2px] bg-slate-50 p-3 rounded-xl border border-slate-100">
            {githubContributionSummary.points.map((pt: any) => {
              const level =
                pt.count >= 8 ? 'bg-emerald-600' :
                pt.count >= 4 ? 'bg-emerald-500' :
                pt.count >= 2 ? 'bg-emerald-300' :
                pt.count >= 1 ? 'bg-emerald-200' :
                'bg-slate-200'
              return (
                <div
                  key={pt.date}
                  title={`${pt.date}: ${pt.count} contributions`}
                  className={`w-2.5 h-2.5 rounded-[2px] ${level} shrink-0`}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-6 mt-3 text-[10px] text-slate-400 font-bold">
            <span>Total: {githubContributionSummary.totalContributions}</span>
            <span>Active days: {githubContributionSummary.activeDays}</span>
            <span>Current streak: {githubContributionSummary.currentStreak}</span>
            <span>Longest streak: {githubContributionSummary.longestStreak}</span>
          </div>
        </div>
      )}
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

function TokensTab({ tokens }: { tokens: any[] }) {
  if (!tokens.length) {
    return <EmptyState title="No tokens launched" subtitle="This builder hasn't launched any tokens yet." />
  }

  const totalMcap = tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0)
  const totalVolume = tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0)
  const totalHolders = tokens.reduce((sum, t) => sum + (t.holders || 0), 0)

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tokens Launched" value={tokens.length} />
        <StatCard label="Total Market Cap" value={`$${formatCompact(totalMcap)}`} />
        <StatCard label="24h Volume" value={`$${formatCompact(totalVolume)}`} />
        <StatCard label="Total Holders" value={totalHolders.toLocaleString()} />
      </div>

      {/* Token list */}
      <div className="space-y-4">
        {tokens.map((token, i) => (
          <Link
            key={token.mint || i}
            href={`/token/${token.mint}`}
            className="block p-5 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-4">
              {/* Token icon */}
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                {token.imageUrl ? (
                  <img src={token.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-black text-slate-300">
                    {(token.symbol || '?').charAt(0)}
                  </div>
                )}
              </div>

              {/* Token info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {token.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">${token.symbol}</span>
                </div>
                {token.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 mb-3">{token.description}</p>
                )}

                {/* Performance metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <MetricPill label="Price" value={`$${token.price < 0.01 ? token.price.toFixed(6) : token.price.toFixed(4)}`} />
                  <MetricPill
                    label="24h"
                    value={`${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h?.toFixed(1)}%`}
                    color={token.priceChange24h >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}
                  />
                  <MetricPill label="Mcap" value={`$${formatCompact(token.marketCap || 0)}`} />
                  <MetricPill label="Volume" value={`$${formatCompact(token.volume24h || 0)}`} />
                  <MetricPill label="Holders" value={(token.holders || 0).toLocaleString()} />
                </div>

                {/* Extra: Liquidity & Fee APY */}
                {(token.liquidity > 0 || token.feeApy > 0) && (
                  <div className="flex items-center gap-4 mt-3">
                    {token.liquidity > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        Liquidity: <span className="text-slate-600">${formatCompact(token.liquidity)}</span>
                      </span>
                    )}
                    {token.feeApy > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        Fee APY: <span className="text-emerald-600">{token.feeApy.toFixed(1)}%</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Trade CTA */}
              <div className="shrink-0 self-center">
                <span className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Trade
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MetricPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={`px-3 py-2 rounded-xl ${color || 'bg-slate-50 text-slate-600'}`}>
      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-black tabular-nums">{value}</p>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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
