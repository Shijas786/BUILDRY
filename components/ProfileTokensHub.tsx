'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import PriceChart from '@/components/PriceChart'
import TradePanel from '@/components/TradePanel'
import ClaimFeesCard from '@/components/ClaimFeesCard'
import { useTrustScore } from '@/hooks/useTrustScore'
import type { BagsToken } from '@/lib/bags'

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function toBagsToken(raw: Record<string, unknown>): BagsToken {
  return {
    mint: String(raw.mint || ''),
    name: String(raw.name || 'Token'),
    symbol: String(raw.symbol || '???'),
    price: Number(raw.price) || 0,
    priceChange24h: Number(raw.priceChange24h) || 0,
    marketCap: Number(raw.marketCap) || 0,
    volume24h: Number(raw.volume24h) || 0,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    creatorWallet: typeof raw.creatorWallet === 'string' ? raw.creatorWallet : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    holders: Number(raw.holders) || 0,
    liquidity: Number(raw.liquidity) || 0,
    feeApy: Number(raw.feeApy) || 0,
    creatorImage: typeof raw.creatorImage === 'string' ? raw.creatorImage : undefined,
  }
}

type Props = {
  tokens: Record<string, unknown>[]
  profileSolWallet: string | null
  /** Only the profile owner should see claim UI and trigger claimable balance fetches. */
  isProfileOwner: boolean
}

export default function ProfileTokensHub({ tokens, profileSolWallet, isProfileOwner }: Props) {
  const { publicKey } = useWallet()
  const bagsTokens = useMemo(() => tokens.map(toBagsToken).filter((t) => t.mint), [tokens])
  const [ix, setIx] = useState(0)
  const selected = bagsTokens[Math.min(ix, bagsTokens.length - 1)]
  const creatorWallet = selected?.creatorWallet || profileSolWallet
  const canShowClaimFees =
    isProfileOwner &&
    !!publicKey &&
    !!creatorWallet &&
    publicKey.toBase58() === creatorWallet.trim()

  const { trust, loading: trustLoading } = useTrustScore(
    selected?.creatorWallet || null,
    selected?.creatorImage,
    selected?.twitter ?? null
  )

  const [claimableSol, setClaimableSol] = useState<number | null>(null)
  const [claimableLoading, setClaimableLoading] = useState(true)

  const refreshClaimable = useCallback(() => {
    if (!canShowClaimFees || !creatorWallet || !selected?.mint) {
      setClaimableSol(null)
      setClaimableLoading(false)
      return
    }
    setClaimableLoading(true)
    fetch(
      `/api/bags/claimable?wallet=${encodeURIComponent(creatorWallet)}&mint=${encodeURIComponent(selected.mint)}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((j) => {
        if (typeof j.sol === 'number' && Number.isFinite(j.sol)) setClaimableSol(j.sol)
        else setClaimableSol(null)
      })
      .catch(() => setClaimableSol(null))
      .finally(() => setClaimableLoading(false))
  }, [canShowClaimFees, creatorWallet, selected?.mint])

  useEffect(() => {
    if (!canShowClaimFees) {
      setClaimableSol(null)
      setClaimableLoading(false)
      return
    }
    refreshClaimable()
    const id = setInterval(refreshClaimable, 25_000)
    return () => clearInterval(id)
  }, [canShowClaimFees, refreshClaimable])

  const [dex24, setDex24] = useState<{ buys: number; sells: number } | null>(null)
  useEffect(() => {
    if (!selected?.mint) return
    let cancelled = false
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(selected.mint)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const pair = j?.pairs?.[0]
        const h24 = pair?.txns?.h24
        if (h24 && typeof h24.buys === 'number' && typeof h24.sells === 'number') {
          setDex24({ buys: h24.buys, sells: h24.sells })
        } else setDex24(null)
      })
      .catch(() => {
        if (!cancelled) setDex24(null)
      })
    return () => {
      cancelled = true
    }
  }, [selected?.mint])

  if (!bagsTokens.length) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-black text-slate-200 mb-1">No token yet</h3>
        <p className="text-sm text-slate-300 mb-6">Launch a Bags token to unlock chart, trading, and fee claims here.</p>
        <Link
          href="/launch"
          className="inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-black"
        >
          Launch token
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {bagsTokens.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {bagsTokens.map((t, i) => (
            <button
              key={t.mint}
              type="button"
              onClick={() => setIx(i)}
              className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                i === ix
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {t.symbol}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatMini label="Holders" value={(selected.holders || 0).toLocaleString()} />
        <StatMini label="24h volume" value={`$${formatCompact(selected.volume24h || 0)}`} />
        <StatMini label="Market cap" value={`$${formatCompact(selected.marketCap || 0)}`} />
        <StatMini
          label="DEX 24h"
          value={dex24 ? `${dex24.buys} buys · ${dex24.sells} sells` : '—'}
        />
      </div>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/40 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Price chart</p>
        <PriceChart mint={selected.mint} price={selected.price} priceChange={selected.priceChange24h} />
      </section>

      <section className="rounded-2xl border border-slate-100 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Holder &amp; trading activity</p>
        <p className="text-sm text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-900">{selected.holders?.toLocaleString() ?? 0}</span> holders
          on-file · 24h DEX activity above is from DexScreener (first listed pair). For full history, charts,
          and claimable fees use the dedicated token page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/token/${encodeURIComponent(selected.mint)}`}
            className="text-[11px] font-black uppercase tracking-widest text-blue-600 hover:underline"
          >
            Open full token page →
          </Link>
          <a
            href={`https://solscan.io/token/${encodeURIComponent(selected.mint)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
          >
            Solscan
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <p className="px-4 pt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Buy &amp; sell (Bags)</p>
        <div className="p-3">
          <TradePanel token={selected} trust={trust} trustLoading={trustLoading} />
        </div>
      </section>

      {canShowClaimFees ? (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Claim creator fees</p>
          <ClaimFeesCard
            tokens={[{ mint: selected.mint, name: selected.name, symbol: selected.symbol }]}
            profileSolWallet={creatorWallet || profileSolWallet}
            expectedFeeWallet="creator"
            hideTitle
            className="!mb-0 border-slate-200 bg-slate-50/50"
            liveClaimableSol={claimableSol}
            liveClaimableLoading={claimableLoading}
            onClaimComplete={refreshClaimable}
          />
        </div>
      ) : null}
    </div>
  )
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}
