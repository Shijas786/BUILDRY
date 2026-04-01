'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { buildTokenPagePath } from '@/lib/tokenDraft'
import { useAuth } from '@/context/AuthProvider'
import QuickFollowAvatarBadge from '@/components/QuickFollowAvatarBadge'
import { BagsFmIcon } from '@/components/BagsLaunchBadge'

interface Post {
  id: string
  content: string
  post_type: string
  images?: string[]
  videos?: string[]
  milestone_title?: string
  milestone_category?: string
  token_mint?: string | null
  launch_symbol?: string | null
  link_url?: string | null
  poll_options?: string[] | null
  poll_responses?: Record<string, number> | null
  location_label?: string | null
  location_lat?: number | null
  location_lng?: number | null
  likes_count: number
  comments_count: number
  reposts_count?: number
  user_reposted?: boolean
  created_at: string | number
  users?: {
    id: string
    name: string
    avatar_url?: string
    account_type?: string
    builder_profiles?: { username?: string }[] | { username?: string }
    is_launch_builder?: boolean
  }
}

function firstNameFromDisplayName(name: string | undefined | null): string {
  const t = name?.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? ''
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
  const [reposted, setReposted] = useState(Boolean(post.user_reposted))
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0)
  /** Bumps on each repost so the flip animation replays. */
  const [repostFlipKey, setRepostFlipKey] = useState(0)
  /** Bumps on each like tap so the heart pop animation replays. */
  const [likePopKey, setLikePopKey] = useState(0)
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
  const authorFirstName = firstNameFromDisplayName(author?.name)
  const authorLinkLabel =
    authorFirstName ||
    (authorUsername ? `@${authorUsername}` : author?.name?.trim() || 'Anonymous')
  const authorPath = `/profile/${authorUsername || author?.id || post.id}`
  const timeAgo = getTimeAgo(post.created_at)
  const tokenMintForLinks = resolveTokenMint(post)
  const launchSymbolForLinks = resolveLaunchSymbol(post)
  const tokenHref =
    tokenMintForLinks != null ? buildTokenHref(post, tokenMintForLinks) : null
  const looksLikeTokenLaunchPost =
    post.post_type === 'launch' ||
    post.milestone_category === 'launch' ||
    /\blaunched\s+\$/i.test(post.milestone_title || '') ||
    /\bjust\s+launched\b/i.test(post.content || '')

  const linkCashtagsAsLaunch = tokenHref != null && looksLikeTokenLaunchPost

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  useEffect(() => {
    setReposted(Boolean(post.user_reposted))
    setRepostsCount(post.reposts_count || 0)
  }, [post.id, post.user_reposted, post.reposts_count])

  const handleLike = async () => {
    if (!user?.id) return
    setLikePopKey((k) => k + 1)
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

  const handleRepost = async () => {
    if (!user?.id) return
    const was = reposted
    if (!was) setRepostFlipKey((k) => k + 1)
    setReposted(!was)
    setRepostsCount((prev) => (was ? Math.max(0, prev - 1) : prev + 1))
    try {
      await fetch(`/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
    } catch {
      setReposted(was)
      setRepostsCount(post.reposts_count || 0)
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
                {authorLinkLabel}
              </Link>
              {author?.is_launch_builder ? (
                <span
                  className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white ring-1 ring-emerald-100"
                  title="Launched on Bags"
                  aria-label="Launched on Bags"
                >
                  <BagsFmIcon className="object-cover" width={15} height={15} />
                </span>
              ) : null}
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
              <p className="text-[14px] font-medium text-neutral-900">
                {tokenHref && post.milestone_title
                  ? linkCashtagsAsLaunch
                    ? renderAllCashtagsToMint(post.milestone_title, tokenHref)
                    : launchSymbolForLinks
                      ? renderTickerRichText(post.milestone_title, tokenHref, launchSymbolForLinks)
                      : post.milestone_title
                  : post.milestone_title}
              </p>
            </div>
          )}

          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-snug text-neutral-900">
            {tokenHref
              ? linkCashtagsAsLaunch
                ? renderAllCashtagsToMint(post.content, tokenHref)
                : launchSymbolForLinks
                  ? renderTickerRichText(post.content, tokenHref, launchSymbolForLinks)
                  : post.content
              : post.content}
          </p>

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

          <div className="mt-3 flex max-w-[280px] flex-wrap items-center gap-1 sm:max-w-none sm:justify-between sm:gap-0">
            <button
              type="button"
              onClick={handleLike}
              className={`group/like flex items-center gap-1.5 rounded-full p-1.5 text-[13px] font-medium transition-colors duration-150 active:scale-[0.96] ${
                liked ? 'text-red-500' : 'text-neutral-500 hover:text-neutral-800'
              }`}
              aria-label="Like"
            >
              <span className="inline-block origin-center transition-transform duration-200 ease-out group-hover/like:scale-110">
                <span key={likePopKey} className="inline-flex like-icon-pop-once">
                  <svg className="h-[18px] w-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </span>
              </span>
              {likesCount > 0 && <span className="tabular-nums">{likesCount}</span>}
            </button>
            <button
              type="button"
              onClick={loadComments}
              className={`flex items-center gap-1.5 rounded-full p-1.5 text-[13px] font-medium transition-colors ${
                showComments ? 'text-sky-700' : 'text-sky-600/90 hover:text-sky-700'
              }`}
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
              onClick={() => void handleRepost()}
              disabled={!user}
              className={`group/repost flex items-center gap-1.5 rounded-full p-1.5 text-[13px] font-medium transition-colors duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 ${
                reposted ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title={user ? 'Repost' : 'Sign in to repost'}
              aria-label="Repost"
            >
              <span className="inline-flex origin-center [transform-style:preserve-3d] transition-transform duration-200 ease-out group-hover/repost:scale-110">
                <span key={repostFlipKey} className="inline-flex repost-icon-flip-once">
                  {/* Classic retweet / repeat arrows (two-way) */}
                  <svg
                    className="h-[18px] w-[18px] shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="m17 1 4 4-4 4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="M3 11V9a4 4 0 0 1 4-4h14"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="m7 23-4-4 4-4"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.75"
                      d="M21 13v2a4 4 0 0 1-4 4H3"
                    />
                  </svg>
                </span>
              </span>
              {repostsCount > 0 && <span className="tabular-nums">{repostsCount}</span>}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-full p-1.5 text-[13px] font-medium text-violet-600/90 transition-colors hover:text-violet-700"
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** First absolute or relative `/token/...` link in a string (legacy posts put the URL only in body). */
function extractTokenLinkFromText(text: string): { mint: string; relativeHref: string } | null {
  if (!text || !text.includes('/token/')) return null

  const absolutes = text.match(/\bhttps?:\/\/[^\s<>"')]+/gi) ?? []
  for (let raw of absolutes) {
    raw = raw.replace(/[),.};]+$/g, '')
    if (!raw.includes('/token/')) continue
    try {
      const u = new URL(raw)
      if (!u.pathname.startsWith('/token/')) continue
      const seg = u.pathname.slice('/token/'.length).split('/')[0] ?? ''
      const mint = decodeURIComponent(seg).trim()
      if (!mint) continue
      return {
        mint,
        relativeHref: `${u.pathname}${u.search}${u.hash}`,
      }
    } catch {
      continue
    }
  }

  const rel = text.match(/\/token\/([^/?#\s<>"')]+)(\?[^?\s<>"')]+)?/)
  if (rel) {
    const mint = decodeURIComponent(rel[1]).trim()
    if (!mint) return null
    const qs = rel[2] || ''
    return {
      mint,
      relativeHref: `/token/${encodeURIComponent(mint)}${qs}`,
    }
  }

  return null
}

function scanPostForTokenLink(post: Post): { mint: string; relativeHref: string } | null {
  for (const block of [post.link_url, post.content, post.milestone_title]) {
    if (typeof block !== 'string' || !block.includes('/token/')) continue
    const hit = extractTokenLinkFromText(block)
    if (hit) return hit
  }
  return null
}

function symbolFromDsInTokenUrls(text: string | null | undefined): string | null {
  if (!text || !text.includes('/token/')) return null
  for (let raw of text.match(/\bhttps?:\/\/[^\s<>"')]+/gi) ?? []) {
    raw = raw.replace(/[),.};]+$/g, '')
    if (!raw.includes('/token/')) continue
    try {
      const u = new URL(raw)
      const ds = u.searchParams.get('ds')
      if (ds?.trim()) return ds.trim().replace(/^\$/, '').toUpperCase()
    } catch {
      continue
    }
  }
  const q = text.match(/[?&]ds=([^&\s<>"')]+)/i)
  if (q) {
    try {
      return decodeURIComponent(q[1]).trim().replace(/^\$/, '').toUpperCase()
    } catch {
      return q[1].trim().replace(/^\$/, '').toUpperCase()
    }
  }
  return null
}

function resolveTokenMint(post: Post): string | null {
  const m = typeof post.token_mint === 'string' ? post.token_mint.trim() : ''
  if (m) return m
  const scanned = scanPostForTokenLink(post)
  return scanned?.mint ?? null
}

function resolveLaunchSymbol(post: Post): string | null {
  const raw = post.launch_symbol
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/^\$/, '').toUpperCase()
  }
  const t = post.milestone_title?.match(/Launched\s+\$([A-Za-z0-9]+)/i)
  if (t) return t[1].toUpperCase()

  const fromDs =
    symbolFromDsInTokenUrls(post.link_url) ||
    symbolFromDsInTokenUrls(post.content) ||
    symbolFromDsInTokenUrls(post.milestone_title)
  if (fromDs) return fromDs

  const url = post.link_url
  if (typeof url === 'string' && url.includes('ds=')) {
    try {
      const u = new URL(url, 'https://buildry.app')
      const ds = u.searchParams.get('ds')
      if (ds?.trim()) return ds.trim().replace(/^\$/, '').toUpperCase()
    } catch {
      const q = url.match(/[?&]ds=([^&]+)/)
      if (q)
        try {
          return decodeURIComponent(q[1]).trim().replace(/^\$/, '').toUpperCase()
        } catch {
          return q[1].trim().replace(/^\$/, '').toUpperCase()
        }
    }
  }

  const fromBody = post.content?.match(/\$([A-Za-z][A-Za-z0-9]{0,31})\b/i)
  if (fromBody) return fromBody[1].toUpperCase()

  return null
}

/** Prefer stored token URL (carries dn/ds for fresh mints); else URL embedded in body; else build path with draft params. */
function buildTokenHref(post: Post, mint: string): string {
  const raw = post.link_url
  if (typeof raw === 'string' && raw.includes('/token/')) {
    try {
      const u = new URL(raw, 'https://buildry.app')
      if (u.pathname.startsWith('/token/')) {
        return `${u.pathname}${u.search}${u.hash}`
      }
    } catch {
      /* fall through */
    }
  }

  const scanned = scanPostForTokenLink(post)
  if (scanned && scanned.mint === mint) {
    return scanned.relativeHref
  }

  const sym = resolveLaunchSymbol(post) || '—'
  const nameGuess =
    (() => {
      const em = post.content?.match(/—\s*([^!]+?)(?:\s*!|\s*$)/)
      return em?.[1]?.trim()
    })() || sym
  return buildTokenPagePath(mint, nameGuess, sym)
}

const tickerLinkClass =
  'font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900 hover:decoration-sky-600 relative z-[5] inline cursor-pointer pointer-events-auto'

function renderAllCashtagsToMint(text: string, href: string): React.ReactNode {
  const re = /\$[A-Za-z][A-Za-z0-9]{0,31}\b/g
  const nodes: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    nodes.push(
      <a
        key={`c-${key++}`}
        href={href}
        className={tickerLinkClass}
        onClick={(e) => e.stopPropagation()}
      >
        {match[0]}
      </a>
    )
    last = match.index + match[0].length
    if (match.index === re.lastIndex) re.lastIndex += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length ? <>{nodes}</> : text
}

function renderTickerRichText(text: string, href: string, symbol: string): React.ReactNode {
  const pattern = new RegExp(`\\$${escapeRegExp(symbol)}\\b`, 'gi')
  const nodes: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    nodes.push(
      <a
        key={`t-${key++}`}
        href={href}
        className={tickerLinkClass}
        onClick={(e) => e.stopPropagation()}
      >
        {match[0]}
      </a>
    )
    last = match.index + match[0].length
    if (match.index === pattern.lastIndex) pattern.lastIndex += 1
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length === 0 ? text : <>{nodes}</>
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
