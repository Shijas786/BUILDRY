'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type HolderApi = {
  rank: number
  owner: string
  balanceUi: number
  tokenAccount: string
  buildry?: { username: string; display_name: string; profileHref: string }
}

function fmtHolderBal(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return n.toLocaleString(undefined, { maximumSignificantDigits: 6 })
}

function shortAddr(s: string) {
  if (s.length <= 12) return s
  return `${s.slice(0, 4)}…${s.slice(-4)}`
}

export default function TokenHoldersSection({ mint, symbol }: { mint: string; symbol: string }) {
  const [holders, setHolders] = useState<HolderApi[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    fetch(`/api/tokens/${encodeURIComponent(mint)}/holders`)
      .then(async (r) => {
        const j = (await r.json()) as { holders?: HolderApi[]; error?: string }
        if (!r.ok) throw new Error(j.error || 'Could not load holders')
        return j.holders ?? []
      })
      .then((list) => {
        if (!cancelled) setHolders(list)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setErr(e.message || 'Failed to load')
          setHolders([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mint])

  const buildryOnPage = (holders || []).filter((h) => h.buildry)

  return (
    <section
      id="holders-chart"
      style={{ scrollMarginTop: 16, border: '1px solid #e8e8e8', borderRadius: 12, padding: '14px 16px', background: '#fff' }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', fontWeight: 600 }}>
            Holders
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            Largest balances on-chain (RPC sample). Wallets linked on Buildry are highlighted.
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-2 py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && err && <p className="py-4 text-sm font-semibold text-amber-800">{err}</p>}

      {!loading && !err && buildryOnPage.length > 0 && (
        <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-800">Buildry buyers / holders</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {buildryOnPage.map((h) => (
              <li key={h.owner}>
                <Link
                  href={h.buildry!.profileHref}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/80 bg-white px-2.5 py-1 text-xs font-bold text-sky-950 hover:bg-sky-50"
                >
                  <span className="max-w-[140px] truncate">{h.buildry!.display_name}</span>
                  <span className="font-mono text-[10px] text-sky-700">@{h.buildry!.username}</span>
                  <span className="font-mono text-[10px] text-gray-500">{fmtHolderBal(h.balanceUi)} ${symbol}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !err && holders && holders.length === 0 && (
        <p className="py-4 text-sm text-gray-500">No holder accounts returned yet for this mint.</p>
      )}

      {!loading && !err && holders && holders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Wallet</th>
                <th className="pb-2 pr-2">Buildry</th>
                <th className="pb-2 text-right font-mono">Balance (${symbol})</th>
              </tr>
            </thead>
            <tbody>
              {holders.map((h) => (
                <tr key={h.owner} className="border-b border-gray-50">
                  <td className="py-2.5 pr-2 font-mono text-gray-400">{h.rank}</td>
                  <td className="py-2.5 pr-2">
                    <a
                      href={`https://solscan.io/account/${encodeURIComponent(h.owner)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] font-semibold text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-600"
                      title={h.owner}
                    >
                      {shortAddr(h.owner)}
                    </a>
                  </td>
                  <td className="py-2.5 pr-2">
                    {h.buildry ? (
                      <Link
                        href={h.buildry.profileHref}
                        className="inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-sky-900 hover:bg-sky-200"
                      >
                        {h.buildry.display_name}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-gray-900">
                    {fmtHolderBal(h.balanceUi)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
