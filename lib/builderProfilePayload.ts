import {
  getGitHubStats,
  getGitHubRepoProjects,
  getGitHubContributionSummary,
  getGitHubCommitTotalsGraphqlWithMeta,
  formatGithubRepoCardDescription,
  isGithubPatConfigured,
  normalizeGithubLogin,
  type GitHubCommitTotalsGraphql,
  type GitHubGraphqlCommitsOutcome,
} from '@/lib/github'
import {
  getHeliusTransactions,
  getSolanaDeploymentStats,
  getEvmDeploymentStats,
  mergeEvmDeploymentStats,
  mergeSolanaDeploymentStats,
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
import { allVerifiedWalletsFromProfile, primaryWalletsFromProfile } from '@/lib/builderProfileWallets'
import { looksLikeFirebaseAuthUid } from '@/lib/firebaseUid'
import { enrichGithubReposWithReadmeSummaries } from '@/lib/repoReadmeSummary'

/** README fetch + AI per repo dominates profile latency; remaining repos use `formatGithubRepoCardDescription`. */
const MAX_GITHUB_REPOS_FOR_README_AI = 8

function githubLoginFromStoredOAuth(gd: Record<string, unknown> | undefined): string | null {
  if (!gd || typeof gd !== 'object') return null
  return (
    normalizeGithubLogin(typeof gd.login === 'string' ? gd.login : undefined) ||
    normalizeGithubLogin(typeof gd.username === 'string' ? gd.username : undefined) ||
    normalizeGithubLogin(typeof gd.html_url === 'string' ? gd.html_url : undefined)
  )
}

/** First path segment after github.com/ from manual project repo URLs (owner login or org). */
function githubLoginFromManualProjects(projects: { github_url?: string | null }[]): string | null {
  for (const p of projects) {
    const url = p.github_url
    if (typeof url !== 'string' || !url.trim()) continue
    const login = normalizeGithubLogin(url)
    if (login) return login
  }
  return null
}

function githubLoginFromWebsiteField(website: unknown): string | null {
  if (typeof website !== 'string' || !website.includes('github.com')) return null
  return normalizeGithubLogin(website)
}

/**
 * Resolve GitHub login for API calls: explicit fields → OAuth payload → website (only if URL contains github.com) → project repo URLs.
 */
function effectiveGithubLogin(
  profile: Record<string, unknown> | null | undefined,
  manualProjects: { github_url?: string | null }[] = []
): string | null {
  const fromProfile =
    normalizeGithubLogin(profile?.github_username as string | undefined) ||
    normalizeGithubLogin(profile?.githubUsername as string | undefined) ||
    githubLoginFromStoredOAuth(profile?.github_data as Record<string, unknown> | undefined) ||
    githubLoginFromWebsiteField(profile?.website)
  if (fromProfile) return fromProfile
  return githubLoginFromManualProjects(manualProjects)
}

export type BuilderProfilePayload = Awaited<ReturnType<typeof loadBuilderProfilePayload>>

export async function loadBuilderProfilePayload(username: string) {
  let profile: any = null
  let posts: any[] = []
  let projects: any[] = []
  let followersCount = 0
  let followingCount = 0

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

    // Feed/post links use Firebase uid when builder has no public handle yet; builder_profiles doc may not exist.
    if (!profile && looksLikeFirebaseAuthUid(username)) {
      const userOnly = await db.collection(FS.USERS).doc(username).get()
      if (userOnly.exists) {
        const ud = userOnly.data() || {}
        profile = {
          id: username,
          user_id: username,
          username: null,
          bio: null,
          tagline: null,
          location: null,
          website: null,
          avatar_url: (ud as { avatar_url?: string | null }).avatar_url ?? null,
          banner_url: null,
          github_username: null,
          twitter_handle: null,
          farcaster_handle: null,
          linkedin_url: null,
          telegram_handle: null,
          skills: [],
          open_for_work: false,
          hourly_rate_usd: null,
          availability: null,
        }
      }
    }

    const authUid =
      profile && typeof profile.user_id === 'string' && profile.user_id.trim()
        ? profile.user_id.trim()
        : profile?.id
    if (profile && authUid) {
      const [userDoc, postsSnap, projectsSnap, followersSnap, followingSnap] = await Promise.all([
        db.collection(FS.USERS).doc(authUid).get(),
        db.collection(FS.POSTS).where('author_id', '==', authUid).get(),
        db.collection(FS.PROJECTS).where('builder_id', '==', authUid).get(),
        db.collection(FS.BUILDER_FOLLOWERS).where('builder_id', '==', authUid).get(),
        db.collection(FS.BUILDER_FOLLOWERS).where('follower_id', '==', authUid).get(),
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
      followingCount = followingSnap.size
    }
  }

  const primary = primaryWalletsFromProfile(profile as Record<string, unknown> | null | undefined)
  const wallet = primary.sol_wallet
  const evmWallet = primary.evm_wallet
  const { solAddresses, evmAddresses } = allVerifiedWalletsFromProfile(
    profile as Record<string, unknown> | null | undefined
  )

  const heliusAggregatedPromise =
    solAddresses.length > 0
      ? Promise.all(solAddresses.map((a) => getHeliusTransactions(a))).then((counts) =>
          counts.reduce((s, n) => s + n, 0)
        )
      : Promise.resolve(0)

  const solanaDeploymentsAggregatedPromise =
    solAddresses.length > 0
      ? Promise.all(solAddresses.map((a) => getSolanaDeploymentStats(a))).then(mergeSolanaDeploymentStats)
      : Promise.resolve({ deployedPrograms: 0, walletAgeDays: 0 })

  const evmDeploymentsAggregatedPromise =
    evmAddresses.length > 0
      ? Promise.all(evmAddresses.map((a) => getEvmDeploymentStats(a))).then(mergeEvmDeploymentStats)
      : Promise.resolve({
          deployedContracts: 0,
          walletAgeDays: 0,
          transactionCount: 0,
          gasEthEstimate: null,
        })

  const fcParsed = parseFarcasterHandle(profile?.farcaster_handle)
  const farcasterEnrichedPromise =
    !fcParsed
      ? Promise.resolve(null)
      : fcParsed.kind === 'fid' && fcParsed.fid != null
        ? getFarcasterProfileByFid(fcParsed.fid)
        : getFarcasterProfileByUsername(fcParsed.value)

  const ghLogin = effectiveGithubLogin(profile as Record<string, unknown> | null | undefined, projects)

  const [
    githubStats,
    githubRepos,
    githubContributionSummary,
    graphqlCommitsOutcome,
    heliusTxns,
    solanaDeployments,
    evmDeployments,
    creatorTokens,
    farcasterEnriched,
  ] = await Promise.all([
    ghLogin ? getGitHubStats(ghLogin) : Promise.resolve(null),
    ghLogin ? getGitHubRepoProjects(ghLogin) : Promise.resolve([]),
    ghLogin ? getGitHubContributionSummary(ghLogin) : Promise.resolve(null),
    ghLogin
      ? getGitHubCommitTotalsGraphqlWithMeta(ghLogin)
      : Promise.resolve({ totals: null } as GitHubGraphqlCommitsOutcome),
    heliusAggregatedPromise,
    solanaDeploymentsAggregatedPromise,
    evmDeploymentsAggregatedPromise,
    wallet ? getTokensByCreator(wallet) : Promise.resolve([]),
    farcasterEnrichedPromise,
  ])

  const githubCommitTotalsGraphql = graphqlCommitsOutcome.totals
  const githubGraphqlError = graphqlCommitsOutcome.totals ? null : graphqlCommitsOutcome.error ?? null

  const githubShowcase =
    profile && ghLogin
      ? enrichGithubShowcase(
          githubStats,
          profile.github_data as Record<string, unknown> | undefined,
          ghLogin
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

  const githubStarsFromRepos = githubRepos.reduce((sum, r) => sum + (r.stars || 0), 0)
  const githubLanguagesFromRepos = Array.from(
    new Set(githubRepos.map((r) => r.language).filter((lang): lang is string => Boolean(lang)))
  )

  const reposForReadmeAi =
    ghLogin && githubRepos.length
      ? [...githubRepos]
          .sort((a, b) => (b.stars || 0) - (a.stars || 0))
          .slice(0, MAX_GITHUB_REPOS_FOR_README_AI)
      : []
  const readmeSummaryByRepoId =
    ghLogin && reposForReadmeAi.length > 0
      ? await enrichGithubReposWithReadmeSummaries(ghLogin, reposForReadmeAi)
      : new Map<number, string>()

  const hiddenRaw = profile && typeof profile === 'object' ? (profile as { github_hidden_repo_ids?: unknown }).github_hidden_repo_ids : undefined
  const hiddenGhIds = new Set(
    Array.isArray(hiddenRaw)
      ? hiddenRaw.map((x) => Number(x)).filter((n): n is number => Number.isFinite(n))
      : []
  )

  const mergedProjects = [
    ...(projects || []).map((p: any) => ({ ...p, source: 'manual' })),
    ...githubRepos
      .filter((repo: any) => !hiddenGhIds.has(Number(repo.id)))
      .map((repo: any) => {
        const topicTags = (repo.topics as string[] | undefined)?.filter(Boolean).slice(0, 5) ?? []
        const tagSet = new Set<string>()
        if (repo.language) tagSet.add(repo.language)
        for (const t of topicTags) {
          if (t.toLowerCase() !== 'github') tagSet.add(t)
        }
        tagSet.add('GitHub')
        return {
          id: `gh-${repo.id}`,
          github_repo_id: repo.id,
          title: repo.name,
          description:
            readmeSummaryByRepoId.get(repo.id)?.trim() || formatGithubRepoCardDescription(repo),
          category: repo.language || 'Code',
          status: 'launched',
          github_url: repo.htmlUrl,
          tags: Array.from(tagSet),
          source: 'github',
          stars: repo.stars,
          forks: repo.forks,
          updated_at: repo.updatedAt,
        }
      }),
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
    githubStarsFromRepos,
    githubLanguagesFromRepos,
    postsCount: posts.length,
    verifiedSolanaWalletCount: solAddresses.length,
    verifiedEvmWalletCount: evmAddresses.length,
  })

  return {
    profile: profile || null,
    github: githubStats,
    github_pat_configured: isGithubPatConfigured(),
    github_graphql_error: githubGraphqlError,
    socialShowcase,
    contributions,
    onchain: {
      transactions: heliusTxns,
      wallet,
      evmWallet,
      verifiedSolanaWalletCount: solAddresses.length,
      verifiedEvmWalletCount: evmAddresses.length,
      solanaDeployments,
      evmDeployments,
    },
    posts,
    projects: mergedProjects,
    githubContributionSummary,
    tokens: creatorTokens,
    followersCount,
    followingCount,
  }
}
