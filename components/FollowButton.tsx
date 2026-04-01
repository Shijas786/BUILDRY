'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { firebaseAuth } from '@/lib/firebaseClient'

export default function FollowButton({
  builderId,
  onChange,
}: {
  builderId: string
  /** Called after a successful follow/unfollow so the parent can refresh counts. */
  onChange?: () => void
}) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!user?.id || user.id === builderId) {
      setFollowing(false)
      setReady(true)
      return
    }
    const cur = firebaseAuth?.currentUser
    if (!cur) {
      setFollowing(false)
      setReady(true)
      return
    }
    try {
      const token = await cur.getIdToken()
      const res = await fetch(`/api/follow?builderId=${encodeURIComponent(builderId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setFollowing(false)
        return
      }
      const data = await res.json()
      setFollowing(!!data.following)
    } catch {
      setFollowing(false)
    } finally {
      setReady(true)
    }
  }, [user?.id, builderId])

  useEffect(() => {
    setReady(false)
    refreshStatus()
  }, [refreshStatus])

  if (user?.id && user.id === builderId) return null

  const handleToggle = async () => {
    if (!user?.id) return
    const cur = firebaseAuth?.currentUser
    if (!cur) return
    setLoading(true)
    const prev = following
    setFollowing(!prev)

    try {
      const token = await cur.getIdToken()
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ builderId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFollowing(prev)
        return
      }
      setFollowing(!!data.followed)
      onChange?.()
    } catch {
      setFollowing(prev)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading || !ready}
      className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 ${
        following
          ? 'bg-white text-slate-700 border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10'
      }`}
    >
      {!ready ? '…' : following ? 'Unfollow' : 'Follow'}
    </button>
  )
}
