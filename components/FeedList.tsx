'use client'

import React, { useEffect, useState, useCallback } from 'react'
import PostCard from './PostCard'

type FeedListProps = {
  /** When set (including `[]`), skips the first client fetch — data came from the server. */
  initialPosts?: any[]
}

export default function FeedList({ initialPosts }: FeedListProps) {
  const seededFromServer = initialPosts !== undefined
  const [posts, setPosts] = useState<any[]>(initialPosts ?? [])
  const [loading, setLoading] = useState(!seededFromServer)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(
    seededFromServer ? (initialPosts?.length ?? 0) === 20 : true
  )

  const fetchPosts = useCallback(async (p: number) => {
    try {
      const url = `/api/posts?page=${p}&limit=20`
      const res = await fetch(url)
      const data = await res.json()
      if (p === 1) {
        setPosts(data)
      } else {
        setPosts((prev) => [...prev, ...data])
      }
      setHasMore(data.length === 20)
    } catch {
      /* keep prior posts */
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (seededFromServer) return
    fetchPosts(1)
  }, [seededFromServer, fetchPosts])

  useEffect(() => {
    if (loading || posts.length === 0) return
    const id = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
    if (!id.startsWith('post-')) return
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading, posts])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage)
  }

  if (loading && posts.length === 0) {
    return (
      <div className="divide-y divide-neutral-200 border-t border-neutral-200">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 py-4">
            <div className="h-9 w-9 shrink-0 rounded-full bg-neutral-100 animate-pulse" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-40 rounded-full bg-neutral-100 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-neutral-100 animate-pulse" />
              <div className="h-3 w-4/5 rounded-full bg-neutral-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="border-t border-neutral-200 py-16 text-center">
        <p className="text-[15px] font-semibold text-neutral-900">No threads yet</p>
        <p className="mt-1 text-[13px] text-neutral-500">When people post, they&apos;ll show up here.</p>
      </div>
    )
  }

  return (
    <div>
      <div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="w-full py-4 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Load more
        </button>
      )}
    </div>
  )
}
