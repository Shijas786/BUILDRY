'use client'

import React from 'react'

interface TokenTabProps {
  token?: {
    name: string
    symbol: string
    price: string
    mcap: string
    holders: string
    mint: string
  }
  onLaunchClick: () => void
}

export default function TokenTab({ token, onLaunchClick }: TokenTabProps) {
  if (!token) {
    return (
      <div className="py-20 border border-dashed border-slate-200 rounded-[32px] text-center bg-slate-50/30 animate-in fade-in slide-in-from-bottom-4">
        <div className="max-w-md mx-auto space-y-8 p-10">
          <div className="w-20 h-20 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm">💎</div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">No Token Detected</h3>
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed uppercase tracking-widest">
              This builder hasn't launched their identity-backed currency yet. <br/>
              Staking reputation requires a verified Bags.fm token.
            </p>
          </div>
          <button 
            onClick={onLaunchClick}
            className="bg-slate-900 text-white px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
          >
            Launch Builder Token
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Price (USD)', value: `$${token.price}`, change: '+4.2%' },
          { label: 'Market Cap', value: `$${token.mcap}`, change: '+12%' },
          { label: 'Holders', value: token.holders, change: '+1' },
          { label: 'Repu Stake', value: '42k', change: '80%' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[24px]">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            <div className={`mt-2 text-[9px] font-black uppercase tracking-widest ${stat.change.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: Chart & Holders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Chart (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">DEX Chart: {token.symbol}/SOL</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded uppercase tracking-widest">Live</span>
            </div>
            <div className="flex gap-2">
              {['1H', '4H', '1D', '1W'].map(t => (
                <button key={t} className={`px-3 py-1 text-[9px] font-black border transition-all ${t === '1D' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="aspect-[16/9] w-full bg-slate-900 rounded-[32px] overflow-hidden relative border border-slate-800 shadow-2xl">
            {/* DexScreener Iframe Mockup/Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
               <div className="text-center">
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-4">Buffering DEX Interface...</p>
                 <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mx-auto">
                   <div className="w-1/3 h-full bg-blue-600 animate-[loading_2s_infinite]" />
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Holders (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-4">Top Holders</p>
          <div className="space-y-6">
            {[
              { rank: 1, name: 'Repu Vault', weight: '24%', impact: '94' },
              { rank: 2, name: 'sol-whale.sol', weight: '12%', impact: '88' },
              { rank: 3, name: 'builder42.eth', weight: '8%', impact: '72' },
              { rank: 4, name: 'alfa.sol', weight: '5%', impact: '61' },
              { rank: 5, name: 'shijas', weight: '4.2%', impact: '99' },
            ].map((holder, i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 transition-all rounded-xl">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-200 tabular-nums">0{holder.rank}</span>
                  <div>
                    <p className="text-[12px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{holder.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-widest">{holder.weight} Supply</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-900 tracking-tighter">{holder.impact}</p>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Score</p>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full py-4 border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all">
            View All Holders →
          </button>
        </div>
      </div>
    </div>
  )
}
