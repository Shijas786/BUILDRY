'use client'

import React from 'react'
import Link from 'next/link'
import TrustCard from '@/components/TrustCard'
import TrustBadge from '@/components/TrustBadge'
import TradePanel from '@/components/TradePanel'
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
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <main
        style={{
          maxWidth: 1020, margin: '0 auto', padding: '20px 16px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 16,
        }}
      >
        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Token header */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, padding: '16px 18px', background: '#fff' }}>
            <Link href="/" style={{ color: '#aaa', fontSize: 12, display: 'inline-block', marginBottom: 14 }}>
              ← Back
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#f2f2f2', border: '1px solid #e8e8e8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#0a0a0a', flexShrink: 0,
              }}>
                {token.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 18, color: '#0a0a0a' }}>{token.name}</span>
                  {trust && !trustLoading && <TrustBadge tier={trust.tier} />}
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                  ${token.symbol} · {fmtAddr(token.mint)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: '#0a0a0a' }}>
                  {fmtPrice(token.price)}
                </div>
                <div className="font-mono" style={{ fontSize: 12, color: isUp ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                  {isUp ? '↑' : '↓'} {fmtChange(token.priceChange24h)}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: 'flex', gap: 0, marginTop: 16,
              paddingTop: 14, borderTop: '1px solid #f0f0f0',
            }}>
              {[
                { label: 'Market Cap', val: fmtNum(token.marketCap) },
                { label: 'Volume 24h', val: fmtNum(token.volume24h) },
                { label: 'Fee APY', val: `${token.feeApy ?? 0}%` },
                { label: 'Holders', val: fmtNum(token.holders || 0) },
                { label: 'Liquidity', val: fmtNum(token.liquidity || 0) },
              ].map((s, i) => (
                <div key={s.label} style={{
                  flex: 1, paddingLeft: i > 0 ? 12 : 0,
                  borderLeft: i > 0 ? '1px solid #f0f0f0' : 'none',
                  marginLeft: i > 0 ? 12 : 0,
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
          </div>

          {/* Price chart */}
          <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}>
            <PriceChart mint={token.mint} price={token.price} priceChange={token.priceChange24h} />
          </div>

          {/* Trade panel */}
          <TradePanel token={token} trust={trust} trustLoading={trustLoading} />

          {/* AI Risk */}
          {trust && (
            <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}>
              <AiRiskBrief
                mint={token.mint} name={token.name} symbol={token.symbol}
                wallet={token.creatorWallet || ''} tier={trust.tier} 
                builderScore={trust.builderScore} reliabilityScore={trust.reliabilityScore}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        @media (max-width: 700px) {
          main { grid-template-columns: 1fr !important; }
          main > div:last-child { order: -1; }
        }
      `}</style>
    </div>
  )
}
