'use client'

import React, { useState } from 'react'

export default function OpenToWorkToggle() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-3 px-5 py-2.5 border transition-all text-[10px] font-black uppercase tracking-widest ${
          open
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300'
        }`}
      >
        <span className={`w-2 h-2 rounded-full transition-all ${open ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
        {open ? 'Open to Work' : 'Set Available'}
      </button>
      {open && (
        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest animate-fade-in">
          · Visible to companies
        </span>
      )}
    </div>
  )
}
