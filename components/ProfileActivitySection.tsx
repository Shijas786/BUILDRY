'use client'

import React, { useState } from 'react'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'
import { chainIconSrc } from '@/lib/chainIcons'

function InfoHint({ title }: { title?: string }) {
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[10px] font-bold text-slate-400"
      title={title}
    >
      i
    </span>
  )
}

function lastNDaysCounts(points: { date: string; count: number }[] | undefined, n: number): number[] {
  if (!points?.length) return []
  const slice = points.slice(-n)
  return slice.map((p) => p.count)
}

function ActivitySparkline({ counts, variant }: { counts: number[]; variant: 'line' | 'area' }) {
  const w = 320
  const h = 56
  const padX = 2
  const padY = 4
  if (!counts.length) {
    return <div className="mt-4 h-14 w-full rounded-xl border border-slate-100 bg-slate-50/80" />
  }
  const max = Math.max(...counts, 1)
  const n = counts.length
  const step = n > 1 ? (w - 2 * padX) / (n - 1) : 0
  const pts = counts.map((v, i) => {
    const x = padX + i * step
    const y = h - padY - (v / max) * (h - 2 * padY)
    return [x, y] as const
  })
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const areaD = `${pathD} L${last[0].toFixed(1)},${h - padY} L${first[0].toFixed(1)},${h - padY} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-14 w-full text-blue-500" preserveAspectRatio="none" aria-hidden>
      {variant === 'area' && <path d={areaD} fill="rgb(59 130 246 / 0.12)" stroke="none" />}
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function BreakdownHeader() {
  return (
    <p className="border-b border-slate-100 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">Breakdown</p>
  )
}

export type ActivityBreakdownRow = { label: string; value: string; iconSrc?: string }

function BreakdownRowIcon({ iconSrc, label }: { iconSrc?: string; label: string }) {
  const [failed, setFailed] = useState(false)
  const letter = label.replace(/[^a-zA-Z0-9]/g, '').charAt(0) || '·'
  if (!iconSrc || failed) {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-black uppercase text-slate-500 ring-1 ring-slate-200/80">
        {letter}
      </span>
    )
  }
  return (
    <img
      src={iconSrc}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 rounded-full object-cover ring-1 ring-slate-200/80 bg-white"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function ActivityTile({
  title,
  titleHint,
  primary,
  breakdown,
  footer,
  extra,
}: {
  title: string
  titleHint?: string
  primary: React.ReactNode
  breakdown?: ActivityBreakdownRow[]
  footer?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-slate-200 hover:shadow-md md:p-8">
      <div className="mb-5 flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
        <InfoHint title={titleHint} />
      </div>
      <div className="mb-6 text-3xl font-black tabular-nums tracking-tight text-slate-900 md:text-4xl">{primary}</div>
      {breakdown && breakdown.length > 0 && (
        <div className="space-y-3">
          <BreakdownHeader />
          {breakdown.map((row, idx) => (
            <div key={`${idx}-${row.label}`} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex min-w-0 items-center gap-2">
                <BreakdownRowIcon iconSrc={row.iconSrc} label={row.label} />
                <span className="truncate font-bold text-slate-600">{row.label}</span>
              </div>
              <span className="shrink-0 font-black tabular-nums text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      )}
      {extra}
      {footer ? (
        <p className="mt-6 text-right text-[9px] font-bold uppercase italic tracking-widest text-slate-400">{footer}</p>
      ) : null}
    </div>
  )
}

export type ProfileActivitySectionProps = {
  github: any
  onchain: any
  profile: any
  githubContributionSummary: any
  contributions?: BuilderContributionsSnapshot
  /** Server has GITHUB_TOKEN / GITHUB_GRAPHQL_TOKEN (not the secret). */
  githubPatConfigured?: boolean
  /** Short GraphQL failure reason when PAT is set but commit totals missing. */
  githubGraphqlError?: string | null
}

export default function ProfileActivitySection({
  github,
  onchain,
  profile,
  githubContributionSummary,
  contributions,
  githubPatConfigured = false,
  githubGraphqlError,
}: ProfileActivitySectionProps) {
  const solTx = onchain?.transactions ?? profile?.sol_transactions ?? 0
  const evmTx = onchain?.evmDeployments?.transactionCount ?? 0
  const gasEth = onchain?.evmDeployments?.gasEthEstimate as string | null | undefined
  const solPrograms = onchain?.solanaDeployments?.deployedPrograms ?? 0
  const evmContracts = onchain?.evmDeployments?.deployedContracts ?? 0
  const evmChainsQueried = onchain?.evmDeployments?.evmChainsQueried
  const evmByChain = onchain?.evmDeployments?.evmByChain
  const verifiedSolWallets = onchain?.verifiedSolanaWalletCount ?? (onchain?.wallet ? 1 : 0)
  const verifiedEvmWallets = onchain?.verifiedEvmWalletCount ?? (onchain?.evmWallet ? 1 : 0)

  const commitTotal = contributions?.github?.graphqlCommitContributionsTotal
  const activity365 = contributions?.github?.activityPoints365d ?? githubContributionSummary?.totalContributions ?? 0
  const postsCount = contributions?.posts ?? 0
  const projectsTotal = contributions?.projects?.total ?? 0
  const signalTotal = activity365 + solTx + evmTx + postsCount

  const points = githubContributionSummary?.points as { date: string; count: number }[] | undefined
  const series180 = lastNDaysCounts(points, 180)
  const sum180 = series180.reduce((a, b) => a + b, 0)

  const graphqlCommitsHint =
    commitTotal != null
      ? null
      : githubPatConfigured && githubGraphqlError
        ? githubGraphqlError.length > 120
          ? `${githubGraphqlError.slice(0, 117)}…`
          : githubGraphqlError
        : githubPatConfigured
          ? 'Could not load commit totals (check GitHub username matches your login).'
          : 'Add GITHUB_TOKEN or GITHUB_GRAPHQL_TOKEN on the server (classic PAT: read:user). Redeploy.'

  const totalTxDisplay = solTx + evmTx
  const gasPrimary = gasEth != null && gasEth !== '' ? `${gasEth} ETH` : '—'

  const walletRollupNote =
    verifiedEvmWallets > 1 || verifiedSolWallets > 1
      ? ` Summed across ${verifiedSolWallets} verified Solana and ${verifiedEvmWallets} verified EVM address(es).`
      : ''

  const evmTxHint =
    evmChainsQueried != null && evmChainsQueried > 0
      ? `EVM: summed outgoing tx count (nonce) across ~${evmChainsQueried} Alchemy networks per address, plus Ethereum L1 sample from Etherscan when configured — not one uniform metric.`
      : 'Ethereum: last page from Etherscan (not full lifetime). Enable ALCHEMY_API_KEY for multi-chain EVM nonces.'

  const evmDeployHint =
    evmChainsQueried != null && evmChainsQueried > 0
      ? 'EVM: Zerion (when `ZERION_API_KEY` is set) counts `deploy` operations across chains; we take the higher of that total and Alchemy/Etherscan heuristics. L2: Alchemy null-`to` transfers (incl. zero-ETH). L1: Etherscan `contractAddress` / empty `to` in the tx sample.'
      : 'EVM: With Zerion, `deploy` txs are counted multi-chain; otherwise Ethereum uses Etherscan creation rows in the sample.'

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ActivityTile
          title="Buildry signals"
          titleHint="Combined index from GitHub public-activity (365d), sampled on-chain txs, and posts on Buildry — not a third-party score."
          primary={signalTotal > 0 ? signalTotal.toLocaleString() : '—'}
          breakdown={[
            { label: 'GitHub activity (365d)', value: activity365.toLocaleString() },
            { label: 'On-chain txs (sample)', value: (solTx + evmTx).toLocaleString() },
            { label: 'Posts on Buildry', value: String(postsCount) },
            { label: 'Projects listed', value: String(projectsTotal) },
            ...(github?.totalStars
              ? [{ label: 'GitHub stars', value: Number(github.totalStars).toLocaleString() }]
              : []),
          ]}
          footer="Our data only"
        />

        <ActivityTile
          title="Total transactions"
          titleHint={`Solana: Helius tx sample per verified wallet, summed.${walletRollupNote} ${evmTxHint}`}
          primary={totalTxDisplay.toLocaleString()}
          breakdown={[
            {
              label: `Solana (sample${verifiedSolWallets > 1 ? ` · ${verifiedSolWallets} wallets` : ''})`,
              value: Number(solTx).toLocaleString(),
              iconSrc: chainIconSrc('solana'),
            },
            {
              label: `EVM (rollup${verifiedEvmWallets > 1 ? ` · ${verifiedEvmWallets} wallets` : ''})`,
              value: Number(evmTx).toLocaleString(),
              iconSrc: chainIconSrc('eth-mainnet'),
            },
            ...(evmByChain && evmByChain.length
              ? evmByChain.slice(0, 8).map(
                  (c: { name: string; slug: string; transactionCount: number; deployedContracts: number }) => ({
                    label: c.name,
                    value: `${c.transactionCount} tx · ${c.deployedContracts} deploy est.`,
                    iconSrc: chainIconSrc(c.slug),
                  })
                )
              : []),
            ...(evmByChain && evmByChain.length > 8
              ? [{ label: '…', value: `+${evmByChain.length - 8} more chains` }]
              : []),
          ]}
          footer={evmChainsQueried != null ? `${evmChainsQueried} EVM networks queried` : 'Recent sample'}
        />

        <ActivityTile
          title="Gas fees (est.)"
          titleHint={`Sum of gasUsed × gasPrice for Ethereum L1 txs from Etherscan (up to 1000 per verified EVM wallet).${walletRollupNote}`}
          primary={gasPrimary}
          breakdown={[
            {
              label: 'Ethereum L1',
              value: gasEth != null && gasEth !== '' ? `${gasEth} ETH` : '—',
              iconSrc: chainIconSrc('etherscan-mainnet'),
            },
          ]}
          footer="Etherscan window"
        />

        <ActivityTile
          title="Deployments (est.)"
          titleHint={`Solana: deploy/create-style txs in Helius sample, summed per wallet.${walletRollupNote} ${evmDeployHint}`}
          primary={(solPrograms + evmContracts).toLocaleString()}
          breakdown={[
            {
              label: `Solana programs (est.${verifiedSolWallets > 1 ? ` · ${verifiedSolWallets} wallets` : ''})`,
              value: `${solPrograms}`,
              iconSrc: chainIconSrc('solana'),
            },
            {
              label: `EVM contracts (est.${verifiedEvmWallets > 1 ? ` · ${verifiedEvmWallets} wallets` : ''})`,
              value: `${evmContracts}`,
              iconSrc: chainIconSrc('eth-mainnet'),
            },
          ]}
          footer="Heuristic · sampled"
        />

        <ActivityTile
          title="GitHub commits (graph)"
          titleHint="Total commit contributions from GitHub GraphQL when a server token is configured."
          primary={commitTotal != null ? commitTotal.toLocaleString() : '—'}
          breakdown={
            commitTotal != null
              ? [{ label: 'GitHub (GraphQL)', value: `${commitTotal.toLocaleString()} commits` }]
              : [{ label: 'GitHub (GraphQL)', value: graphqlCommitsHint || '—' }]
          }
          footer="365D · calendar rules"
          extra={<ActivitySparkline counts={series180.length ? series180 : lastNDaysCounts(points, 365)} variant="line" />}
        />

        <ActivityTile
          title="GitHub contributions"
          titleHint="With a server GitHub PAT, uses GraphQL contribution counts (same family as the green graph). Otherwise an estimate from recent public events (~300 max)."
          primary={activity365.toLocaleString()}
          breakdown={[
            { label: '365d activity points', value: activity365.toLocaleString() },
            ...(sum180 > 0 ? [{ label: 'Last 180d (same series)', value: sum180.toLocaleString() }] : []),
          ]}
          footer="365D sum"
          extra={<ActivitySparkline counts={series180.length ? series180 : lastNDaysCounts(points, 365)} variant="area" />}
        />
      </div>

      {github?.topLanguages && github.topLanguages.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Languages</p>
          <div className="flex flex-wrap items-center gap-2">
            {github.topLanguages.map((l: string) => (
              <span
                key={l}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-800"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {points && points.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Contribution heatmap (last 365 days)
          </p>
          <div className="flex flex-wrap gap-[3px] rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            {points.map((pt: { date: string; count: number }) => {
              const level =
                pt.count >= 8
                  ? 'bg-emerald-600'
                  : pt.count >= 4
                    ? 'bg-emerald-500'
                    : pt.count >= 2
                      ? 'bg-emerald-300'
                      : pt.count >= 1
                        ? 'bg-emerald-200'
                        : 'bg-slate-200'
              return (
                <div
                  key={pt.date}
                  title={`${pt.date}: ${pt.count}`}
                  className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${level}`}
                />
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500">
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
