import React from 'react'
import { TrustTier } from '@/lib/trust'

interface TrustBadgeProps {
  tier: TrustTier
}

const config = {
  VERIFIED: {
    label: '● Verified',
    bg: '#f0fdf4',
    color: '#16a34a',
    border: '#bbf7d0',
  },
  PARTIAL: {
    label: '● Partial',
    bg: '#fffbeb',
    color: '#d97706',
    border: '#fde68a',
  },
  ANONYMOUS: {
    label: '● Anonymous',
    bg: '#fff1f2',
    color: '#dc2626',
    border: '#fecdd3',
  },
}

export default function TrustBadge({ tier }: TrustBadgeProps) {
  const c = config[tier]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 30,
        padding: '3px 9px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  )
}
