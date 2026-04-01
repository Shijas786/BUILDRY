'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { firebaseAuth } from '@/lib/firebaseClient'

type Actor = { name: string; username: string | null; avatar_url: string | null }

type NotifRow = {
  id: string
  type: string
  read: boolean
  created_at: number
  post_id: string | null
  comment_preview: string | null
  actor_id: string
  actor: Actor
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function notifHref(n: NotifRow): string {
  const profilePath = n.actor.username
    ? `/profile/${encodeURIComponent(n.actor.username)}`
    : `/profile/${encodeURIComponent(n.actor_id)}`
  if (n.type === 'follow') return profilePath
  if (n.post_id) return `/feed#post-${n.post_id}`
  return '/feed'
}

function notifLabel(n: NotifRow): string {
  const who = n.actor.name || 'Someone'
  if (n.type === 'follow') return `${who} started following you`
  if (n.type === 'post_like') return `${who} liked your post`
  if (n.type === 'post_comment') return `${who} commented on your post`
  return `${who} interacted with you`
}

export default function NotificationsBell({
  compact = false,
  forSidebar = false,
}: {
  compact?: boolean
  forSidebar?: boolean
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotifRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const fetchList = useCallback(async () => {
    if (!user?.id || !firebaseAuth?.currentUser) {
      setItems([])
      setUnreadCount(0)
      return
    }
    try {
      const token = await firebaseAuth.currentUser.getIdToken()
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const j = await res.json()
      setItems(Array.isArray(j.notifications) ? j.notifications : [])
      setUnreadCount(typeof j.unreadCount === 'number' ? j.unreadCount : 0)
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!user?.id) return
    const t = setInterval(fetchList, 90_000)
    return () => clearInterval(t)
  }, [user?.id, fetchList])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchList().finally(() => setLoading(false))
  }, [open, fetchList])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const markRead = async (id: string) => {
    const cur = firebaseAuth?.currentUser
    if (!cur) return
    try {
      const token = await cur.getIdToken()
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationId: id }),
      })
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      /* ignore */
    }
  }

  const markAllRead = async () => {
    const cur = firebaseAuth?.currentUser
    if (!cur) return
    try {
      const token = await cur.getIdToken()
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      })
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      /* ignore */
    }
  }

  if (!user) return null

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`relative rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all shrink-0 ${
          compact ? 'w-9 h-9' : forSidebar ? 'w-9 h-9' : 'w-10 h-10'
        }`}
      >
        <IconBell className={compact ? 'w-5 h-5' : 'w-[22px] h-[22px]'} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-[610] w-[min(calc(100vw-1.5rem),20rem)] max-h-[min(70vh,22rem)] overflow-hidden flex flex-col rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-900/10 ${
            forSidebar ? 'left-0 bottom-full mb-2' : 'right-0 top-[calc(100%+8px)]'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {loading && <p className="text-xs text-slate-400 text-center py-8 px-3">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8 px-3">No notifications yet.</p>
            )}
            {!loading &&
              items.map((n) => (
                <Link
                  key={n.id}
                  href={notifHref(n)}
                  onClick={() => {
                    if (!n.read) markRead(n.id)
                    setOpen(false)
                  }}
                  className={`flex gap-2.5 px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !n.read ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {n.actor.avatar_url ? (
                      <img src={n.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (n.actor.name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-800 leading-snug">{notifLabel(n)}</p>
                    {n.type === 'post_comment' && n.comment_preview && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">&ldquo;{n.comment_preview}&rdquo;</p>
                    )}
                    <p className="text-[9px] text-slate-300 mt-1">
                      {typeof n.created_at === 'number'
                        ? new Date(n.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
