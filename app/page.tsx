'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/context/AuthProvider'
import { useRouter } from 'next/navigation'
import { openAuthModal } from '@/lib/openAuthModal'
import BuildryWordmark from '@/components/BuildryWordmark'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/feed')
    }
  }, [user, loading, router])

  // Do not gate the marketing page on auth `loading`. SSR and slow Firebase would otherwise
  // leave everyone on a full-screen "Loading…" shell (see HTML view-source).
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

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-12 pt-24 text-center sm:px-6 sm:pb-16 sm:pt-28 md:px-8 md:pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[min(400px,70vw)] w-[min(700px,200vw)] -translate-x-1/2 rounded-full bg-blue-50/40 blur-[120px]" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Now in public beta</span>
        </div>

        <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight text-slate-900 sm:mb-8 sm:text-5xl md:text-6xl lg:text-8xl">
          Where founders<br />
          <span className="font-serif italic text-slate-500 font-normal">build in public</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl px-1 text-base font-medium leading-relaxed text-slate-400 sm:mb-12 sm:text-lg">
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
              <p className="mb-1 text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl md:text-4xl">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — bold type, no cards */}
      <section className="max-w-4xl mx-auto px-8 py-20 md:py-28">
        <header className="mb-10 md:mb-14 max-w-3xl">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-4">
            How it works
          </h2>
          <p className="text-base sm:text-lg md:text-xl font-bold text-slate-500 leading-snug">
            Three steps to build your reputation and grow your startup network
          </p>
        </header>

        <ol className="space-y-0">
          {[
            {
              step: '01',
              title: 'Create your profile',
              body: 'Connect your GitHub, wallet, and socials. Your onchain reputation and commit history auto-populate.',
            },
            {
              step: '02',
              title: 'Share updates',
              body: 'Post milestones, showcase projects, and share your journey. Every post reaches your followers and gets discovered.',
            },
            {
              step: '03',
              title: 'Grow your network',
              body: 'Find co-founders, get backed by investors, hire talent, or launch your token. Your reputation compounds.',
            },
          ].map((item) => (
            <li
              key={item.step}
              className="grid gap-4 md:grid-cols-[4.25rem_1fr] md:gap-8 py-8 md:py-10 border-t border-slate-900/12 first:border-t-0 first:pt-0"
            >
              <span className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] tabular-nums md:pt-0.5">
                {item.step}
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.08] mb-3 md:mb-4">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base font-semibold text-slate-500 leading-relaxed max-w-2xl">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Features — bold rows, no cards */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-8">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-10 md:mb-14 max-w-4xl">
            Built for the startup ecosystem
          </h2>

          <div className="divide-y divide-slate-200">
            {(
              [
                {
                  tag: 'Core',
                  title: 'Social Feed',
                  description:
                    'Share updates, milestones, and launches. Follow builders, like, and comment. Think Instagram for startups.',
                },
                {
                  tag: 'Trust',
                  title: 'Verified Reputation',
                  description:
                    'GitHub contributions and on-chain activity we fetch directly create a trust layer you can inspect.',
                },
                {
                  tag: 'Web3',
                  title: 'Token Launch',
                  description:
                    'Launch your token via Bags with one flow. Trading fees follow your Bags rules—often reinforcing liquidity and backers.',
                  href: '/builders',
                  hrefLabel: 'Fees & builder economics',
                },
                {
                  tag: 'Hiring',
                  title: 'Jobs & Bounties',
                  description:
                    'Post jobs, find verified developers, and pay in crypto. Reputation scores surface the best candidates.',
                },
              ] as const
            ).map((f) => (
              <div
                key={f.title}
                className="grid gap-4 py-8 md:py-10 md:grid-cols-12 md:gap-x-8 md:gap-y-0"
              >
                <div className="md:col-span-5">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600 block mb-2">
                    {f.tag}
                  </span>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-[1.08]">
                    {f.title}
                  </h3>
                </div>
                <div className="md:col-span-7 md:pt-6 self-start">
                  <p className="text-sm sm:text-base font-semibold text-slate-500 leading-relaxed">{f.description}</p>
                  {'href' in f && f.href && 'hrefLabel' in f && f.hrefLabel ? (
                    <Link
                      href={f.href}
                      className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                    >
                      {f.hrefLabel} →
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
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
            <BuildryWordmark tone="dark" variant="full" shine shineSidebar />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest md:gap-8">
            <Link href="/builders" className="hover:text-slate-900 transition-colors">Builder economics</Link>
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
