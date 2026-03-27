'use client'

import React from 'react'
import { fmtAddr } from '@/lib/format'

const mockBuilders = [
  { id: 1, name: 'JADONAMITE', handle: '@jadonamite', avatar: '🛡️', role: 'ENGINEERING', github: 805, growth: '+91%', rewards: '$4,997', rGrowth: '+205%' },
  { id: 2, name: 'debielily', handle: '@debielily', avatar: '🌸', role: 'ENGINEERING', github: 2400, growth: '+65%', rewards: '$4,983', rGrowth: '+170%' },
  { id: 3, name: 'masaun', handle: '@masaun', avatar: '🍜', role: 'ENGINEERING', github: 1417, growth: '+28%', rewards: '$4,942', rGrowth: '+119%' },
  { id: 4, name: 'agedevs', handle: '@agedevs', avatar: '👴', role: 'FOUNDER/CEO', github: 1974, growth: '+70%', rewards: '$4,676', rGrowth: '+156%' },
]

export default function BuilderTable({ minimal = false }: { minimal?: boolean }) {
  return (
    <div className="w-full bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/50">
          <tr className="border-b border-slate-100">
            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest w-12 text-center italic">#</th>
            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Builder Profile</th>
            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Role</th>
            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">
              GitHub Contributions <br/>
              <span className="text-[9px] text-slate-300 font-bold lowercase">last 90d</span>
            </th>
            <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">
              Talent Rewards USD <br/>
              <span className="text-[9px] text-slate-300 font-bold lowercase">last 90d</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {mockBuilders.map((b, i) => (
            <tr key={b.id} className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 h-24">
              <td className="px-8 py-5 text-[11px] font-bold text-slate-300 text-center">{i + 1}</td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center text-xl shadow-sm">
                    {b.avatar}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-900 leading-tight uppercase tracking-tight">{b.name}</h4>
                    <p className="text-[11px] font-bold text-slate-400 leading-tight">{b.handle}</p>
                  </div>
                </div>
              </td>
              <td className="px-8 py-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                   <span className="text-slate-400 opacity-60">
                     {b.role.includes('ENG') ? '</>' : '🚀'}
                   </span>
                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{b.role}</span>
                </div>
              </td>
              <td className="px-8 py-5 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[14px] font-black text-slate-900">{b.github.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-lg">{b.growth}</span>
                </div>
              </td>
              <td className="px-8 py-5 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-black text-slate-900">{b.rewards}</span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-lg">{b.rGrowth}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {!minimal && (
        <div className="p-6 border-t border-slate-50 bg-slate-50/20 flex justify-center">
          <button className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-3">
            Explored Verified Talent <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
