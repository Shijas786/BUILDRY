'use client'

import React, { useState } from 'react'

interface OnboardingShellProps {
  onComplete: () => void
}

const totalSteps = 6

function ProgressDot({ step, current }: { step: number; current: number }) {
  const done = step < current
  const active = step === current
  return (
    <div style={{
      width: active ? 22 : 6, height: 6, borderRadius: 3,
      background: active ? '#0a0a0a' : done ? '#16a34a' : '#e8e8e8',
      transition: 'all 0.3s ease',
    }} />
  )
}

// ── Screen 1: Splash ────────────────────────────────────
function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen-fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 32, textAlign: 'center' }}>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#0a0a0a', letterSpacing: '-1.5px' }}>Buildry</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Built on bags.fm · Solana</p>
      </div>

      <div style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: 42, fontWeight: 900, color: '#0a0a0a', marginBottom: 16, lineHeight: 1.1, letterSpacing: '-1.5px' }}>
          Know who built it<br />before you buy it.
        </h2>
        <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          The first platform that shows the builder's reputation before every trade.
        </p>
      </div>

      <button onClick={onNext} className="btn-primary" style={{ padding: '14px 48px', fontSize: 15, borderRadius: 30 }}>
        Get Started
      </button>

      <div style={{ position: 'absolute', bottom: 32, fontSize: 11, color: '#aaa', fontWeight: 600 }}>
        Powered by bags.fm + ChainGPT
      </div>
    </div>
  )
}

