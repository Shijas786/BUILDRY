import { getProfile } from '@/lib/talent'
import {
  getGitHubStats,
  getGitHubRepoProjects,
  getGitHubContributionSummary,
  getGitHubCommitTotalsGraphql,
} from '@/lib/github'
import {
  getHeliusTransactions,
  getSolanaDeploymentStats,
  getEvmDeploymentStats,
} from '@/lib/trust'
import { getTokensByCreator } from '@/lib/bags'
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin'
import { FS } from '@/lib/firestoreCollections'
import {
  getFarcasterProfileByFid,
  getFarcasterProfileByUsername,
} from '@/lib/farcaster'
import {
  enrichGithubShowcase,
  linkedinShowcaseFromProfile,
  parseFarcasterHandle,
} from '@/lib/socialShowcase'
import { buildContributionsSnapshot } from '@/lib/builderContributions'
import { primaryWalletsFromProfile } from '@/lib/builderProfileWallets'

export type BuilderProfilePayload = Awaited<ReturnType<typeof loadBuilderProfilePayload>>

export async function loadBuilderProfilePayload(username: string) {
  let profile: any = null
  let posts: any[] = []
  let projects: any[] = []
  let followersCount = 0

  if (isFirebaseAdminConfigured && adminDb) {
    const db = adminDb
    const byUsernameSnap = await db
      .collection(FS.BUILDER_PROFILES)
      .where('username', '==', username)
      .limit(1)
      .get()

    if (!byUsernameSnap.empty) {
      profile = { id: byUsernameSnap.docs[0].id, ...byUsernameSnap.docs[0].data() }
    }

    if (!profile) {
      const byUserIdDoc = await db.collection(FS.BUILDER_PROFILES).doc(username).get()
      if (byUserIdDoc.exists) {
        profile = { id: byUserIdDoc.id, ...byUserIdDoc.data() }
      }
    }

    if (profile?.user_id) {
      const [userDoc, postsSnap, projectsSnap, followersSnap] = await Promise.all([
        db.collection(FS.USERS).doc(profile.user_id).get(),
        db.collection(FS.POSTS).where('author_id', '==', profile.user_id).get(),
        db.collection(FS.PROJECTS).where('builder_id', '==', profile.user_id).get(),
        db.collection(FS.BUILDER_FOLLOWERS).where('builder_id', '==', profile.user_id).get(),
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

  const { sol_wallet: wallet, evm_wallet: evmWallet } = primaryWalletsFromProfile(
    profile as Record<string, unknown> | null | undefined
  )

  const fcParsed = parseFarcasterHandle(profile?.farcaster_handle)
  const farcasterEnrichedPromise =
    !fcParsed
      ? Promise.resolve(null)
      : fcParsed.kind === 'fid' && fcParsed.fid != null
        ? getFarcasterProfileByFid(fcParsed.fid)
        : getFarcasterProfileByUsername(fcParsed.value)

  const [
    talentProfile,
    githubStats,
    githubRepos,
    githubContributionSummary,
    githubCommitTotalsGraphql,
    heliusTxns,
    solanaDeployments,
    evmDeployments,
    creatorTokens,
    farcasterEnriched,
  ] = await Promise.all([
    wallet ? getProfile(wallet) : Promise.resolve(null),
    profile?.github_username ? getGitHubStats(profile.github_username) : Promise.resolve(null),
    profile?.github_username ? getGitHubRepoProjects(profile.github_username) : Promise.resolve([]),
    profile?.github_username ? getGitHubContributionSummary(profile.github_username) : Promise.resolve(null),
    profile?.github_username ? getGitHubCommitTotalsGraphql(profile.github_username) : Promise.resolve(null),
    wallet ? getHeliusTransactions(wallet) : Promise.resolve(0),
    wallet ? getSolanaDeploymentStats(wallet) : Promise.resolve({ deployedPrograms: 0, walletAgeDays: 0 }),
    evmWallet ? getEvmDeploymentStats(evmWallet) : Promise.resolve({ deployedContracts: 0, walletAgeDays: 0 }),
    wallet ? getTokensByCreator(wallet) : Promise.resolve([]),
    farcasterEnrichedPromise,
  ])

  const githubShowcase =
    profile && profile.github_username
      ? enrichGithubShowcase(
          githubStats,
          profile.github_data as Record<string, unknown> | undefined,
          profile.github_username
        )
      : null

  const linkedinRaw = profile ? linkedinShowcaseFromProfile(profile) : null
  const linkedinShowcase = linkedinRaw ? { ...linkedinRaw, email: null } : null

  const farcasterStored =
    profile?.farcaster_data && typeof profile.farcaster_data === 'object'
      ? (profile.farcaster_data as Record<string, unknown>)
      : null

  const socialShowcase = {
    linkedin: linkedinShowcase,
    github: githubShowcase,
    farcaster: farcasterEnriched,
    farcasterFromConnect: farcasterStored,
  }

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

  const contributions = buildContributionsSnapshot({
    wallet,
    evmWallet,
    githubStats,
    githubContributionSummary,
    githubCommitTotalsGraphql,
    heliusTxns,
    solanaDeployments,
    evmDeployments,
    mergedProjectCount: mergedProjects.length,
    manualProjectCount: projects.length,
    githubRepoProjectCount: githubRepos.length,
    postsCount: posts.length,
  })

  return {
    profile: profile || null,
    talent: talentProfile,
    github: githubStats,
    socialShowcase,
    contributions,
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
  }
}
