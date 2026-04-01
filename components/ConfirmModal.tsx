'use client'

import React from 'react'

interface ConfirmModalProps {
  tokenName: string
  wallet: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmModal({ tokenName, wallet, onCancel, onConfirm }: ConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', border: '1px solid #fecdd3',
          borderRadius: 16, padding: 28, width: '100%', maxWidth: 400,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', marginBottom: 12 }}>
          ⚠ HIGH RISK TRADE
        </div>

        <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6, marginBottom: 20 }}>
          This creator has little or no linked identity in our data (no Buildry match or weak social signals).{' '}
          <strong style={{ color: '#dc2626' }}>
            Treat size and custody as high risk until you verify the team yourself.
          </strong>
        </p>

        <div
          style={{
            background: '#fef2f2', border: '1px solid #fee2e2',
            borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#991b1b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          {tokenName}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: '#fff', border: '1px solid #e8e8e8',
              color: '#0a0a0a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: '#dc2626', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            I Understand, Swap
          </button>
        </div>
      </div>
    </div>
  )
}
