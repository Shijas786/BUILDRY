'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import {
  formatCommitsForTweet,
  shortMintAddress,
  type LaunchCelebrationSnapshot,
} from '@/lib/launchSnapshot'
import { buildTokenPagePath, saveTokenDraft } from '@/lib/tokenDraft'

type Props = {
  mint: string
  tokenName: string
  tokenSymbol: string
  snapshot: LaunchCelebrationSnapshot
}

function useOrigin(): string {
  const [o, setO] = useState('')
  useEffect(() => {
    setO(typeof window !== 'undefined' ? window.location.origin : '')
  }, [])
  return o
}

function LaunchConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${4 + (i * 4.1) % 92}%`,
        delay: `${i * 0.045}s`,
        dx: `${(i % 2 === 0 ? 1 : -1) * (15 + (i * 11) % 70)}px`,
        color: ['#22c55e', '#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#60a5fa'][i % 6],
      })),
    []
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="launch-confetti-piece"
          style={
            {
              left: p.left,
              animationDelay: p.delay,
              backgroundColor: p.color,
              '--dx': p.dx,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function LaunchSuccessScreen({ mint, tokenName, tokenSymbol, snapshot }: Props) {
  const { user } = useAuth()
  const origin = useOrigin()
  const explorerUrl = `https://solscan.io/token/${encodeURIComponent(mint)}`

  useEffect(() => {
    saveTokenDraft(mint, { name: tokenName, symbol: tokenSymbol })
  }, [mint, tokenName, tokenSymbol])

  const [copied, setCopied] = useState<'mint' | 'link' | null>(null)
  const [feedPosting, setFeedPosting] = useState(false)
  const [feedPosted, setFeedPosted] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const flash = useCallback((which: 'mint' | 'link') => {
    setCopied(which)
    window.setTimeout(() => setCopied(null), 2000)
  }, [])

  const onCopyMint = async () => {
    if (await copyText(mint)) flash('mint')
  }
  const onCopyLink = async () => {
    const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
    const path = buildTokenPagePath(mint, tokenName, tokenSymbol)
    const full = base ? `${base}${path}` : path
    if (await copyText(full)) flash('link')
  }

  const tweetText = useMemo(() => {
    const score = snapshot.builderScore ?? '—'
    const commitLine = formatCommitsForTweet(snapshot)
    const sym = tokenSymbol.trim() || 'TOKEN'
    const link = origin ? `${origin}${buildTokenPagePath(mint, tokenName, tokenSymbol)}` : ''
    return `Just deployed $${sym} on Buildry. Builder score: ${score}. ${commitLine} Still shipping.${link ? `\n\n${link}` : ''}`
  }, [mint, origin, snapshot, tokenName, tokenSymbol])

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

  const feedContent = useMemo(() => {
    const sym = tokenSymbol.trim() || 'TOKEN'
    const nm = tokenName.trim() || 'My token'
    const base = origin ? `${origin}${buildTokenPagePath(mint, tokenName, tokenSymbol)}` : ''
    return `Just launched $${sym} — ${nm}!${base ? `\n\n${base}` : ''}`
  }, [mint, origin, tokenName, tokenSymbol])

  const postToFeed = async () => {
    if (!user?.id) return
    setFeedPosting(true)
    setFeedError(null)
    try {
      const linkUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${buildTokenPagePath(mint, tokenName, tokenSymbol)}`
          : null
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          content: feedContent,
          postType: 'launch',
          milestoneTitle: `Launched $${tokenSymbol.trim() || 'TOKEN'}`,
          milestoneCategory: 'launch',
          linkUrl,
          tokenMint: mint,
          launchSymbol: tokenSymbol.trim() || 'TOKEN',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setFeedError(typeof err?.error === 'string' ? err.error : 'Could not post')
        return
      }
      setFeedPosted(true)
    } catch {
      setFeedError('Network error')
    } finally {
      setFeedPosting(false)
    }
  }

  const commitsDisplay =
    snapshot.graphqlCommits != null && snapshot.graphqlCommits > 0
      ? `${snapshot.graphqlCommits.toLocaleString()} (GitHub graph)`
      : snapshot.activity365d != null && snapshot.activity365d > 0
        ? `${snapshot.activity365d.toLocaleString()} (365d activity)`
        : '—'

  const tokenPath = useMemo(
    () => buildTokenPagePath(mint, tokenName, tokenSymbol),
    [mint, tokenName, tokenSymbol]
  )

  return (
    <div className="relative">
      <LaunchConfetti />

      <div className="animate-in fade-in zoom-in relative z-10 mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white px-6 py-10 text-center shadow-2xl duration-500 md:max-w-xl md:px-10 md:py-12">
        {/* Success mark */}
        <div className="launch-check-pop mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500 shadow-xl shadow-emerald-500/30">
          <svg className="h-12 w-12 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path className="origin-center" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-black leading-tight tracking-tight text-gray-900 md:text-5xl">
          You&apos;re live.
          <br />
          <span className="text-gray-600">Start building.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-base font-medium leading-relaxed text-gray-600">
          Your token home opens with holders (on-chain balances + Buildry-linked wallets), dashboard stats, and creator tools — in-app swap (Bags) is at the end of the page.
        </p>

        <nav
          aria-label="Token page sections"
          className="mx-auto mt-6 flex max-w-lg flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"
        >
          <a
            href={`${tokenPath}#holders-chart`}
            className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:border-gray-300 hover:bg-white"
          >
            Holders
          </a>
          <a
            href={`${tokenPath}#dashboard`}
            className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:border-gray-300 hover:bg-white"
          >
            Dashboard
          </a>
          <a
            href={`${tokenPath}#claim-fees`}
            className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:border-gray-300 hover:bg-white"
          >
            Claim fees
          </a>
          <a
            href={`${tokenPath}#token-launch`}
            className="rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 transition-colors hover:border-gray-300 hover:bg-white"
          >
            Swap
          </a>
        </nav>

        <details className="group mx-auto mt-4 max-w-sm text-left">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-600 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-black text-gray-500">
              i
            </span>
            Fees &amp; routing (Bags)
          </summary>
          <p className="mt-2 rounded-xl border border-gray-100 bg-gray-50/90 px-3 py-2.5 text-center text-[11px] leading-relaxed text-gray-500">
            Trading and creator fees follow your Bags fee settings—often weighted toward liquidity pools and backers. You can adjust this in Bags.
          </p>
        </details>

        {/* Share row */}
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {user?.id ? (
            <button
              type="button"
              disabled={feedPosted || feedPosting}
              onClick={() => void postToFeed()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white shadow-md transition-transform hover:bg-slate-800 disabled:cursor-default disabled:opacity-70 active:scale-[0.98]"
            >
              {feedPosting ? (
                'Posting…'
              ) : feedPosted ? (
                <>
                  <span aria-hidden>✓</span> Posted to feed
                </>
              ) : (
                'Post to feed'
              )}
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800 transition-colors hover:bg-slate-100"
            >
              Sign in to post to feed
            </Link>
          )}
          <a
            href={tweetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-black text-white shadow-md transition-transform hover:bg-black active:scale-[0.98]"
          >
            <span className="text-base font-bold" aria-hidden>
              𝕏
            </span>
            Tweet your launch
          </a>
          <button
            type="button"
            onClick={() => void onCopyMint()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span aria-hidden>📋</span>
            {copied === 'mint' ? 'Copied address' : 'Copy contract'}
          </button>
          <button
            type="button"
            onClick={() => void onCopyLink()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <span aria-hidden>🔗</span>
            {copied === 'link' ? 'Copied link' : 'Copy token page link'}
          </button>
        </div>
        {feedError && <p className="mx-auto mt-2 max-w-md text-center text-xs font-semibold text-red-600">{feedError}</p>}
        {feedPosted && (
          <p className="mx-auto mt-2 max-w-md text-center text-xs font-semibold text-slate-600">
            <Link href="/feed" className="font-bold text-slate-800 underline underline-offset-2 hover:no-underline">
              View feed
            </Link>
          </p>
        )}

        {/* Contract */}
        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-gray-200 bg-slate-50/80 p-4 text-left">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">Mint / contract</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all font-mono text-sm font-semibold text-slate-800 sm:min-w-0 sm:flex-1">
              {shortMintAddress(mint, 8, 6)}
            </code>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCopyMint()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-100"
              >
                Copy
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-100"
              >
                View on explorer
              </a>
            </div>
          </div>
          <p className="mt-2 truncate font-mono text-[11px] text-gray-400" title={mint}>
            {mint}
          </p>
        </div>

        {/* Builder sealed-in */}
        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/30 p-5 text-left shadow-sm">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">Sealed with your token</p>
          <div className="flex gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-slate-100 shadow-md ring-2 ring-emerald-100">
              {snapshot.githubAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={snapshot.githubAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-300">
                  {(snapshot.githubLogin || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-gray-900">{snapshot.githubLogin ? `@${snapshot.githubLogin}` : 'Builder'}</p>
              <p className="text-xs text-gray-500">GitHub · builder context at launch</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <div className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-gray-100">
                  <p className="font-black uppercase tracking-wider text-gray-400">Score</p>
                  <p className="font-black tabular-nums text-gray-900">{snapshot.builderScore ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-gray-100">
                  <p className="font-black uppercase tracking-wider text-gray-400">Commits</p>
                  <p className="truncate font-black tabular-nums text-gray-900">{commitsDisplay}</p>
                </div>
                <div className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-gray-100">
                  <p className="font-black uppercase tracking-wider text-gray-400">Streak</p>
                  <p className="font-black tabular-nums text-gray-900">{snapshot.streakDays}d</p>
                </div>
                <div className="rounded-lg bg-white/80 px-2 py-1.5 ring-1 ring-gray-100">
                  <p className="font-black uppercase tracking-wider text-gray-400">Top lang</p>
                  <p className="truncate font-black text-gray-900">{snapshot.topLanguage ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
            Token: <span className="font-bold text-gray-600">{tokenName}</span> (${tokenSymbol.trim() || '—'})
          </p>
        </div>

        <div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`${tokenPath}#holders-chart`}
            className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/15 transition-all hover:bg-slate-900 active:scale-[0.98]"
          >
            Open token page →
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            Back to Buildry
          </Link>
        </div>
      </div>
    </div>
  )
}
