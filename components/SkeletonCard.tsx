import React from 'react'

export default function SkeletonCard({
  className = '',
  height = 20,
}: {
  className?: string
  height?: number
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, borderRadius: 8, background: '#f5f5f5' }}
    />
  )
}

export function SkeletonTokenCard() {
  return (
    <div style={{
      padding: '12px 16px',
      border: '1px solid #f0f0f0',
      borderRadius: 10,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 14, width: '45%' }} />
        <div className="skeleton" style={{ height: 10, width: '25%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div className="skeleton" style={{ height: 13, width: 50 }} />
        <div className="skeleton" style={{ height: 18, width: 65, borderRadius: 20 }} />
      </div>
    </div>
  )
}

export function SkeletonTrustCard() {
  return (
    <div style={{
      border: '1px solid #f0f0f0',
      borderRadius: 12,
      padding: 20,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div className="skeleton" style={{ height: 10, width: 100 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 14, width: '50%' }} />
          <div className="skeleton" style={{ height: 10, width: '30%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 50, borderRadius: 8 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 20, width: 60, borderRadius: 6 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 10, width: '90%' }} />
        <div className="skeleton" style={{ height: 10, width: '70%' }} />
      </div>
    </div>
  )
}
