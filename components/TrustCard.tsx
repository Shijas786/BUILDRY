'use client'

import React from 'react'
import { TrustData } from '@/lib/trust'
import { fmtAddr } from '@/lib/format'
import { SkeletonTrustCard } from './SkeletonCard'

interface TrustCardProps {
  trust: TrustData | null
  loading: boolean
  wallet?: string
}

function SocialChip({ platform, active }: { platform: string; active: boolean }) {
  const icons: Record<string, string> = {
    github: 'GitHub',
    twitter: 'Twitter',
    farcaster: 'Farcaster',
    wallet: 'Wallet',
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: active ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border)'}`,
      borderRadius: 6, padding: '3px 10px',
      fontSize: 10, fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {active ? '✓' : '✗'} {icons[platform] || platform}
    </span>
  )
}

export default function TrustCard({ trust, loading, wallet }: TrustCardProps) {
  if (loading) return <SkeletonTrustCard />
  if (!trust) return null

  const { tier, profile, builderScore, builderRank, percentile, socials, twitterFromBags, farcaster } = trust
  const twitterHandle = socials.find(s => s.platform === 'twitter')?.handle || twitterFromBags
  const twitterFollowers = socials.find(s => s.platform === 'twitter')?.followers

  // ── VERIFIED ────────────────────────────────────
  if (tier === 'VERIFIED') {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--accent-green)]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-green)] opacity-50"></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ● Verified Protocol Identity
          </span>
          <a href={`https://talent.app/profile/${profile?.username}`} target="_blank" rel="noreferrer"
            style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 900, textTransform: 'uppercase' }}>
            Proofs ↗
          </a>
        </div>

        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 900, color: 'var(--accent-green)',
              boxShadow: '0 0 15px rgba(0, 255, 135, 0.2)'
            }}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{profile.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>@{profile.username}</div>
            </div>
          </div>
        )}

        {builderRank && (
          <div style={{
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 16,
            padding: '16px', marginBottom: 20, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Rank</span>
              <span className="font-mono" style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent-green)', letterSpacing: '-1px' }}>
                #{builderRank.toLocaleString()}
              </span>
            </div>
            {percentile && (
              <div style={{ fontSize: 10, color: 'var(--accent-green)', marginTop: 4, fontWeight: 900, textTransform: 'uppercase' }}>
                Top {(100 - percentile).toFixed(0)}% Globally
              </div>
            )}
            
            {/* GitHub Score Bar */}
            {profile?.githubScore !== undefined && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ship Score</span>
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', fontWeight: 900, color: 'var(--text-primary)' }}>{profile.githubScore}/100</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-green)', width: `${profile.githubScore}%`, boxShadow: '0 0 10px rgba(0, 255, 135, 0.4)' }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          <SocialChip platform="github" active={trust.hasGithub} />
          <SocialChip platform="twitter" active={trust.hasTwitter} />
          <SocialChip platform="farcaster" active={trust.hasFarcaster} />
          <SocialChip platform="wallet" active={trust.hasWallet} />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reliability Score</span>
            <span style={{ 
              fontSize: 16, fontWeight: 900, fontFamily: 'DM Mono, monospace',
              color: trust.reliabilityScore && trust.reliabilityScore > 80 ? 'var(--accent-green)' : trust.reliabilityScore && trust.reliabilityScore > 50 ? 'var(--accent-amber)' : 'var(--text-primary)' 
            }}>
              {trust.reliabilityScore ? `${Math.round(trust.reliabilityScore)}%` : '—'}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reputation Points</span>
            <span className="font-mono text-sm" style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{builderScore ?? '—'}</span>
          </div>
          
          {(profile?.previousProjects || (trust.previousBagsProjects && trust.previousBagsProjects.length > 0)) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
                Verified Deployments
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(trust.previousBagsProjects.length > 0 ? trust.previousBagsProjects : (profile?.previousProjects || [])).slice(0, 5).map((p, idx) => {
                  const isObj = typeof p === 'object' && p !== null && 'mint' in p;
                  const name = isObj ? (p as any).name : p;
                  const symbol = isObj ? (p as any).symbol : '';
                  const mint = isObj ? (p as any).mint : null;
                  
                  return (
                    <a 
                      key={mint || idx} 
                      href={mint ? `/token/${mint}` : '#'}
                      style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                      className="group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] shadow-[0_0_8px_rgba(0,255,135,0.4)]" />
                      <span className="group-hover:text-[var(--accent-green)] transition-colors">
                        {symbol ? `${name} ($${symbol})` : name}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {farcaster && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase' }}>Farcaster FID</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 900 }}>
                !{farcaster.fid}{farcaster.powerBadge ? ' ⚡' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── PARTIAL ────────────────────────────────────
  if (tier === 'PARTIAL') {
    const handle = farcaster?.username || twitterHandle
    const displayName = farcaster?.displayName || handle
    const followerCount = farcaster?.followers || twitterFollowers
    const source = farcaster ? 'farcaster' : 'twitter'

    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--accent-amber)]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-amber)] opacity-50"></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ◐ Unlinked Identity
          </span>
          <span style={{ fontSize: 10, color: 'var(--accent-amber)', background: 'var(--accent-amber)/10', border: '1px solid var(--accent-amber)/20', borderRadius: 4, padding: '2px 8px', fontWeight: 900, textTransform: 'uppercase' }}>
            {source}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          {trust.profilePicture ? (
            <img 
              src={trust.profilePicture} 
              alt={trust.profile?.name || 'Creator'} 
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-tertiary)', boxShadow: '0 0 15px rgba(0,0,0,0.3)' }} 
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: 'var(--text-muted)', border: '2px solid var(--border)'
            }}>
              ?
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {trust.profile?.name || trust.farcaster?.displayName || 'Unknown Creator'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              @{trust.profile?.username || trust.farcaster?.username || 'shielder'}
            </div>
          </div>
        </div>

        {handle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px', background: 'var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: 'var(--accent-amber)', fontWeight: 900,
              border: '1px solid var(--accent-amber)/20'
            }}>
              {farcaster ? '⬡' : '𝕏'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{displayName}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>@{handle}</span>
                {followerCount && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{followerCount.toLocaleString()} followers</span>
                )}
              </div>
            </div>
          </div>
        )}

        {farcaster && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', marginBottom: 20, fontSize: 11, color: 'var(--accent-amber)',
            fontWeight: 900, textTransform: 'uppercase'
          }}>
            ⬡ FID !{farcaster.fid} {farcaster.powerBadge && '⚡'}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          <SocialChip platform="github" active={false} />
          <SocialChip platform="twitter" active={!!twitterHandle} />
          <SocialChip platform="farcaster" active={!!farcaster} />
        </div>

        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
            {farcaster
              ? 'Farcaster identity found but no verified protocol-level builder proofs on Talent Protocol.'
              : 'Social identity found but no verified builder credentials on Talent Protocol.'}
          </p>
          <a href="https://talent.app" target="_blank" rel="noreferrer"
            style={{ display: 'block', marginTop: 10, fontSize: 11, color: 'var(--accent-amber)', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'none' }}>
            → Link Protocol Identity
          </a>
        </div>
      </div>
    )
  }

  // ── ANONYMOUS ────────────────────────────────────
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--accent-red)]/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--accent-red)] opacity-50"></div>
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ✕ NO PROTOCOL REPUTATION
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-tertiary)',
          border: '2px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, color: 'var(--accent-red)', fontWeight: 900,
        }}>
          ?
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Anonymous Entity</div>
          {wallet && <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{fmtAddr(wallet)}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        <SocialChip platform="github" active={false} />
        <SocialChip platform="twitter" active={false} />
        <SocialChip platform="farcaster" active={false} />
        <SocialChip platform="wallet" active={false} />
      </div>

      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent-red)', marginBottom: 8, textTransform: 'uppercase' }}>⚠ Verification Failure</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontWeight: 500 }}>
          Zero verifiable history on Talent Protocol or social graphs. Extreme caution advised for unverified builders with no onchain footprint.
        </p>
      </div>
    </div>
  )
}
