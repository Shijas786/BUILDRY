'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import QuickFollowAvatarBadge from '@/components/QuickFollowAvatarBadge'

interface Post {
  id: string
  content: string
  post_type: string
  images?: string[]
  videos?: string[]
  milestone_title?: string
  milestone_category?: string
  poll_options?: string[] | null
  poll_responses?: Record<string, number> | null
  location_label?: string | null
  location_lat?: number | null
  location_lng?: number | null
  likes_count: number
  comments_count: number
  created_at: string | number
  users?: {
    id: string
    name: string
    avatar_url?: string
    account_type?: string
    builder_profiles?: { username?: string }[] | { username?: string }
  }
}

const TYPE_STYLES: Record<string, string> = {
  update: 'text-neutral-500',
  milestone: 'text-neutral-600',
  launch: 'text-neutral-600',
  hiring: 'text-neutral-600',
  showcase: 'text-neutral-600',
  poll: 'text-neutral-600',
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [reposted, setReposted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pollResponses, setPollResponses] = useState<Record<string, number>>(() =>
    post.poll_responses && typeof post.poll_responses === 'object' ? { ...post.poll_responses } : {}
  )
  const [pollVoteLoading, setPollVoteLoading] = useState<number | null>(null)

  const author = post.users
  const authorUsername = Array.isArray(author?.builder_profiles)
    ? author?.builder_profiles?.[0]?.username
    : author?.builder_profiles?.username
  const authorPath = `/profile/${authorUsername || author?.id || post.id}`
  const timeAgo = getTimeAgo(post.created_at)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleLike = async () => {
    if (!user?.id) return
    setLiked((prev) => !prev)
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1))
    try {
      await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
    } catch {
      setLiked((prev) => !prev)
      setLikesCount(post.likes_count || 0)
    }
  }

  const loadComments = async () => {
    setShowComments(!showComments)
    if (!showComments) {
      const res = await fetch(`/api/posts/${post.id}/comments`)
      const data = await res.json()
      setComments(data)
    }
  }

  const submitComment = async () => {
    if (!commentText.trim() || !user?.id) return
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: user.id, content: commentText.trim() }),
      })
      const newComment = await res.json()
      setComments((prev) => [...prev, { ...newComment, users: { name: user.name, avatar_url: user.avatar_url } }])
      setCommentText('')
    } catch {}
  }

  const copyPostLink = async () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/feed#post-${post.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
    setMenuOpen(false)
  }

  const pollOptions = Array.isArray(post.poll_options) ? post.poll_options.filter((x) => typeof x === 'string' && x.trim()) : []
  const pollCounts = pollVoteCounts(pollOptions, pollResponses)
  const pollTotal = pollCounts.reduce((a, b) => a + b, 0)
  const myPollVote = user?.id != null ? pollResponses[user.id] : undefined

  const votePoll = async (optionIndex: number) => {
    if (!user?.id || pollVoteLoading != null || myPollVote !== undefined) return
    setPollVoteLoading(optionIndex)
    try {
      const res = await fetch(`/api/posts/${post.id}/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, optionIndex }),
      })
      if (res.ok) {
        setPollResponses((prev) => ({ ...prev, [user.id]: optionIndex }))
      }
    } catch {
      /* ignore */
    } finally {
      setPollVoteLoading(null)
    }
  }

  const handleShare = async () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/feed#post-${post.id}`
    try {
      if (navigator.share) {
        await navigator.share({ url, title: 'Buildry post' })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* user cancelled or error */
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className="border-b border-neutral-200 py-4 scroll-mt-24 first:pt-0"
    >
      <div className="flex gap-3">
        <div className="relative h-9 w-9 shrink-0 pt-0.5">
          <Link href={authorPath} className="block">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (author?.name || '?').charAt(0).toUpperCase()
              )}
            </div>
          </Link>
          <QuickFollowAvatarBadge builderId={author?.id} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 text-[15px] leading-tight">
              <Link href={authorPath} className="font-semibold text-neutral-900 hover:underline">
                {author?.name || 'Anonymous'}
              </Link>
              {authorUsername ? <span className="text-neutral-500">@{authorUsername}</span> : null}
              <span className="text-neutral-400">·</span>
              <span className="text-[13px] text-neutral-400">{timeAgo}</span>
              <span className={`ml-0.5 text-[11px] font-medium ${TYPE_STYLES[post.post_type] || TYPE_STYLES.update}`}>
                · {post.post_type}
              </span>
            </div>
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                aria-expanded={menuOpen}
                aria-label="Post menu"
              >
                <svg className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={copyPostLink}
                    className="block w-full px-4 py-2.5 text-left text-[13px] text-neutral-800 hover:bg-neutral-50"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      handleShare()
                    }}
                    className="block w-full px-4 py-2.5 text-left text-[13px] text-neutral-800 hover:bg-neutral-50"
                  >
                    Share…
                  </button>
                </div>
              )}
            </div>
          </div>

          {post.milestone_title && (
            <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Milestone</p>
              <p className="text-[14px] font-medium text-neutral-900">{post.milestone_title}</p>
            </div>
          )}

          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-snug text-neutral-900">{post.content}</p>

          {(post.location_label || (post.location_lat != null && post.location_lng != null)) && (
            <div className="mt-2">
              {post.location_lat != null && post.location_lng != null ? (
                <a
                  href={`https://www.google.com/maps?q=${post.location_lat},${post.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-700 hover:underline"
                >
                  <span className="text-neutral-500" aria-hidden>
                    📍
                  </span>
                  {post.location_label?.trim() || 'View on map'}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-neutral-700">
                  <span className="text-neutral-500" aria-hidden>
                    📍
                  </span>
                  {post.location_label?.trim()}
                </span>
              )}
            </div>
          )}

          {pollOptions.length >= 2 && (
            <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/90 p-3">
              {pollOptions.map((label, i) => {
                const count = pollCounts[i] || 0
                const pct = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0
                const isMine = myPollVote === i
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={myPollVote !== undefined || pollVoteLoading != null || !user}
                    onClick={() => votePoll(i)}
                    className={`relative w-full overflow-hidden rounded-lg border py-2.5 pl-3 pr-3 text-left text-[13px] transition-colors ${
                      isMine
                        ? 'border-neutral-900 bg-white font-medium text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 disabled:cursor-default disabled:opacity-90'
                    }`}
                  >
                    {pollTotal > 0 && (
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 bg-neutral-200/80"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <span className="relative z-[1] flex w-full items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{label}</span>
                      {pollTotal > 0 && (
                        <span className="shrink-0 tabular-nums text-[11px] text-neutral-500">{pct}%</span>
                      )}
                    </span>
                  </button>
                )
              })}
              {!user && <p className="text-[11px] text-neutral-400">Sign in to vote.</p>}
              {user && myPollVote === undefined && <p className="text-[11px] text-neutral-400">Tap an option to vote.</p>}
            </div>
          )}

          {post.images && post.images.length > 0 && (
            <div
              className={`mt-3 grid gap-0.5 overflow-hidden rounded-xl border border-neutral-200 ${
                post.images.length >= 3 ? 'grid-cols-3' : post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {post.images.map((img, i) => (
                <img key={i} src={img} alt="" className="aspect-square w-full object-cover bg-neutral-100 sm:aspect-video" />
              ))}
            </div>
          )}

          {post.videos && post.videos.length > 0 && (
            <div className="mt-3 space-y-2">
              {post.videos.map((src, i) => (
                <video
                  key={i}
                  src={src}
                  controls
                  playsInline
                  className="max-h-80 w-full overflow-hidden rounded-xl border border-neutral-200 bg-black"
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex max-w-[280px] flex-wrap items-center gap-1 text-neutral-500 sm:max-w-none sm:justify-between sm:gap-0">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 rounded-full p-1.5 text-[13px] transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${
                liked ? 'text-neutral-900' : ''
              }`}
              aria-label="Like"
            >
              <svg className="h-[18px] w-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              {likesCount > 0 && <span className="tabular-nums">{likesCount}</span>}
            </button>
            <button
              type="button"
              onClick={loadComments}
              className="flex items-center gap-1.5 rounded-full p-1.5 text-[13px] transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Comments"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {(post.comments_count || 0) > 0 && <span className="tabular-nums">{post.comments_count}</span>}
            </button>
            <button
              type="button"
              onClick={() => setReposted((r) => !r)}
              className={`flex items-center gap-1.5 rounded-full p-1.5 text-[13px] transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${
                reposted ? 'text-neutral-900' : ''
              }`}
              title="Repost (local for now)"
              aria-label="Repost"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full p-1.5 text-[13px] transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Share"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
              {comments.map((c, i) => (
                <div key={c.id || i} className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[10px] font-semibold text-neutral-500">
                    {(c.users?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-neutral-900">{c.users?.name || 'User'}</p>
                    <p className="text-[13px] text-neutral-600">{c.content}</p>
                  </div>
                </div>
              ))}
              {user && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                    placeholder="Reply…"
                    className="h-9 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={submitComment}
                    disabled={!commentText.trim()}
                    className="text-[12px] font-semibold text-neutral-900 hover:text-neutral-600 disabled:opacity-30"
                  >
                    Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function pollVoteCounts(options: string[], responses: Record<string, number>): number[] {
  const c = options.map(() => 0)
  for (const uid of Object.keys(responses)) {
    const idx = responses[uid]
    if (typeof idx === 'number' && idx >= 0 && idx < c.length) c[idx] += 1
  }
  return c
}

function getTimeAgo(dateStr: string | number): string {
  const t = typeof dateStr === 'number' ? dateStr : new Date(dateStr).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(t).toLocaleDateString()
}
