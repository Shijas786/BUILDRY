'use client'

import React from 'react'
import PostComposer from '@/components/PostComposer'
import FeedList from '@/components/FeedList'
import NewThreadModal from '@/components/NewThreadModal'
import { useAuth } from '@/context/AuthProvider'

export type FeedPageClientProps = {
  initialPosts: unknown[]
}

export default function FeedPageClient({ initialPosts }: FeedPageClientProps) {
  const { user } = useAuth()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [threadOpen, setThreadOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="mx-auto flex max-w-[600px] justify-center">
        <main className="relative w-full flex-1 border-x-0 bg-white min-h-screen xl:border-x xl:border-neutral-200/90">
          <div className={`px-4 pt-4 sm:px-5 sm:pt-5 ${user ? 'pb-24 sm:pb-20' : 'pb-8'}`}>
            {user ? (
              <PostComposer onPostCreated={() => setRefreshKey((k) => k + 1)} />
            ) : null}
            <FeedList
              key={refreshKey}
              initialPosts={refreshKey === 0 ? (initialPosts as any[]) : undefined}
            />
          </div>
        </main>
      </div>

      {user ? (
        <>
          <NewThreadModal
            open={threadOpen}
            onClose={() => setThreadOpen(false)}
            onPosted={() => setRefreshKey((k) => k + 1)}
          />
          <button
            type="button"
            onClick={() => setThreadOpen(true)}
            className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[90] flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-300 bg-neutral-800 text-3xl font-light leading-none text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95 md:bottom-8 md:right-8"
            aria-label="New thread"
          >
            +
          </button>
        </>
      ) : null}
    </div>
  )
}
