'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { firebaseAuth } from '@/lib/firebaseClient'

/**
 * Threads-style small + on avatar corner — quick follow without leaving the feed.
 */
export default function QuickFollowAvatarBadge({
  builderId,
  className = '',
}: {
  builderId: string | null | undefined
  className?: string
}) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!user?.id || !builderId || user.id === builderId) {
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
        setReady(true)
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

  if (!user?.id || !builderId || user.id === builderId) return null
  if (following || !ready) return null

  const onFollow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user?.id || loading) return
    const cur = firebaseAuth?.currentUser
    if (!cur) return
    setLoading(true)
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
      if (res.ok && data.followed === true) {
        setFollowing(true)
      }
    } catch {
      /* keep + visible */
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onFollow}
      disabled={loading}
      title="Follow"
      className={`absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-neutral-200 bg-white text-[11px] font-bold leading-none text-neutral-900 shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 ${className}`}
      aria-label="Follow"
    >
      +
    </button>
  )
}
