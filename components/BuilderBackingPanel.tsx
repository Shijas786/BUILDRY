'use client'

import React, { useState } from 'react'
import BackerModal from './BackerModal'

interface BuilderBackingPanelProps {
  builderName: string
  tokenName: string
  tokenPrice: string
  tokenMint?: string
}

export default function BuilderBackingPanel({ builderName, tokenName, tokenPrice, tokenMint }: BuilderBackingPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="sticky top-24 flex flex-col gap-6">
        {/* The primary action card */}
        <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 border border-[var(--border)] shadow-2xl relative overflow-hidden">
          {/* Decorative top strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]"></div>
          
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2 mt-2 tracking-tight">Invest in {builderName.split(' ')[0]}</h2>
          <p className="text-[var(--text-secondary)] font-medium text-xs leading-relaxed mb-6">Tokens backed by real work. Protocol-level stake ensures alignment between builders and backers.</p>
          
          <div className="bg-[var(--bg-tertiary)] rounded-2xl p-5 mb-6 border border-[var(--border)]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Support Token</span>
              <span className="font-mono font-black text-[var(--text-primary)]">${tokenName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">Market Value</span>
              <span className="font-mono font-black text-[var(--accent-green)]">${tokenPrice}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-black text-sm font-black rounded-xl transition-all shadow-[0_0_25px_rgba(0,212,255,0.3)] hover:shadow-[0_0_35px_rgba(0,212,255,0.5)] transform hover:-translate-y-0.5 uppercase tracking-widest"
          >
            Aquire Stake
          </button>
          
          <div className="mt-5 text-center px-4">
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">V3 Verification Engine Active</span>
          </div>
        </div>

        {/* Backers Social Wall */}
        <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 border border-[var(--border)] shadow-xl">
          <div className="flex justify-between items-center mb-6 px-1">
            <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Protocol Backers</h3>
            <span className="text-[10px] font-black text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 px-2 by-1 rounded-md mb-0.5">142</span>
          </div>
          
          <div className="flex flex-wrap pl-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] overflow-hidden" style={{ marginLeft: i === 0 ? 0 : '-14px', zIndex: 12 - i }}>
                <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="backer" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-pointer" />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-black text-[var(--accent-primary)]" style={{ marginLeft: '-14px', zIndex: 0 }}>
              +130
            </div>
          </div>
        </div>
      </div>

      <BackerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        builderName={builderName.split(' ')[0]} 
        tokenName={tokenName} 
      />
    </>
  )
}
