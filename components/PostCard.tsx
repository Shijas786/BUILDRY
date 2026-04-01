'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'

interface Post {
  id: string
  content: string
  post_type: string
  images?: string[]
  videos?: string[]
  milestone_title?: string
  milestone_category?: string
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
  update: 'bg-slate-50 text-slate-500',
  milestone: 'bg-emerald-50 text-emerald-600',
  launch: 'bg-violet-50 text-violet-600',
  hiring: 'bg-amber-50 text-amber-600',
  showcase: 'bg-blue-50 text-blue-600',
}

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')

  const author = post.users
  const authorUsername = Array.isArray(author?.builder_profiles)
    ? author?.builder_profiles?.[0]?.username
    : author?.builder_profiles?.username
  const authorPath = `/profile/${authorUsername || author?.id || post.id}`
  const timeAgo = getTimeAgo(post.created_at)

  const handleLike = async () => {
    if (!user?.id) return
    setLiked(prev => !prev)
    setLikesCount(prev => liked ? prev - 1 : prev + 1)
    try {
      await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
    } catch {
      setLiked(prev => !prev)
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
      setComments(prev => [...prev, { ...newComment, users: { name: user.name, avatar_url: user.avatar_url } }])
      setCommentText('')
    } catch {}
  }

  return (
    <div id={`post-${post.id}`} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-all shadow-sm scroll-mt-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={authorPath} className="shrink-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-500 overflow-hidden">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (author?.name || '?').charAt(0).toUpperCase()
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={authorPath} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate">
              {author?.name || 'Anonymous'}
            </Link>
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${TYPE_STYLES[post.post_type] || TYPE_STYLES.update}`}>
              {post.post_type}
            </span>
          </div>
          <p className="text-[10px] text-slate-300">{timeAgo}</p>
        </div>
      </div>

      {/* Milestone badge */}
      {post.milestone_title && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Milestone</p>
          <p className="text-sm font-bold text-emerald-800">{post.milestone_title}</p>
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="" className="rounded-xl w-full h-40 object-cover" />
          ))}
        </div>
      )}

      {post.videos && post.videos.length > 0 && (
        <div className="space-y-2 mb-4">
          {post.videos.map((src, i) => (
            <video
              key={i}
              src={src}
              controls
              playsInline
              className="w-full max-h-80 rounded-xl border border-slate-100 bg-black"
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
        <button onClick={handleLike} className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${liked ? 'text-red-500' : 'text-slate-300 hover:text-slate-500'}`}>
          <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {likesCount > 0 && <span>{likesCount}</span>}
        </button>
        <button onClick={loadComments} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {(post.comments_count || 0) > 0 && <span>{post.comments_count}</span>}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 fade-in">
          {comments.map((c, i) => (
            <div key={c.id || i} className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                {(c.users?.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900">{c.users?.name || 'User'}</p>
                <p className="text-xs text-slate-500">{c.content}</p>
              </div>
            </div>
          ))}
          {user && (
            <div className="flex gap-2 items-center">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 h-9 px-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-900 focus:outline-none focus:border-slate-200 placeholder-slate-300"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 disabled:opacity-30 uppercase tracking-wider"
              >
                Reply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getTimeAgo(dateStr: string | number): string {
  const t = typeof dateStr === 'number' ? dateStr : new Date(dateStr).getTime()
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(t).toLocaleDateString()
}
