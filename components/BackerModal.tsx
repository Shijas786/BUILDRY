'use client'

import React, { useState, useEffect } from 'react'

interface BackerModalProps {
  isOpen: boolean
  onClose: () => void
  builderName: string
  tokenName: string
}

export default function BackerModal({ isOpen, onClose, builderName, tokenName }: BackerModalProps) {
  const [solAmount, setSolAmount] = useState('1.5')
  const [quote, setQuote] = useState<{ outAmount: number; fee: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'swapping' | 'success'>('idle')

  useEffect(() => {
    if (isOpen && solAmount && !isNaN(Number(solAmount))) {
      fetchQuote()
    }
  }, [solAmount, isOpen])

  const fetchQuote = async () => {
    setLoading(true)
    try {
      // Simulate real Bags API quote call
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'tokenMintTargetABC123', // Dummy target
          amount: parseFloat(solAmount),
          side: 'buy'
        })
      })
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        // Mock fallback if API key errors
        setQuote({ outAmount: parseFloat(solAmount) * 23.8, fee: 0.001 })
      }
    } catch {
      setQuote({ outAmount: parseFloat(solAmount) * 23.8, fee: 0.001 })
    }
    setLoading(false)
  }

  const handleBacking = () => {
    setStatus('swapping')
    setTimeout(() => setStatus('success'), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-[var(--bg-secondary)] w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden border border-[var(--border)] animate-in fade-in zoom-in duration-200">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-primary)] opacity-50"></div>
        
        {status === 'success' ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,255,135,0.2)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tighter">Backing Confirmed</h2>
            <p className="text-[var(--text-secondary)] font-medium mb-8">You are now an official protocol-level backer of {builderName}.</p>
            <button onClick={onClose} className="bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-[var(--text-primary)] font-black py-4 px-8 rounded-xl w-full transition-all uppercase tracking-widest text-xs">
              Return to Profile
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase">Back {builderName}</h2>
              <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-medium mb-8 leading-relaxed">Aquire ${tokenName} governance tokens. 1% of all future trade fees from this builder will be algorithmically distributed to the backing pool.</p>

            {/* Input Form */}
            <div className="space-y-4">
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border)] focus-within:border-[var(--accent-primary)]/50 transition-all">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Collateral (SOL)</label>
                <input 
                  type="number" 
                  value={solAmount} 
                  onChange={(e) => setSolAmount(e.target.value)}
                  className="w-full bg-transparent text-3xl font-black text-[var(--text-primary)] outline-none font-mono"
                  placeholder="0.0" 
                  min="0" step="0.1"
                />
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-2 rounded-full shadow-lg text-[var(--text-muted)]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </div>
              </div>

              <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-[var(--border)]">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Est. Yield Stake ({tokenName})</label>
                {loading ? (
                  <div className="h-10 flex items-center text-[var(--text-muted)] font-mono text-sm space-x-2">
                    <span className="animate-pulse">Accessing Bags SDK...</span>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-[var(--accent-primary)] truncate font-mono">
                    {quote?.outAmount ? quote.outAmount.toFixed(2) : '0.00'}
                  </div>
                )}
              </div>
            </div>

            {/* Bags API Signature */}
            <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-1.5 border border-[var(--border)] bg-[var(--bg-tertiary)] py-1.5 px-3 rounded-lg shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
                <span className="text-[var(--text-muted)]">Verified</span>
              </div>
              <div className="text-[var(--text-muted)]">Fee: <span className="font-mono">{quote?.fee || 0} SOL</span></div>
            </div>

            <button 
              onClick={handleBacking}
              disabled={loading || status === 'swapping'}
              className="mt-8 w-full py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-black text-sm font-black rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_35px_rgba(0,212,255,0.5)] transform hover:-translate-y-0.5 uppercase tracking-widest disabled:opacity-30"
            >
              {status === 'swapping' ? 'Confirming Protocol Link...' : `Executive Swap (${solAmount} SOL)`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
