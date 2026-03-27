'use client'

import React, { useEffect, useState, useCallback } from 'react'
import PostCard from './PostCard'
import { useAuth } from '@/context/AuthProvider'

export default function FeedList() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = useCallback(async (p: number) => {
    try {
      const url = `/api/posts?page=${p}&limit=20${user?.id ? `&userId=${user.id}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (p === 1) {
        setPosts(data)
      } else {
        setPosts(prev => [...prev, ...data])
      }
      setHasMore(data.length === 20)
    } catch {}
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchPosts(1)
  }, [fetchPosts])

  const refresh = () => {
    setPage(1)
    setLoading(true)
    fetchPosts(1)
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage)
  }

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl skeleton" />
              <div className="space-y-2 flex-1">
                <div className="w-32 h-3 skeleton rounded" />
                <div className="w-20 h-2 skeleton rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-3 skeleton rounded" />
              <div className="w-3/4 h-3 skeleton rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-black text-slate-200 mb-2">No posts yet</h3>
        <p className="text-sm text-slate-300 mb-6">Be the first to share an update with the community.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
        >
          Load more
        </button>
      )}
    </div>
  )
}
