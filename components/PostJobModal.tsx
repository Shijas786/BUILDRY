'use client'

import React, { useState } from 'react'

interface PostJobModalProps {
  onClose: () => void
}

const STACKS = ['Rust · Solana', 'TypeScript · EVM', 'React · Anchor', 'Circom · zkSNARK', 'Go · Cosmos', 'Python · AI', 'Move · Aptos', 'Cairo · Starknet']

export default function PostJobModal({ onClose }: PostJobModalProps) {
  const [form, setForm] = useState({
    role: '',
    company: '',
    stack: '',
    pay: '',
    remote: true,
    link: '',
  })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: persist to Supabase
    setSubmitted(true)
    setTimeout(onClose, 2000)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-[500] flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl shadow-2xl shadow-slate-900/10 border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Post a Hiring Ad</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors text-sm font-bold">✕</button>
        </div>

        {submitted ? (
          <div className="px-10 py-20 text-center">
            <div className="text-4xl mb-6">✓</div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Submitted successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-10 py-10 space-y-8">
            {/* Role */}
            <div className="border-b border-slate-100 pb-6">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Role Title *</label>
              <input
                required
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="e.g. Senior Solana Engineer"
                className="w-full text-[15px] font-bold text-slate-900 placeholder-slate-200 outline-none bg-transparent"
              />
            </div>

            {/* Company */}
            <div className="border-b border-slate-100 pb-6">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Company / DAO *</label>
              <input
                required
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="e.g. Jito Labs"
                className="w-full text-[15px] font-bold text-slate-900 placeholder-slate-200 outline-none bg-transparent"
              />
            </div>

            {/* Stack + Pay inline */}
            <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Tech Stack</label>
                <select
                  name="stack"
                  value={form.stack}
                  onChange={handleChange}
                  className="w-full text-[13px] font-bold text-slate-900 outline-none bg-transparent appearance-none cursor-pointer"
                >
                  <option value="">Select...</option>
                  {STACKS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Annual Pay</label>
                <input
                  name="pay"
                  value={form.pay}
                  onChange={handleChange}
                  placeholder="e.g. $180k"
                  className="w-full text-[13px] font-bold text-slate-900 placeholder-slate-200 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Apply link */}
            <div className="border-b border-slate-100 pb-6">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-3">Apply Link</label>
              <input
                name="link"
                value={form.link}
                onChange={handleChange}
                placeholder="https://..."
                type="url"
                className="w-full text-[13px] font-bold text-slate-900 placeholder-slate-200 outline-none bg-transparent font-mono"
              />
            </div>

            {/* Remote toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Remote OK</span>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, remote: !p.remote }))}
                className={`w-10 h-5 rounded-full transition-all relative ${form.remote ? 'bg-slate-900' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.remote ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all active:scale-95"
            >
              Publish Listing
            </button>

            <p className="text-[9px] font-bold text-slate-300 text-center uppercase tracking-widest">
              Requires verified wallet · Listings are public
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
