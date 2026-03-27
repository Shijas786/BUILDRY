import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProfile } from '@/lib/talent'
import {
  getGitHubStats,
  getGitHubRepoProjects,
  getGitHubContributionSummary,
} from '@/lib/github'
import {
  getHeliusTransactions,
  getSolanaDeploymentStats,
  getEvmDeploymentStats,
} from '@/lib/trust'
import { getTokensByCreator } from '@/lib/bags'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const hasSupabase = !!(supabaseUrl && supabaseKey)

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params

  let profile: any = null
  let posts: any[] = []
  let projects: any[] = []
  let followersCount = 0

  if (hasSupabase) {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data } = await supabase
      .from('builder_profiles')
      .select('*, users(*)')
      .eq('username', username)
      .single()
    profile = data

    // Fallback: allow stable profile route by user_id too.
    if (!profile) {
      const { data: byUserId } = await supabase
        .from('builder_profiles')
        .select('*, users(*)')
        .eq('user_id', username)
        .single()
      profile = byUserId
    }

    if (profile) {
      const [postsRes, projectsRes, followersRes] = await Promise.all([
        supabase.from('posts').select('*').eq('author_id', profile.user_id).order('created_at', { ascending: false }).limit(20),
        supabase.from('projects').select('*').eq('builder_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('builder_followers').select('*', { count: 'exact', head: true }).eq('builder_id', profile.id),
      ])
      posts = postsRes.data || []
      projects = projectsRes.data || []
      followersCount = followersRes.count || 0
    }
  }

  const wallet = profile?.sol_wallet || null
  const evmWallet = profile?.evm_wallet || null

  const [
    talentProfile,
    githubStats,
    githubRepos,
    githubContributionSummary,
    heliusTxns,
    solanaDeployments,
    evmDeployments,
    creatorTokens,
  ] = await Promise.all([
    wallet ? getProfile(wallet) : Promise.resolve(null),
    profile?.github_username ? getGitHubStats(profile.github_username) : Promise.resolve(null),
    profile?.github_username ? getGitHubRepoProjects(profile.github_username) : Promise.resolve([]),
    profile?.github_username ? getGitHubContributionSummary(profile.github_username) : Promise.resolve(null),
    wallet ? getHeliusTransactions(wallet) : Promise.resolve(0),
    wallet ? getSolanaDeploymentStats(wallet) : Promise.resolve({ deployedPrograms: 0, walletAgeDays: 0 }),
    evmWallet ? getEvmDeploymentStats(evmWallet) : Promise.resolve({ deployedContracts: 0, walletAgeDays: 0 }),
    wallet ? getTokensByCreator(wallet) : Promise.resolve([]),
  ])

  const mergedProjects = [
    ...(projects || []).map((p: any) => ({ ...p, source: 'manual' })),
    ...githubRepos.map((repo: any) => ({
      id: `gh-${repo.id}`,
      title: repo.name,
      description: repo.description || 'Open source project imported from GitHub.',
      category: repo.language || 'Code',
      status: 'launched',
      github_url: repo.htmlUrl,
      tags: [repo.language, 'GitHub'].filter(Boolean),
      source: 'github',
      stars: repo.stars,
      forks: repo.forks,
      updated_at: repo.updatedAt,
    })),
  ]

  return NextResponse.json({
    profile: profile || null,
    talent: talentProfile,
    github: githubStats,
    onchain: {
      transactions: heliusTxns,
      wallet,
      evmWallet,
      solanaDeployments,
      evmDeployments,
    },
    posts,
    projects: mergedProjects,
    githubContributionSummary,
    tokens: creatorTokens,
    followersCount,
  }, {
    headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=60' },
  })
}
