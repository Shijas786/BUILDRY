import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080B10] flex flex-col items-center justify-center text-center px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-secondary)]/10 blur-[120px] rounded-full pointer-events-none" />
      
      <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-[var(--text-primary)] mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-bold text-[var(--accent-primary)] mb-8 uppercase tracking-widest">Protocol Sync Failed</h2>
      <p className="text-[var(--text-secondary)] max-w-md mb-12 font-medium leading-relaxed">
        The requested reputation fragment could not be found in the current sharded index.
      </p>
      
      <Link 
        href="/" 
        className="px-8 py-4 bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] rounded-2xl font-black uppercase tracking-widest hover:border-[var(--accent-primary)] transition-all shadow-xl active:scale-95"
      >
        Return to Nexus
      </Link>
    </div>
  )
}
