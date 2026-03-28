'use client'

import React from 'react'
import type { BuilderContributionsSnapshot } from '@/lib/builderContributions'

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
  breakdown?: { label: string; value: string }[]
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
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded border border-slate-200 bg-slate-50" />
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
  talent: any
}

export default function ProfileActivitySection({
  github,
  onchain,
  profile,
  githubContributionSummary,
  contributions,
  talent,
}: ProfileActivitySectionProps) {
  const solTx = onchain?.transactions ?? profile?.sol_transactions ?? 0
  const evmTx = onchain?.evmDeployments?.transactionCount ?? 0
  const gasEth = onchain?.evmDeployments?.gasEthEstimate as string | null | undefined
  const solPrograms = onchain?.solanaDeployments?.deployedPrograms ?? 0
  const evmContracts = onchain?.evmDeployments?.deployedContracts ?? 0
  const talentScore = talent?.score ?? profile?.overall_score ?? null

  const commitTotal = contributions?.github?.graphqlCommitContributionsTotal
  const activity365 = contributions?.github?.activityPoints365d ?? githubContributionSummary?.totalContributions ?? 0

  const points = githubContributionSummary?.points as { date: string; count: number }[] | undefined
  const series180 = lastNDaysCounts(points, 180)
  const sum180 = series180.reduce((a, b) => a + b, 0)

  const totalTxDisplay = solTx + evmTx
  const gasPrimary = gasEth != null && gasEth !== '' ? `${gasEth} ETH` : '—'

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ActivityTile
          title="Builder reputation"
          titleHint="Public signals from Talent Protocol when the builder wallet is linked."
          primary={talentScore != null && talentScore > 0 ? talentScore.toLocaleString() : '—'}
          breakdown={[
            {
              label: 'Talent Protocol',
              value: talentScore != null && talentScore > 0 ? `${talentScore} pts` : 'Not linked / no score',
            },
            ...(github?.totalStars
              ? [{ label: 'GitHub stars (repos)', value: Number(github.totalStars).toLocaleString() }]
              : []),
          ]}
          footer="Live index"
        />

        <ActivityTile
          title="Total transactions"
          titleHint="Solana: recent sample from Helius. Ethereum: last page from Etherscan (not a full lifetime count)."
          primary={totalTxDisplay.toLocaleString()}
          breakdown={[
            { label: 'Solana (sample)', value: Number(solTx).toLocaleString() },
            { label: 'Ethereum L1 (recent)', value: Number(evmTx).toLocaleString() },
          ]}
          footer="Recent sample"
        />

        <ActivityTile
          title="Gas fees (est.)"
          titleHint="Sum of gasUsed × gasPrice for Ethereum L1 txs returned by Etherscan (up to 1000)."
          primary={gasPrimary}
          breakdown={[
            {
              label: 'Ethereum L1',
              value: gasEth != null && gasEth !== '' ? `${gasEth} ETH` : '—',
            },
          ]}
          footer="Etherscan window"
        />

        <ActivityTile
          title="Deployments (est.)"
          titleHint="Solana: deploy/create-style txs in sample. Ethereum: contract-creation txs in returned list."
          primary={(solPrograms + evmContracts).toLocaleString()}
          breakdown={[
            { label: 'Solana programs (est.)', value: `${solPrograms}` },
            { label: 'Ethereum contracts (est.)', value: `${evmContracts}` },
          ]}
          footer="Heuristic · recent data"
        />

        <ActivityTile
          title="GitHub commits (graph)"
          titleHint="Total commit contributions from GitHub GraphQL when a server token is configured."
          primary={commitTotal != null ? commitTotal.toLocaleString() : '—'}
          breakdown={
            commitTotal != null
              ? [{ label: 'GitHub (GraphQL)', value: `${commitTotal.toLocaleString()} commits` }]
              : [{ label: 'GitHub (GraphQL)', value: 'Configure GITHUB_TOKEN for totals' }]
          }
          footer="365D · calendar rules"
          extra={<ActivitySparkline counts={series180.length ? series180 : lastNDaysCounts(points, 365)} variant="line" />}
        />

        <ActivityTile
          title="GitHub contributions"
          titleHint="Activity score from public events over the last 365 days (approximation of the contribution graph)."
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
