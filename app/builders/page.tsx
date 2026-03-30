'use client'

import React from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BuildryWordmark from '@/components/BuildryWordmark'
import { openAuthModal } from '@/lib/openAuthModal'

function FlowArrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 flex justify-center text-lg font-black text-emerald-600" aria-hidden>
      {children}
    </div>
  )
}

function FlowStep({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold ${
        highlight
          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
          : 'border-slate-200 bg-slate-50/80 text-slate-700'
      }`}
    >
      {children}
    </p>
  )
}

export default function BuildersEconomicsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <Navbar />

      <article className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 md:pt-20">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">For builders</p>
        <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          How Buildry earns — and what you get on every trade
        </h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-slate-500">
          Trading fees flow through Bags. Your identity and activity stay tied to your token so shipping code compounds trust and
          income.
        </p>

        {/* How Buildry earns */}
        <section className="mt-14 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">How Buildry earns on every trade</h2>
          <div className="mt-8 space-y-0">
            <FlowStep>Anyone buys or sells a builder&apos;s token</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Trading fee is collected automatically on-chain</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Bags Fee Share program splits it instantly</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep highlight>Buildry&apos;s wallet gets its cut — no action needed</FlowStep>
          </div>
        </section>

        {/* What builders get */}
        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">What the builder gets</h2>

          <div className="mt-10 space-y-14">
            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">1.</span> Passive income from their own token
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                Every time anyone buys or sells their token, the builder earns fees automatically. They don&apos;t do anything — just
                keep building.
              </p>
              <div className="mt-6 space-y-0">
                <FlowStep>Someone trades their token</FlowStep>
                <FlowArrow>↓</FlowArrow>
                <FlowStep>Builder&apos;s wallet receives SOL</FlowStep>
                <FlowArrow>↓</FlowArrow>
                <FlowStep>Forever, as long as the token is traded</FlowStep>
              </div>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Example math</p>
                <p className="mt-2 font-mono text-xs leading-relaxed text-slate-700 sm:text-sm">
                  Default ~2% fee mode · token doing <span className="font-bold text-slate-900">10 SOL/day</span> volume
                  <br />
                  → 2% fee = 0.2 SOL
                  <br />
                  → 50% to creator pool = 0.1 SOL
                  <br />
                  → Builder&apos;s ~90% share ≈ <span className="font-bold text-slate-900">0.09 SOL/day</span>
                  <br />
                  → ~2.7 SOL/month → ~32 SOL/year from one token, passively. Popular tokens scale that up.
                </p>
                <p className="mt-3 text-[11px] font-medium text-slate-500">
                  Actual splits depend on your Bags fee configuration and on-chain rules.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">2.</span> Builder identity sealed on-chain
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                At launch, GitHub stats, score, commits, and streak travel with the token. Buyers see who&apos;s behind the asset;
                credibility is verifiable. More commits → more trust → more buyers. Shipping literally supports the token narrative.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">3.</span> A token page that updates as they ship
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                Commits and streaks surface on the token side so holders see whether you&apos;re still building. Active builders build
                confidence; long silence erodes it.
              </p>
              <div className="mt-6 space-y-0">
                <FlowStep>Builder ships commits this week</FlowStep>
                <FlowArrow>↓</FlowArrow>
                <FlowStep>Token page shows activity · streak</FlowStep>
                <FlowArrow>↓</FlowArrow>
                <FlowStep>Holders gain confidence → more bids</FlowStep>
                <FlowArrow>↓</FlowArrow>
                <FlowStep>More volume → more fees to the builder</FlowStep>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">4.</span> Community of holders = early supporters
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                Buyers of your token are aligned with your upside. They share, join your channels, and benefit when you win — a
                distributed fan base before traditional fundraising.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">5.</span> Token graduates to a real DEX
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                After enough SOL is raised on the bonding curve (e.g. ~85 SOL milestone), the asset can list on Meteora DAMM v2 and
                appear on aggregators like Jupiter and trackers like DexScreener — automated path from launch to liquid market.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                <span className="mr-2 text-blue-600">6.</span> Fee split control
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                Route part of your fee share to collaborators by GitHub identity — native on-chain revenue share for open teams,
                without bespoke legal wiring for every split.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-left text-[11px] leading-relaxed text-emerald-100 sm:text-xs">
                {`feeClaimers: [
  { provider: "github", username: "co-founder", bps: 3000 },  // 30%
  { provider: "github", username: "contributor", bps: 1000 }, // 10%
  // Builder keeps remaining share
]`}
              </pre>
            </div>
          </div>
        </section>

        {/* Core loop */}
        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">The core loop Buildry creates</h2>
          <div className="mt-8 space-y-0">
            <FlowStep>Builder ships code</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Builder score and activity rise on Buildry</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Token story looks more credible</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>More people buy and trade</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Builder earns more fees</FlowStep>
            <FlowArrow>↓</FlowArrow>
            <FlowStep>Incentive to ship again — repeat</FlowStep>
          </div>
        </section>

        {/* Summary table */}
        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Summary — builder benefits</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Benefit</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ['Passive fee income', 'Share of trading fees while the token trades'],
                  ['On-chain identity', 'GitHub-backed stats tied to the token'],
                  ['Liquidity path', 'Bags bonding curve → DEX graduation story'],
                  ['Real DEX listing', 'Jupiter / DexScreener visibility after milestones'],
                  ['Holder community', 'Financially aligned early supporters'],
                  ['Revenue splits', 'Share fees with collaborators via GitHub handles'],
                  ['Low ops', 'Deploy once; fees accrue on-chain'],
                ].map(([a, b]) => (
                  <tr key={a}>
                    <td className="px-4 py-3 font-bold text-slate-900">{a}</td>
                    <td className="px-4 py-3 font-medium text-slate-600">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-14 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => openAuthModal('signup')}
            className="rounded-xl bg-slate-900 px-8 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
          >
            Get started
          </button>
          <Link
            href="/launch"
            className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
          >
            Launch a token
          </Link>
          <Link href="/" className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 sm:text-left">
            ← Home
          </Link>
        </div>
      </article>

      <footer className="border-t border-slate-100 py-12 px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
          <BuildryWordmark tone="dark" variant="full" shine shineSidebar />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Buildry 2026</p>
        </div>
      </footer>
    </div>
  )
}
