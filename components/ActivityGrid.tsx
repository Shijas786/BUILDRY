'use client'

import React from 'react'

const ACTIVITY_TILES = [
  {
    title: 'Builder rewards (USD)',
    value: '6 USDC',
    breakdown: [
      { label: 'Wallet Connect Builder Rewards', val: '7.0K WCT' },
      { label: 'Base Builder Rewards', val: '0.1142 ETH' },
    ],
    info: true
  },
  {
    title: 'Total Transactions',
    value: '28',
    breakdown: [
      { label: 'Base', val: '26.9K' },
      { label: 'Celo', val: '590.00' },
    ],
    info: true,
    footer: '180D SUM'
  },
  {
    title: 'Gas Fees',
    value: '12 USDC',
    breakdown: [
      { label: 'Base', val: '0.0040 ETH' },
      { label: 'Celo', val: '1.05 CELO' },
    ],
    info: true,
    footer: '180D SUM'
  },
  {
    title: 'Active Smart Contracts',
    value: '4',
    breakdown: [
      { label: 'Base Mainnet Active Contracts', val: '3 contracts' },
      { label: 'Celo Mainnet Active Contracts', val: '1 contracts' },
    ],
    info: true,
    footer: '180D SUM'
  }
]

function MiniChart({ type }: { type: 'line' | 'area' }) {
  if (type === 'line') {
    return (
      <div className="h-24 w-full mt-6 flex items-end">
        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
          <path
            d="M0 35 L20 35 L40 32 L60 35 L80 34 L100 35"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="1.5"
            className="opacity-80"
          />
          <line x1="0" y1="35" x2="100" y2="35" stroke="#E2E8F0" strokeWidth="0.5" />
        </svg>
      </div>
    )
  }
  return (
    <div className="h-24 w-full mt-6 relative">
      <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 38 Q 10 38, 20 35 T 40 30 T 60 20 T 80 10 T 100 5 L 100 40 L 0 40 Z"
          fill="url(#chartGradient)"
        />
        <path
          d="M0 38 Q 10 38, 20 35 T 40 30 T 60 20 T 80 10 T 100 5"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

export default function ActivityGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ACTIVITY_TILES.map((tile, i) => (
        <div key={i} className="bg-slate-50/50 border border-slate-100 p-8 rounded-[32px] group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tile.title}</p>
            {tile.info && <span className="text-slate-300 cursor-help">ⓘ</span>}
          </div>
          <p className="text-4xl font-black text-slate-900 mb-8">{tile.value}</p>
          
          <div className="space-y-4">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Breakdown</p>
            {tile.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border border-slate-100 rounded-sm" />
                  <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
                </div>
                <span className="text-[11px] font-black text-slate-900">{item.val}</span>
              </div>
            ))}
          </div>

          {tile.footer && (
            <p className="mt-8 text-[9px] font-bold text-slate-300 text-right uppercase tracking-widest italic">{tile.footer}</p>
          )}
        </div>
      ))}

      {/* GitHub Commits */}
      <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[32px] group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GitHub Crypto Commits</p>
          <span className="text-slate-300 cursor-help">ⓘ</span>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-4">180D SUM</p>
        <p className="text-4xl font-black text-slate-900">0</p>
        <MiniChart type="line" />
        <p className="mt-6 text-[9px] font-bold text-slate-300 text-right uppercase tracking-widest italic">180D SUM</p>
      </div>

      {/* GitHub Contributions */}
      <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[32px] group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GitHub Contributions</p>
          <span className="text-slate-300 cursor-help">ⓘ</span>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-4">180D SUM</p>
        <div className="flex items-center gap-3">
          <p className="text-4xl font-black text-slate-900">6K</p>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full">+20,396%</span>
        </div>
        <MiniChart type="area" />
        <p className="mt-6 text-[9px] font-bold text-slate-300 text-right uppercase tracking-widest italic">180D SUM</p>
      </div>
    </div>
  )
}
