'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#080B10] flex flex-col items-center justify-center text-center px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-red)]/10 blur-[120px] rounded-full pointer-events-none" />
      
      <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-[var(--accent-red)] mb-4">ERR</h1>
      <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-8 uppercase tracking-widest">Protocol Breach</h2>
      <p className="text-[var(--text-secondary)] max-w-md mb-12 font-medium leading-relaxed">
        A critical integrity check failed during synchronization. 
        Attempting to re-establish connection...
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-4 bg-[var(--accent-red)] text-black rounded-2xl font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(255,59,48,0.4)] transition-all active:scale-95"
        >
          Retry Sync
        </button>
        <Link 
          href="/" 
          className="px-8 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl font-black uppercase tracking-widest hover:border-[var(--accent-red)] transition-all shadow-xl active:scale-95"
        >
          Return to Nexus
        </Link>
      </div>
    </div>
  )
}
