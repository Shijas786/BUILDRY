import type {
  GitHubStats,
  GitHubContributionSummary,
  GitHubCommitTotalsGraphql,
} from '@/lib/github'
import type { SolanaDeploymentStats, EvmDeploymentStats } from '@/lib/trust'

export type BuilderContributionsSnapshot = {
  github: {
    publicRepos: number
    totalStars: number
    followers: number
    /** Public-activity score from recent events (not exact commit count). */
    activityPoints365d: number
    /**
     * Commit counts from GitHub GraphQL `contributionsCollection` (green-graph rules), summed over `graphqlCommitYears`.
     * Non-null only when the server has `GITHUB_GRAPHQL_TOKEN` or `GITHUB_TOKEN`.
     */
    graphqlCommitContributionsTotal: number | null
    graphqlCommitContributionsYears: number[] | null
    activeDays365d: number
    currentStreakDays: number
    longestStreakDays: number
    topLanguages: string[]
  } | null
  solana: {
    wallet: string | null
    /** Sampled tx count from Helius (limited page). */
    heliusTransactionsSampled: number
    /** Heuristic from recent txs (deploy/create patterns). */
    programsDeployedEstimate: number
    walletAgeDaysEstimate: number
  }
  evm: {
    wallet: string | null
    /** Heuristic: contract-creation style txs (Etherscan). */
    contractsDeployedEstimate: number
    walletAgeDaysEstimate: number
  }
  projects: {
    total: number
    manual: number
    fromGitHub: number
  }
  posts: number
}

export function buildContributionsSnapshot(params: {
  wallet: string | null
  evmWallet: string | null
  githubStats: GitHubStats | null
  githubContributionSummary: GitHubContributionSummary | null
  githubCommitTotalsGraphql: GitHubCommitTotalsGraphql | null
  heliusTxns: number
  solanaDeployments: SolanaDeploymentStats
  evmDeployments: EvmDeploymentStats
  mergedProjectCount: number
  manualProjectCount: number
  githubRepoProjectCount: number
  /** Sum of stars on imported repo cards (when user API failed). */
  githubStarsFromRepos?: number
  /** Languages from imported repos (when user API failed). */
  githubLanguagesFromRepos?: string[]
  postsCount: number
}): BuilderContributionsSnapshot {
  const gh = params.githubStats
  const ghc = params.githubContributionSummary
  const gqlCommits = params.githubCommitTotalsGraphql

  const hasGitHubSignal =
    gh != null ||
    ghc != null ||
    gqlCommits != null ||
    params.githubRepoProjectCount > 0

  const starsFallback = params.githubStarsFromRepos ?? 0
  const langsFallback = (params.githubLanguagesFromRepos ?? []).slice(0, 6)

  return {
    github: hasGitHubSignal
      ? {
          publicRepos: gh?.publicRepos ?? params.githubRepoProjectCount,
          totalStars: gh?.totalStars ?? starsFallback,
          followers: gh?.followers ?? 0,
          activityPoints365d: ghc?.totalContributions ?? 0,
          activeDays365d: ghc?.activeDays ?? 0,
          currentStreakDays: ghc?.currentStreak ?? 0,
          longestStreakDays: ghc?.longestStreak ?? 0,
          topLanguages: gh?.topLanguages?.length ? gh.topLanguages : langsFallback,
          graphqlCommitContributionsTotal: gqlCommits?.totalCommits ?? null,
          graphqlCommitContributionsYears: gqlCommits?.yearsIncluded ?? null,
        }
      : null,
    solana: {
      wallet: params.wallet,
      heliusTransactionsSampled: params.heliusTxns,
      programsDeployedEstimate: params.solanaDeployments.deployedPrograms,
      walletAgeDaysEstimate: params.solanaDeployments.walletAgeDays,
    },
    evm: {
      wallet: params.evmWallet,
      contractsDeployedEstimate: params.evmDeployments.deployedContracts,
      walletAgeDaysEstimate: params.evmDeployments.walletAgeDays,
    },
    projects: {
      total: params.mergedProjectCount,
      manual: params.manualProjectCount,
      fromGitHub: params.githubRepoProjectCount,
    },
    posts: params.postsCount,
  }
}
