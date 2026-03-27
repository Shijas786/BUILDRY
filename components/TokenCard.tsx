'use client'

import React from 'react'
import Link from 'next/link'
import { BagsToken } from '@/lib/bags'
import { TrustTier } from '@/lib/trust'
import { fmtAddr, fmtPrice, fmtChange } from '@/lib/format'
import TrustBadge from './TrustBadge'

interface TokenCardProps {
  token: BagsToken
  trustTier?: TrustTier
  avatar?: string | null
}

function TokenAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  const initial = name?.charAt(0).toUpperCase() || '?'
  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name} width={38} height={38}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%',
      background: '#f2f2f2', border: '1px solid #e8e8e8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color: '#0a0a0a', flexShrink: 0,
    }}>
      {initial}
    </div>
  )
}

export default function TokenCard({ token, trustTier, avatar }: TokenCardProps) {
  const isUp = token.priceChange24h >= 0
  const changeColor = isUp ? '#16a34a' : '#dc2626'

  return (
    <Link href={`/token/${token.mint}`} style={{ display: 'block' }}>
      <div
        style={{
          padding: '12px 16px',
          border: '1px solid #e8e8e8',
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fff',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = '#0a0a0a'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#e8e8e8'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <TokenAvatar name={token.name} imageUrl={token.imageUrl} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0a0a0a' }}>{token.name}</span>
            {token.priceChange24h !== 0 && (
              <span style={{ fontSize: 11, color: changeColor, fontWeight: 600 }}>
                {fmtChange(token.priceChange24h)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <span className="font-mono" style={{ fontSize: 11, color: '#888' }}>${token.symbol}</span>
            <span style={{ fontSize: 11, color: '#ddd' }}>·</span>
            <span className="font-mono" style={{ fontSize: 11, color: '#aaa' }}>{fmtAddr(token.mint)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {avatar && (
              <img 
                src={avatar} 
                alt="Creator" 
                style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e8e8e8' }} 
              />
            )}
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a' }}>
              {fmtPrice(token.price)}
            </span>
          </div>
          {trustTier ? (
            <TrustBadge tier={trustTier} />
          ) : (
            <div className="skeleton" style={{ height: 22, width: 72, borderRadius: 30 }} />
          )}
        </div>
      </div>
    </Link>
  )
}
