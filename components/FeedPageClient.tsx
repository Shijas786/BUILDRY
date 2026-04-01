'use client'

import React from 'react'
import Link from 'next/link'
import PostComposer from '@/components/PostComposer'
import FeedList from '@/components/FeedList'
import NewThreadModal from '@/components/NewThreadModal'
import { useAuth } from '@/context/AuthProvider'
import { useRoleStore } from '@/store/role'

export type FeedPageClientProps = {
  initialPosts: unknown[]
}

export default function FeedPageClient({ initialPosts }: FeedPageClientProps) {
  const { user } = useAuth()
  const { activeRole } = useRoleStore()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [threadOpen, setThreadOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      <div className="mx-auto flex max-w-[600px] justify-center">
        <main className="relative w-full flex-1 border-x-0 bg-white min-h-screen xl:border-x xl:border-neutral-200/90">
          <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 backdrop-blur-md px-4 py-3 sm:px-5">
            <h1 className="text-center text-[15px] font-semibold tracking-tight text-neutral-900">For you</h1>
            <p className="mt-0.5 text-center text-[11px] text-neutral-400">Builders &amp; founders you follow</p>
          </header>

          <div className={`px-4 pt-3 sm:px-5 ${user ? 'pb-24 sm:pb-20' : 'pb-8'}`}>
            <QuickActionStrip activeRole={activeRole} />

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

function QuickActionStrip({ activeRole }: { activeRole: string }) {
  const pairs: Record<string, [string, string][]> = {
    developer: [
      ['/jobs', 'Jobs'],
      ['/explore', 'Explore'],
    ],
    founder: [
      ['/launch', 'Launch'],
      ['/jobs', 'Hire'],
    ],
    investor: [
      ['/invest', 'Invest'],
      ['/projects', 'Portfolio'],
    ],
    recruiter: [
      ['/jobs/new', 'Post job'],
      ['/explore', 'Talent'],
    ],
  }
  const items = pairs[activeRole] || pairs.developer

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-[12px] font-medium text-neutral-800 transition-colors hover:bg-neutral-100 hover:border-neutral-300"
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
