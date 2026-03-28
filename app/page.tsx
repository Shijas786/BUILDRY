'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthProvider'
import { useRouter } from 'next/navigation'
import { openAuthModal } from '@/lib/openAuthModal'
import TokenTicker from '@/components/TokenTicker'
import BuildryWordmark from '@/components/BuildryWordmark'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/feed')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 text-sm font-medium">
        Loading…
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white text-slate-500 text-sm font-medium px-6">
        <span className="inline-block h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin" aria-hidden />
        <p>Signing you in…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar />
      <div className="max-w-6xl mx-auto px-8 pt-4">
        <TokenTicker />
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-32 pb-16 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-50/40 rounded-full blur-[120px] -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Now in public beta</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] text-slate-900 mb-8 max-w-4xl mx-auto">
          Where founders<br />
          <span className="font-serif italic text-blue-600 font-normal">build in public</span>
        </h1>

        <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
          Share updates, showcase milestones, and build your audience. Find co-founders, hire talent, 
          book investor meetings, and launch tokens. Your network grows with every post.
        </p>

        <div className="mb-20">
          <button
            type="button"
            onClick={() => openAuthModal('signup')}
            className="inline-block bg-slate-900 text-white px-8 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98]"
          >
            Start building your profile
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-100 py-12 bg-white">
        <div className="max-w-5xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '2,841', label: 'Verified Builders' },
            { value: '14.2K', label: 'Posts Shared' },
            { value: '1,204', label: 'Projects Launched' },
            { value: '$4.2M', label: 'Jobs Completed' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-black text-slate-900 tracking-tight tabular-nums mb-1">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center mb-4">How it works</h2>
        <p className="text-sm text-slate-400 text-center mb-16 max-w-lg mx-auto">Three steps to build your reputation and grow your startup network</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StepCard
            step="01"
            title="Create your profile"
            description="Connect your GitHub, wallet, and socials. Your onchain reputation and commit history auto-populate."
          />
          <StepCard
            step="02"
            title="Share updates"
            description="Post milestones, showcase projects, and share your journey. Every post reaches your followers and gets discovered."
          />
          <StepCard
            step="03"
            title="Grow your network"
            description="Find co-founders, get backed by investors, hire talent, or launch your token. Your reputation compounds."
          />
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-slate-50/60 py-20">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight text-center mb-12">Built for the startup ecosystem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              title="Social Feed"
              description="Share updates, milestones, and launches. Follow builders, like, and comment. Think Instagram for startups."
              tag="Core"
            />
            <FeatureCard
              title="Verified Reputation"
              description="GitHub contributions, onchain activity, and Talent Protocol scores create a trust layer you can't fake."
              tag="Trust"
            />
            <FeatureCard
              title="Token Launch"
              description="Launch your project's token via Bags Protocol with 1-click. Trading fees are algorithmically reinvested."
              tag="Web3"
            />
            <FeatureCard
              title="Jobs & Bounties"
              description="Post jobs, find verified developers, and pay in crypto. Reputation scores surface the best candidates."
              tag="Hiring"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-8 py-32 text-center">
        <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-6">
          Ready to build in public?
        </h2>
        <p className="text-base text-slate-400 mb-10 max-w-md mx-auto">
          Join thousands of founders and developers who are growing their startups with Buildry.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('signup')}
          className="inline-block bg-slate-900 text-white px-12 py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-slate-900/10"
        >
          Get started free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-16 px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <BuildryWordmark tone="dark" variant="full" />
          </div>
          <div className="flex items-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <Link href="#" className="hover:text-slate-900 transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Discord</Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">Docs</Link>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Buildry 2026</p>
        </div>
      </footer>
    </div>
  )
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-100 bg-white">
      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Step {step}</p>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

function FeatureCard({ title, description, tag }: { title: string; description: string; tag: string }) {
  return (
    <div className="p-6 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all">
      <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-50 text-slate-400 mb-3 inline-block">{tag}</span>
      <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}
