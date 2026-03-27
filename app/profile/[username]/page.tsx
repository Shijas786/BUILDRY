'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import FollowButton from '@/components/FollowButton'

interface ProfileData {
  profile: any
  talent: any
  github: any
  onchain: any
  posts: any[]
  projects: any[]
  githubContributionSummary: any
  tokens: any[]
  followersCount: number
}

type Tab = 'posts' | 'projects' | 'tokens' | 'activity' | 'services'

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('posts')

  useEffect(() => {
    fetch(`/api/profile/${username}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <ProfileSkeleton />

  const p = data?.profile
  const talent = data?.talent
  const github = data?.github
  const onchain = data?.onchain

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

  return (
    <div className="min-h-screen bg-slate-50/40">
      {/* Banner */}
      <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-50 relative">
        {p.banner_url && <img src={p.banner_url} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 -mt-14 relative z-10">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 mb-6">
        <div className="flex items-end gap-6 mb-5">
          <div className="w-28 h-28 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden shrink-0">
            {(p.avatar_url || github?.avatarUrl) ? (
              <img src={p.avatar_url || github?.avatarUrl} alt="" className="w-full h-full object-cover" />
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
          <span>{data?.followersCount || 0} followers</span>
        </div>

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
