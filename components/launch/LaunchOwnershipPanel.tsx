'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * Mainnet Bags launch: Jito bundle tip (~0.015 SOL) + several signatures + rent.
 * Pre-buy is extra on top. Aligns ~with server reserve checks in app/launch.
 */
const MIN_SOL_LAUNCH_FEES_AND_TIP = 0.05

/** Preset rows: suggested USD for creator pre-buy (converted to SOL at launch via CoinGecko). */
const OWNERSHIP_PRESETS: { pct: number; usd: number }[] = [
  { pct: 1, usd: 25 },
  { pct: 10, usd: 271 },
  { pct: 30, usd: 983 },
  { pct: 50, usd: 2074 },
  { pct: 80, usd: 6190 },
]

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseUsdInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function shortAddress(base58: string): string {
  if (base58.length <= 12) return base58
  return `${base58.slice(0, 4)}…${base58.slice(-4)}`
}

type Props = {
  disabled?: boolean
  loading?: boolean
  onLaunch: (detail: {
    ownershipUsd: number
    ownershipPct: number | null
    solanaWallet: string | null
  }) => void
}

export default function LaunchOwnershipPanel({ disabled, loading, onLaunch }: Props) {
  const { connection } = useConnection()
  const { publicKey, connected, disconnect, wallet } = useWallet()
  const { setVisible } = useWalletModal()

  const [amountStr, setAmountStr] = useState('')
  const [selectedPct, setSelectedPct] = useState<number | null>(null)
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [solUsd, setSolUsd] = useState<number | null>(null)

  const amountNum = useMemo(() => parseUsdInput(amountStr), [amountStr])

  const refreshBalance = useCallback(async () => {
    if (!publicKey) {
      setSolBalance(null)
      return
    }
    setBalanceLoading(true)
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      setSolBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      setSolBalance(null)
    } finally {
      setBalanceLoading(false)
    }
  }, [connection, publicKey])

  useEffect(() => {
    void refreshBalance()
  }, [refreshBalance])

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false
    const subId = connection.onAccountChange(publicKey, (info) => {
      if (!cancelled) setSolBalance(info.lamports / LAMPORTS_PER_SOL)
    }, 'confirmed')
    return () => {
      cancelled = true
      void connection.removeAccountChangeListener(subId)
    }
  }, [connection, publicKey])

  useEffect(() => {
    let cancelled = false
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then((r) => r.json())
      .then((j) => {
        const p = j?.solana?.usd
        if (!cancelled && typeof p === 'number' && p > 0) setSolUsd(p)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const applyPreset = (row: (typeof OWNERSHIP_PRESETS)[0]) => {
    setSelectedPct(row.pct)
    setAmountStr(formatUsd(row.usd))
  }

  const ownershipPctForAmount = useMemo(() => {
    if (amountNum <= 0) return null
    let best: { pct: number; diff: number } | null = null
    for (const p of OWNERSHIP_PRESETS) {
      const diff = Math.abs(p.usd - amountNum)
      if (!best || diff < best.diff) best = { pct: p.pct, diff }
    }
    return best && best.diff < amountNum * 0.5 ? best.pct : null
  }, [amountNum])

  const handleLaunchClick = () => {
    if (!connected || !publicKey) {
      setVisible(true)
      return
    }
    onLaunch({
      ownershipUsd: amountNum,
      ownershipPct: selectedPct ?? ownershipPctForAmount,
      solanaWallet: publicKey.toBase58(),
    })
  }

  const approxUsdBalance =
    solBalance != null && solUsd != null ? solBalance * solUsd : null

  const prebuySolEstimate = useMemo(() => {
    if (amountNum <= 0 || solUsd == null || !(solUsd > 0)) return 0
    return amountNum / solUsd
  }, [amountNum, solUsd])

  const minRecommendedSol = MIN_SOL_LAUNCH_FEES_AND_TIP + prebuySolEstimate

  const lowBalanceForLaunch =
    connected &&
    solBalance != null &&
    solBalance + 1e-9 < minRecommendedSol

  /** Allow click when disconnected so the same button opens the wallet modal (handleLaunchClick). */
  const launchDisabled = disabled || loading

  return (
    <div className="space-y-5">
      <div className="rounded-[1.25rem] border border-gray-200/90 bg-[#fafafa] p-5 shadow-sm sm:p-6">
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-800">Ownership</h4>
        <p className="mt-1 text-sm font-medium text-gray-500">Buy shares before anyone else.</p>

        <div className="mt-5">
          <label htmlFor="launch-ownership-usd" className="sr-only">
            Amount in USD to buy as creator
          </label>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100/80">
            <div className="flex items-baseline gap-1 px-5 py-4 sm:py-5">
              <span className="text-xl font-semibold text-gray-400">$</span>
              <input
                id="launch-ownership-usd"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => {
                  setSelectedPct(null)
                  setAmountStr(e.target.value)
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-semibold tracking-tight text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0 sm:text-4xl"
              />
            </div>
          </div>
          {amountNum > 0 && solUsd != null && (
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-500">
              ≈{' '}
              <span className="font-bold tabular-nums text-gray-700">{(amountNum / solUsd).toFixed(4)} SOL</span> creator
              pre-buy at the CoinGecko rate shown here; the exact lamports are fixed when you launch.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!connected ? (
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 sm:w-auto"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Connect Solana wallet
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-600">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                {balanceLoading ? (
                  <span className="text-gray-500">Loading balance…</span>
                ) : solBalance != null ? (
                  <>
                    <span className="tabular-nums">{solBalance.toFixed(4)} SOL</span>
                    {approxUsdBalance != null && (
                      <span className="font-semibold text-gray-500">~${formatUsd(approxUsdBalance)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-500">Balance unavailable</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span className="font-mono">{publicKey ? shortAddress(publicKey.toBase58()) : ''}</span>
                {wallet?.adapter.name && (
                  <span className="rounded-md bg-gray-200/80 px-1.5 py-0.5 font-semibold text-gray-600">{wallet.adapter.name}</span>
                )}
                <button
                  type="button"
                  onClick={() => void refreshBalance()}
                  className="font-bold text-emerald-600 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="font-bold text-gray-400 underline decoration-gray-300 underline-offset-2 hover:text-gray-600"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {OWNERSHIP_PRESETS.map((row) => {
            const active = selectedPct === row.pct
            return (
              <button
                key={row.pct}
                type="button"
                onClick={() => applyPreset(row)}
                className={`min-w-[4.5rem] flex-1 rounded-xl border px-3 py-3 text-center transition-all sm:min-w-[5rem] ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="block text-sm font-black text-gray-900">{row.pct}%</span>
                <span className="mt-0.5 block text-[11px] font-semibold text-gray-400">${row.usd.toLocaleString('en-US')}</span>
              </button>
            )
          })}
        </div>

        <div
          className={`mt-5 rounded-xl border px-4 py-3 text-left ${
            lowBalanceForLaunch
              ? 'border-amber-400 bg-amber-50/95'
              : 'border-sky-200/90 bg-sky-50/80'
          }`}
          role="status"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-700">
            SOL needed for fees
          </p>
          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-800">
            Even with <span className="font-bold">$0</span> creator pre-buy, mainnet launch still costs SOL: multiple
            transactions plus a <span className="font-bold">Jito bundle tip</span> (often about{' '}
            <span className="font-bold tabular-nums">0.015 SOL</span>). Plan for at least{' '}
            <span className="font-bold tabular-nums">~{MIN_SOL_LAUNCH_FEES_AND_TIP} SOL</span> in this wallet before you
            start; add your pre-buy on top if you enter a USD amount above.
          </p>
          <p className="mt-2 text-[11px] font-semibold text-gray-700">
            Suggested minimum right now:{' '}
            <span className="font-black tabular-nums text-gray-900">≈ {minRecommendedSol.toFixed(3)} SOL</span>
            {prebuySolEstimate > 0 && (
              <span className="font-medium text-gray-600">
                {' '}
                (fees + tip + ~{prebuySolEstimate.toFixed(4)} SOL pre-buy)
              </span>
            )}
            .
          </p>
          {lowBalanceForLaunch && !balanceLoading && (
            <p className="mt-2 text-[11px] font-bold text-amber-950">
              Your wallet balance looks below that—add SOL before launching or the chain may reject the transaction.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={launchDisabled}
        onClick={handleLaunchClick}
        className="w-full rounded-full bg-[#00D632] py-4 text-lg font-black tracking-wide text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-[#00c02e] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? 'Preparing transaction…'
          : !connected
            ? 'Connect wallet to launch'
            : 'Sign & launch on Solana'}
      </button>

      {!connected && (
        <p className="text-center text-[11px] font-medium text-gray-500">
          This is a <strong className="font-semibold text-gray-700">real mainnet</strong> launch: Phantom or Solflare will ask you to
          sign. If the app finishes without a wallet popup, your site is still on an old demo build—redeploy from the latest git.
        </p>
      )}

      <p className="text-center text-[11px] text-gray-500">
        By launching, you agree to our{' '}
        <Link href="/terms" className="font-semibold text-gray-700 underline decoration-gray-400 underline-offset-2 hover:text-gray-900">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  )
}
