'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

type Row = { id: string; username: string | null; display_name: string; avatar_url: string | null }

export default function ProfileFollowDialog({
  open,
  kind,
  builderId,
  onClose,
}: {
  open: boolean
  kind: 'followers' | 'following'
  builderId: string
  onClose: () => void
}) {
  const [users, setUsers] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !builderId) return
    let cancelled = false
    setLoading(true)
    setUsers([])
    fetch(
      `/api/follow/list?builderId=${encodeURIComponent(builderId)}&type=${kind === 'following' ? 'following' : 'followers'}`,
      { cache: 'no-store' }
    )
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && Array.isArray(j.users)) setUsers(j.users)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, kind, builderId])

  if (!open) return null

  const title = kind === 'following' ? 'Following' : 'Followers'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[min(85vh,520px)] sm:rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-2">
          {loading && <p className="text-xs text-slate-400 text-center py-8">Loading…</p>}
          {!loading && users.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">No one here yet.</p>
          )}
          {!loading &&
            users.map((u) => {
              const href = u.username ? `/profile/${encodeURIComponent(u.username)}` : `/profile/${encodeURIComponent(u.id)}`
              return (
                <Link
                  key={u.id}
                  href={href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs font-black text-slate-400">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{u.display_name}</p>
                    {u.username && <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>}
                  </div>
                </Link>
              )
            })}
        </div>
      </div>
    </div>
  )
}
