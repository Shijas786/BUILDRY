'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div
        className="h-10 min-w-[9.5rem] animate-pulse rounded-xl bg-slate-200/90"
        aria-hidden
      />
    ),
  }
)
import BuildryWordmark from '@/components/BuildryWordmark'
import TrustCard from '@/components/TrustCard'
import TrustBadge from '@/components/TrustBadge'
import TradePanel from '@/components/TradePanel'
import ClaimFeesCard from '@/components/ClaimFeesCard'
import TokenHoldersSection from '@/components/TokenHoldersSection'
import { SkeletonTokenCard } from '@/components/SkeletonCard'
import { useTokenData } from '@/hooks/useTokenData'
import { useTrustScore } from '@/hooks/useTrustScore'
import { fmtAddr, fmtPrice, fmtChange, fmtNum, fmtMcap } from '@/lib/format'
import { BUILDRY_PLATFORM_TOKEN_MINT } from '@/lib/buildryPlatformToken'
import { readTokenDraft } from '@/lib/tokenDraft'
import type { TrustData } from '@/lib/trust'

function TokenPageWalletBar() {
  return (
    <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="mx-auto flex max-w-[1020px] items-center justify-between gap-3">
        <Link
          href="/"
          className="shrink-0 text-[11px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:text-slate-900"
        >
          ← Buildry
        </Link>
        <div className="wallet-adapter-button-trigger shrink-0 [&_.wallet-adapter-button]:h-10 [&_.wallet-adapter-button]:rounded-xl [&_.wallet-adapter-button]:!bg-slate-900 [&_.wallet-adapter-button]:!px-4 [&_.wallet-adapter-button]:!text-[11px] [&_.wallet-adapter-button]:!font-black [&_.wallet-adapter-button]:!uppercase [&_.wallet-adapter-button]:!tracking-widest [&_.wallet-adapter-button]:!text-white">
          <WalletMultiButton />
        </div>
      </div>
    </div>
  )
}

function TokenPageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <TokenPageWalletBar />
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: 16, display: 'flex', gap: 16 }}>
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <SkeletonTokenCard key={i} />
          ))}
        </div>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <SkeletonTokenCard key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TokenPageContent({ mint }: { mint: string }) {
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const queryDraft = useMemo(() => {
    const p = new URLSearchParams(qs)
    const dn = p.get('dn')?.trim()
    const ds = p.get('ds')?.trim()
    if (!dn || !ds) return null
    return { name: dn, symbol: ds }
  }, [qs])

  const m = (mint || '').trim()
  const { publicKey } = useWallet()
  const { token, loading: tokenLoading, error: tokenError, provisional } = useTokenData(m, queryDraft)

  /** Bags sometimes omits creator wallet while indexing; fall back to connected wallet on provisional token pages. */
  const trustLookupWallet =
    token?.creatorWallet?.trim() ||
    (provisional && publicKey ? publicKey.toBase58() : null) ||
    null

  const { trust, loading: trustLoading } = useTrustScore(
    trustLookupWallet,
    token?.creatorImage,
    token?.twitter ?? null,
    token?.buildry_launcher_uid ?? null
  )

  const isPlatformToken = useMemo(() => {
    const id = token?.mint?.trim()
    return Boolean(id && id === BUILDRY_PLATFORM_TOKEN_MINT)
  }, [token?.mint])

  /** Platform mint is official—do not show “no Buildry match” or gate swap like an unknown creator. */
  const trustForUi: TrustData | null = useMemo(() => {
    if (!trust || !isPlatformToken) return trust
    return { ...trust, tier: 'VERIFIED' }
  }, [trust, isPlatformToken])

  const creatorAddr = token?.creatorWallet?.trim() || null
  const hasLaunchContext = Boolean(queryDraft || readTokenDraft(m))
  /** Only the on-chain creator (or provisional launcher with this device/session context) should see fees UI or hit claimable APIs. */
  const isViewerCreator = Boolean(
    publicKey &&
      (creatorAddr
        ? publicKey.toBase58() === creatorAddr
        : provisional && hasLaunchContext)
  )

  const creatorFeeWallet =
    creatorAddr ||
    (provisional && publicKey ? publicKey.toBase58() : null) ||
    null

  const [claimableSol, setClaimableSol] = useState<number | null>(null)
  const [claimableLoading, setClaimableLoading] = useState(true)
  /** Distinct owners in RPC largest-accounts sample; Bags `holders` often lags or stays 0. */
  const [holderSampleCount, setHolderSampleCount] = useState<number | null>(null)

  const refreshClaimable = useCallback(() => {
    if (!isViewerCreator || !creatorFeeWallet || !token?.mint) {
      setClaimableSol(null)
      setClaimableLoading(false)
      return
    }
    setClaimableLoading(true)
    fetch(
      `/api/bags/claimable?wallet=${encodeURIComponent(creatorFeeWallet)}&mint=${encodeURIComponent(token.mint)}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((j) => {
        if (typeof j.sol === 'number' && Number.isFinite(j.sol)) setClaimableSol(j.sol)
        else setClaimableSol(null)
      })
      .catch(() => setClaimableSol(null))
      .finally(() => setClaimableLoading(false))
  }, [isViewerCreator, creatorFeeWallet, token?.mint])

  useEffect(() => {
    if (!token || !isViewerCreator) {
      setClaimableSol(null)
      setClaimableLoading(false)
      return
    }
    refreshClaimable()
    const id = setInterval(refreshClaimable, 25_000)
    return () => clearInterval(id)
  }, [token, isViewerCreator, refreshClaimable])

  useEffect(() => {
    if (!token?.mint) return
    let cancelled = false
    fetch(`/api/tokens/${encodeURIComponent(token.mint)}/holders`)
      .then(async (r) => {
        const j = (await r.json()) as { holders?: unknown[] }
        if (!r.ok) return null
        return Array.isArray(j.holders) ? j.holders.length : 0
      })
      .then((n) => {
        if (!cancelled && typeof n === 'number') setHolderSampleCount(n)
      })
      .catch(() => {
        if (!cancelled) setHolderSampleCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [token?.mint])

  const isUp = (token?.priceChange24h ?? 0) >= 0

  if (tokenLoading) {
    return <TokenPageSkeleton />
  }

  if (tokenError || !token) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <TokenPageWalletBar />
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Token not indexed yet</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
            Bags hasn&apos;t returned this mint yet. Check{' '}
            <a
              href={`https://solscan.io/token/${encodeURIComponent(m)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0a0a0a', fontWeight: 600 }}
            >
              Solscan
            </a>{' '}
            for the chain.
          </div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>
            If you launched on Buildry, use{' '}
            <strong>Open token page</strong> on the success screen (that link carries your name and symbol until Bags
            catches up). Plain mint-only URLs can&apos;t recover that metadata.
          </div>
          <div className="mb-6 break-all font-mono text-[11px] text-gray-400" title={m}>
            {m}
          </div>
          <Link href="/" style={{ color: '#0a0a0a', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
            ← Back to Feed
          </Link>
        </div>
      </div>
    )
  }

  const holdersShown = Math.max(token.holders || 0, holderSampleCount ?? 0)

  return (
    <div className="min-h-screen bg-white">
      <TokenPageWalletBar />
      <div className="mx-auto max-w-[1020px] px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Mcap</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">{fmtMcap(token.marketCap)}</div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">24h vol</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">
              ${fmtNum(token.volume24h)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Price</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">{fmtPrice(token.price)}</div>
            <div className={`mt-0.5 font-mono text-xs font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              {isUp ? '↑' : '↓'} {fmtChange(token.priceChange24h)}
            </div>
          </div>
        </div>
      </div>
      <main
        className="mx-auto grid max-w-[1020px] grid-cols-1 gap-4 px-3 pb-16 pt-4 sm:gap-4 sm:px-4 sm:pb-20 sm:pt-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-4"
      >
        {/* ── LEFT ── */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 md:order-none">

          {/* Token header */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 18px', background: '#fff' }}>
            <Link href="/" style={{ color: '#aaa', fontSize: 12, display: 'inline-block', marginBottom: 14 }}>
              ← Back
            </Link>

            <div className="flex flex-wrap items-start gap-3 sm:items-center sm:gap-3.5">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#f2f2f2',
                  border: '1px solid #e8e8e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#0a0a0a',
                  flexShrink: 0,
                }}
              >
                {token.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#0a0a0a' }}>{token.name}</span>
                  {trustForUi && !trustLoading && <TrustBadge tier={trustForUi.tier} />}
                </div>
                <div className="font-mono break-all" style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  ${token.symbol} · {fmtAddr(token.mint)}
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  ~{fmtNum(holdersShown)} holders
                  <span className="text-gray-400/90"> · Bags &amp; on-chain sample</span>
                </div>
              </div>
            </div>
          </div>

          <TokenHoldersSection mint={token.mint} symbol={token.symbol} />

          {/* 2. Dashboard stats */}
          <section
            id="dashboard"
            style={{ scrollMarginTop: 16, border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 18px', background: '#fff' }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, marginBottom: 12 }}>
              Dashboard
            </div>
            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                { label: 'Fee APY', val: `${token.feeApy ?? 0}%` },
                { label: 'Holders', val: fmtNum(holdersShown) },
                { label: 'Liquidity', val: fmtNum(token.liquidity || 0) },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: '1 1 90px', paddingLeft: i > 0 ? 12 : 0,
                  borderLeft: i > 0 ? '1px solid #f0f0f0' : 'none',
                  marginLeft: i > 0 ? 12 : 0,
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600 }}>
                    {s.label}
                  </div>
                  <div className="font-mono" style={{ fontSize: 13, color: '#0a0a0a', marginTop: 4, fontWeight: 600 }}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {isViewerCreator ? (
              <div
                id="claim-fees"
                style={{
                  scrollMarginTop: 16,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid #f0f0f0',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: '#aaa',
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  Creator fees
                </div>
                <ClaimFeesCard
                  tokens={[{ mint: token.mint, name: token.name, symbol: token.symbol }]}
                  profileSolWallet={creatorFeeWallet}
                  expectedFeeWallet="creator"
                  hideTitle
                  liveClaimableSol={claimableSol}
                  liveClaimableLoading={claimableLoading}
                  onClaimComplete={refreshClaimable}
                  className="!mb-0 !shadow-none rounded-xl border-[#e8e8e8] bg-[#fafafa]"
                />
              </div>
            ) : null}
          </section>

          {/* 3. Token launch & trade (last) */}
          <section id="token-launch" style={{ scrollMarginTop: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, margin: '0 0 4px 4px' }}>
              Swap
            </div>
            <p className="mb-3 text-[12px] leading-snug text-gray-500">Quotes and settlement via Bags.</p>
            <TradePanel token={token} trust={trustForUi} trustLoading={trustLoading} hideChart />
          </section>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-2.5 md:order-none">
          {isPlatformToken ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <BuildryWordmark variant="icon" className="border-emerald-200/90 shadow-sm" />
              <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-emerald-900">
                Official Buildry platform token ($BUILDRY).
              </p>
            </div>
          ) : (
            <TrustCard
              trust={trust}
              loading={trustLoading}
              wallet={token.creatorWallet ?? trustLookupWallet ?? undefined}
            />
          )}

          {token.creatorWallet && (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, marginBottom: 6 }}>
                Creator Wallet
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: '#888', wordBreak: 'break-all' }}>
                {fmtAddr(token.creatorWallet)}
              </div>
            </div>
          )}

          {token.description && (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, marginBottom: 6 }}>
                About
              </div>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.65 }}>{token.description}</p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 767px) {
          main > div:last-child { order: -1; }
        }
      `}</style>
    </div>
  )
}

export default function TokenPage({ params }: { params: { mint: string } }) {
  const mint = (params?.mint || '').trim()
  return (
    <Suspense fallback={<TokenPageSkeleton />}>
      <TokenPageContent mint={mint} />
    </Suspense>
  )
}
