import { NextRequest, NextResponse } from 'next/server'
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
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params

  let profile: any = null
  let posts: any[] = []
  let projects: any[] = []
  let followersCount = 0

  if (isFirebaseAdminConfigured && adminDb) {
    const db = adminDb
    const byUsernameSnap = await db
      .collection('builder_profiles')
      .where('username', '==', username)
      .limit(1)
      .get()

    if (!byUsernameSnap.empty) {
      profile = { id: byUsernameSnap.docs[0].id, ...byUsernameSnap.docs[0].data() }
    }

    if (!profile) {
      const byUserIdDoc = await db.collection('builder_profiles').doc(username).get()
      if (byUserIdDoc.exists) {
        profile = { id: byUserIdDoc.id, ...byUserIdDoc.data() }
      }
    }

    if (profile?.user_id) {
      const [userDoc, postsSnap, projectsSnap, followersSnap] = await Promise.all([
        db.collection('users').doc(profile.user_id).get(),
        db.collection('posts').where('author_id', '==', profile.user_id).get(),
        db.collection('projects').where('builder_id', '==', profile.user_id).get(),
        db.collection('builder_followers').where('builder_id', '==', profile.user_id).get(),
      ])

      profile.users = userDoc.exists ? userDoc.data() : null
      posts = postsSnap.docs
        .map((postDoc) => ({ id: postDoc.id, ...postDoc.data() }))
        .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0))
        .slice(0, 20)
      projects = projectsSnap.docs
        .map((projectDoc) => ({ id: projectDoc.id, ...projectDoc.data() }))
        .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0))
      followersCount = followersSnap.size
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
