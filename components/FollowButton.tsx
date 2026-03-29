'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'

export default function FollowButton({ builderId }: { builderId: string }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user?.id && user.id === builderId) return null

  const handleToggle = async () => {
    if (!user?.id) return
    setLoading(true)
    setFollowing(prev => !prev)

    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: user.id, builderId }),
      })
      const data = await res.json()
      setFollowing(data.followed)
    } catch {
      setFollowing(prev => !prev)
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
        following
          ? 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-200'
          : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-900/10'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