// ── Screen 2: Problem ────────────────────────────────────
function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen-fade" style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 460, margin: '0 auto', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0a0a0a', lineHeight: 1.15, marginBottom: 8, letterSpacing: '-1px' }}>
          Most tokens<br />are a mystery.
        </h2>
        <p style={{ fontSize: 14, color: '#666' }}>Trading blind is the fastest way to lose SOL. You don't know who built it.</p>
      </div>

      <div style={{ border: '1px solid #fecdd3', borderRadius: 12, padding: '16px', background: '#fff1f2' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.6px' }}>BEFORE BUILDRY</span>
        <p style={{ fontSize: 13, color: '#aa4444', marginTop: 8, lineHeight: 1.6 }}>
          Token looks good, you swap. Rug pull. Creator had zero history — you had no way to know.
        </p>
      </div>

      <div style={{ textAlign: 'center', color: '#ddd', fontSize: 13, fontWeight: 800 }}>VS</div>

      <div style={{ border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px', background: '#f0fdf4' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>WITH BUILDRY</span>
        <p style={{ fontSize: 13, color: '#16a34a', marginTop: 8, lineHeight: 1.6 }}>
          Same token shows <strong style={{ color: '#dc2626' }}>● Anonymous Creator</strong>. No reputation, no linked socials. You skip it. You're safe.
        </p>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button onClick={onNext} className="btn-primary" style={{ width: '100%', padding: '14px 0', borderRadius: 12 }}>
          See How It Works →
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: How It Works ──────────────────────────────
function Screen3({ onNext }: { onNext: () => void }) {
  const steps = [
    { title: 'Find any Bags token', desc: 'Search by name, symbol or paste a Solana mint address.' },
    { title: 'We verify the creator', desc: 'GitHub, on-chain history, and linked socials — surfaced from public data.' },
    { title: 'Trade with context', desc: 'Swap with full creator reputation and an AI risk brief next to the swap button.' },
  ]
  return (
    <div className="screen-fade" style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 460, margin: '0 auto', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0a0a0a', marginBottom: 6, letterSpacing: '-1px' }}>How it works</h2>
        <p style={{ fontSize: 14, color: '#666' }}>Automated trust resolution for every swap.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#0a0a0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>{i + 1}</div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0a0a0a', marginBottom: 4 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{s.desc}</p>
              {i === 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {['Verified', 'Partial', 'Anonymous'].map(t => (
                    <span key={t} style={{ background: '#f8f8f8', border: '1px solid #e8e8e8', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#888', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
        <button onClick={onNext} className="btn-primary" style={{ width: '100%', padding: '14px 0', borderRadius: 12 }}>
          CONNECT WALLET →
        </button>
      </div>
    </div>
  )
}

// ── Screen 4: Connect Wallet ────────────────────────────
function Screen4({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="screen-fade" style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 460, margin: '0 auto', width: '100%' }}>
      <div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#0a0a0a', letterSpacing: '-1px' }}>Connect wallet</h2>
        <p style={{ fontSize: 14, color: '#666' }}>Pick a Solana wallet to start trading.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['Phantom', 'Backpack', 'Solflare'].map(w => (
          <button key={w} onClick={() => setSelected(w)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            borderRadius: 12, background: selected === w ? '#0a0a0a' : '#fff',
            border: `1.5px solid ${selected === w ? '#0a0a0a' : '#e8e8e8'}`,
            color: selected === w ? '#fff' : '#0a0a0a', fontSize: 15, fontWeight: 700,
            transition: 'all 0.15s', textAlign: 'left',
          }}>
            <span style={{ fontSize: 22 }}>{w === 'Phantom' ? '👻' : w === 'Backpack' ? '🎒' : '🌟'}</span>
            {w}
            {selected === w && <span style={{ marginLeft: 'auto', fontSize: 14 }}>✓</span>}
          </button>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <span style={{ fontSize: 11, color: '#ccc', fontWeight: 700 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          borderRadius: 12, background: '#fff', border: '1.5px solid #e8e8e8',
          color: '#1d9bf0', fontSize: 15, fontWeight: 700,
        }}>
          𝕏 Continue with Twitter
        </button>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={onNext} className="btn-primary" style={{ width: '100%', padding: '14px 0', borderRadius: 12, opacity: selected ? 1 : 0.5 }}>
          {selected ? `Connect ${selected}` : 'Select a Wallet'}
        </button>
        <button onClick={onNext} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, fontWeight: 600 }}>Browse without connecting →</button>
      </div>
    </div>
  )
}

// ── Screen 5: Profile Setup ────────────────────────────
function Screen5({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [farcaster, setFarcaster] = useState('')
  const [twitter, setTwitter] = useState('')

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50">
      <div className="w-full max-w-[440px] bg-white rounded-[28px] border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black mb-6 mx-auto shadow-lg shadow-blue-500/20">
            R
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Build your profile</h2>
          <p className="text-sm text-slate-500 font-medium">Connect your digital identity to the protocol</p>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Display Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          <div className="relative">
            <textarea 
              placeholder="Bio (e.g. Senior Protocol Engineer)" 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-600 min-h-[100px] resize-none placeholder-slate-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-widest">𝕏</span>
              <input 
                type="text" 
                placeholder="Twitter" 
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-800 text-xs transition-all"
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-widest">🟣</span>
              <input 
                type="text" 
                placeholder="Farcaster" 
                value={farcaster}
                onChange={(e) => setFarcaster(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-800 text-xs transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <button 
            type="button"
            className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
          >
            Skip for now
          </button>
          
          <button 
            onClick={onNext} 
            className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black hover:shadow-xl transition-all active:scale-95 shadow-lg shadow-blue-500/10"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Screen 6: Ready ─────────────────────────────────────
function Screen6({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="screen-fade animate-in zoom-in-95 duration-500" style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: 460, margin: '0 auto', width: '100%', gap: 32 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4',
        border: '3px solid #16a34a', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 32, color: '#16a34a',
        boxShadow: '0 10px 25px rgba(22,163,74,0.15)'
      }}>✓</div>

      <div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0a0a0a', marginBottom: 12, letterSpacing: '-0.5px' }}>You're all set.</h2>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, maxWidth: 300 }}>Every token you view now shows the creator's full reputation score automatically.</p>
      </div>

      <button onClick={onComplete} className="btn-primary" style={{ padding: '16px 52px', fontSize: 16, borderRadius: 32, fontWeight: 800 }}>
        Start Trading
      </button>
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────
export default function OnboardingShell({ onComplete }: OnboardingShellProps) {
  const [step, setStep] = useState(1)
  const next = () => setStep(s => Math.min(s + 1, totalSteps))
  const back = () => setStep(s => Math.max(s - 1, 1))
  const progress = ((step - 1) / (totalSteps - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ height: 3, background: '#f2f2f2', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 }}>
        <div style={{ height: '100%', background: '#0a0a0a', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 12px', background: '#fff' }}>
        {step > 1 ? (
          <button onClick={back} style={{ color: '#aaa', fontSize: 13, fontWeight: 700 }}>← Back</button>
        ) : <div style={{ width: 60 }} />}

        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalSteps }, (_, i) => <ProgressDot key={i} step={i + 1} current={step} />)}
        </div>

        {step > 1 && step < 6 ? (
          <button onClick={onComplete} style={{ color: '#aaa', fontSize: 13, fontWeight: 700 }}>Skip</button>
        ) : <div style={{ width: 60 }} />}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 1 && <Screen1 onNext={next} />}
        {step === 2 && <Screen2 onNext={next} />}
        {step === 3 && <Screen3 onNext={next} />}
        {step === 4 && <Screen4 onNext={next} />}
        {step === 5 && <Screen5 onNext={next} />}
        {step === 6 && <Screen6 onComplete={onComplete} />}
      </div>
    </div>
  )
}
