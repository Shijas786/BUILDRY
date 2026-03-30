'use client'

import React from 'react'
import Link from 'next/link'
import TrustCard from '@/components/TrustCard'
import TrustBadge from '@/components/TrustBadge'
import TradePanel from '@/components/TradePanel'
import ClaimFeesCard from '@/components/ClaimFeesCard'
import AiRiskBrief from '@/components/AiRiskBrief'
import PriceChart from '@/components/PriceChart'
import { SkeletonTokenCard } from '@/components/SkeletonCard'
import { useTokenData } from '@/hooks/useTokenData'
import { useTrustScore } from '@/hooks/useTrustScore'
import { fmtAddr, fmtPrice, fmtChange, fmtNum } from '@/lib/format'

export default function TokenPage({ params }: { params: { mint: string } }) {
  const { mint } = params
  const { token, loading: tokenLoading, error: tokenError } = useTokenData(mint)
  const { trust, loading: trustLoading } = useTrustScore(token?.creatorWallet || null, token?.creatorImage)
  const isUp = (token?.priceChange24h ?? 0) >= 0

  if (tokenLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', padding: 16, display: 'flex', gap: 16 }}>
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <SkeletonTokenCard key={i} />)}
          </div>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => <SkeletonTokenCard key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  if (tokenError || !token) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Token not found</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Check the mint address and try again.</div>
          <Link href="/" style={{ color: '#0a0a0a', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>
            ← Back to Feed
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <main
        className="mx-auto grid max-w-[1020px] grid-cols-1 gap-4 px-3 pb-16 pt-3 sm:gap-4 sm:px-4 sm:pb-20 sm:pt-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-4"
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
                  {trust && !trustLoading && <TrustBadge tier={trust.tier} />}
                </div>
                <div className="font-mono break-all" style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  ${token.symbol} · {fmtAddr(token.mint)}
                </div>
              </div>

              <div className="ml-auto text-right sm:ml-0">
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0a' }}>
                  {fmtPrice(token.price)}
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: isUp ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                  {isUp ? '↑' : '↓'} {fmtChange(token.priceChange24h)}
                </div>
              </div>
            </div>
          </div>

          {/* 1. Live chart & holders (first after launch) */}
          <section
            id="holders-chart"
            style={{ scrollMarginTop: 16, border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, marginBottom: 10 }}>
              Live chart · {fmtNum(token.holders || 0)} holders
            </div>
            <PriceChart mint={token.mint} price={token.price} priceChange={token.priceChange24h} />
          </section>

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
                { label: 'Market Cap', val: fmtNum(token.marketCap) },
                { label: 'Volume 24h', val: fmtNum(token.volume24h) },
                { label: 'Fee APY', val: `${token.feeApy ?? 0}%` },
                { label: 'Holders', val: fmtNum(token.holders || 0) },
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
                profileSolWallet={token.creatorWallet ?? null}
                expectedFeeWallet="creator"
                hideTitle
                className="!mb-0 !shadow-none rounded-xl border-[#e8e8e8] bg-[#fafafa]"
              />
            </div>
          </section>

          {/* 3. Analyst */}
          <section
            id="analyst"
            style={{ scrollMarginTop: 16, border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}
          >
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, marginBottom: 10 }}>
              Analyst
            </div>
            {trust ? (
              <AiRiskBrief
                mint={token.mint} name={token.name} symbol={token.symbol}
                wallet={token.creatorWallet || ''} tier={trust.tier}
                builderScore={trust.builderScore} reliabilityScore={trust.reliabilityScore}
              />
            ) : (
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, margin: 0 }}>
                {trustLoading ? 'Loading creator signals…' : 'Risk and builder signals appear here when creator data is available.'}
              </p>
            )}
          </section>

          {/* 4. Token launch & trade (last) */}
          <section id="token-launch" style={{ scrollMarginTop: 16 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600, margin: '0 0 8px 4px' }}>
              Launch &amp; trade
            </div>
            <TradePanel token={token} trust={trust} trustLoading={trustLoading} />
          </section>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-2.5 md:order-none">
          <TrustCard trust={trust} loading={trustLoading} wallet={token.creatorWallet} />

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
