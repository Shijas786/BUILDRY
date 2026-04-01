'use client'

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/context/AuthProvider'
import { firebaseStorage } from '@/lib/firebaseClient'
import { uploadPostMediaFile } from '@/lib/uploadPostMediaClient'
import ComposerEmojiPopover from '@/components/ComposerEmojiPopover'
import { getAnchoredPopoverPosition } from '@/lib/anchoredPopoverPosition'

const LOCATION_POPOVER_W = 260
const LOCATION_POPOVER_H = 300

const POST_TYPES = [
  { id: 'update', label: 'Update' },
  { id: 'milestone', label: 'Milestone' },
  { id: 'launch', label: 'Launch' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'showcase', label: 'Showcase' },
]

const MAX_ATTACHMENTS = 8

export type PostComposerProps = {
  onPostCreated?: () => void
  variant?: 'inline' | 'modal'
}

export default function PostComposer({ onPostCreated, variant = 'inline' }: PostComposerProps) {
  const { user } = useAuth()
  const isModal = variant === 'modal'
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('update')
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(isModal)
  const [attachments, setAttachments] = useState<Array<{ url: string; kind: 'image' | 'video' }>>([])
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaStatus, setMediaStatus] = useState<string | null>(null)
  const [mediaErr, setMediaErr] = useState<string | null>(null)
  const [pollOpen, setPollOpen] = useState(false)
  const [pollDraft, setPollDraft] = useState(['', ''])
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationLabel, setLocationLabel] = useState('')
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<string | null>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const locationBtnRef = useRef<HTMLButtonElement>(null)
  const locationPopoverRef = useRef<HTMLDivElement>(null)
  const [locationPopoverPos, setLocationPopoverPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  )

  useEffect(() => {
    if (isModal && textareaRef.current) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 100)
      return () => window.clearTimeout(t)
    }
  }, [isModal])

  const updateLocationPopoverPos = () => {
    const el = locationBtnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const w = Math.min(LOCATION_POPOVER_W, window.innerWidth - 16)
    const p = getAnchoredPopoverPosition(rect, w, LOCATION_POPOVER_H, isModal ? 'end' : 'start')
    setLocationPopoverPos({ top: p.top, left: p.left, width: w })
  }

  useLayoutEffect(() => {
    if (!locationOpen) {
      setLocationPopoverPos(null)
      return
    }
    updateLocationPopoverPos()
  }, [locationOpen, isModal])

  useEffect(() => {
    if (!locationOpen) return
    const onScrollOrResize = () => updateLocationPopoverPos()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [locationOpen])

  useEffect(() => {
    if (!locationOpen) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (locationBtnRef.current?.contains(t)) return
      if (locationPopoverRef.current?.contains(t)) return
      setLocationOpen(false)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [locationOpen])

  if (!user) return null

  const trimmedPollOptions = pollDraft.map((s) => s.trim()).filter(Boolean)
  const pollValid = !pollOpen || trimmedPollOptions.length >= 2
  const canSubmit =
    Boolean(content.trim()) && pollValid && !loading && !mediaUploading

  const handleMediaPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !user.id) return
    setMediaErr(null)
    setMediaStatus(null)
    setMediaUploading(true)
    const startLen = attachments.length
    const newItems: Array<{ url: string; kind: 'image' | 'video' }> = []
    try {
      for (const file of Array.from(files)) {
        if (startLen + newItems.length >= MAX_ATTACHMENTS) break
        newItems.push(
          await uploadPostMediaFile(user.id, file, {
            onVideoCompressProgress: (p) => {
              if (p.phase === 'load') setMediaStatus('Loading video encoder…')
              else if (p.ratio != null && !Number.isNaN(p.ratio)) {
                setMediaStatus(`Compressing video… ${Math.round(p.ratio * 100)}%`)
              } else {
                setMediaStatus('Compressing video…')
              }
            },
            onUploadStart: () => setMediaStatus('Uploading…'),
          })
        )
      }
      if (newItems.length > 0) {
        setAttachments((prev) => [...prev, ...newItems].slice(0, MAX_ATTACHMENTS))
      }
    } catch (err: unknown) {
      setMediaErr(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setMediaUploading(false)
      setMediaStatus(null)
      e.target.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Location not supported in this browser')
      return
    }
    setGeoStatus('Locating…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus(null)
        if (!locationLabel.trim()) setLocationLabel('Current location')
      },
      () => {
        setGeoStatus('Could not get location')
      },
      { enableHighAccuracy: false, timeout: 12_000 }
    )
  }

  const resetExtras = () => {
    setPollDraft(['', ''])
    setPollOpen(false)
    setLocationLabel('')
    setLocationCoords(null)
    setLocationOpen(false)
    setGeoStatus(null)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)

    try {
      const images = attachments.filter((a) => a.kind === 'image').map((a) => a.url)
      const videos = attachments.filter((a) => a.kind === 'video').map((a) => a.url)
      const isPollPost = pollOpen && trimmedPollOptions.length >= 2
      const loc =
        locationLabel.trim() ||
        (locationCoords ? 'Current location' : '') ||
        undefined

      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: user.id,
          content: content.trim(),
          postType: isPollPost ? 'poll' : postType,
          images,
          videos,
          milestoneTitle: postType === 'milestone' && !isPollPost ? milestoneTitle : null,
          pollOptions: isPollPost ? trimmedPollOptions : undefined,
          locationLabel: loc || undefined,
          locationLat: locationCoords?.lat ?? null,
          locationLng: locationCoords?.lng ?? null,
        }),
      })
      setContent('')
      setMilestoneTitle('')
      setPostType('update')
      setExpanded(isModal)
      setAttachments([])
      resetExtras()
      onPostCreated?.()
    } catch {}

    setLoading(false)
  }

  const placeholder = isModal ? "What's new?" : 'Start a thread…'
  const wrapClass = isModal ? '' : 'border-b border-neutral-200 pb-4 mb-0'

  const locationPopoverPortal =
    locationOpen &&
    locationPopoverPos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={locationPopoverRef}
        className="fixed z-[560] max-h-[min(320px,50vh)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-2.5 shadow-xl"
        style={{
          top: locationPopoverPos.top,
          left: locationPopoverPos.left,
          width: locationPopoverPos.width,
        }}
        role="dialog"
        aria-label="Add location"
      >
        <p className="mb-1.5 text-[11px] font-medium text-neutral-500">Add location</p>
        <input
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          placeholder="City, venue, or place"
          className="mb-2 h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          className="mb-2 w-full rounded-lg border border-neutral-200 py-1.5 text-[11px] font-medium text-neutral-800 hover:bg-neutral-50"
        >
          Use current location
        </button>
        {geoStatus && <p className="mb-2 text-[11px] text-neutral-500">{geoStatus}</p>}
        {locationCoords && (
          <p className="mb-2 text-[10px] text-neutral-400 tabular-nums">
            {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
          </p>
        )}
        <button
          type="button"
          onClick={() => setLocationOpen(false)}
          className="w-full rounded-lg bg-neutral-900 py-1.5 text-[11px] font-semibold text-white"
        >
          Done
        </button>
      </div>,
      document.body
    )

  const toolbarExtras = (
    <>
      <ToolbarIcon
        compact={isModal}
        label="Photos & video"
        onClick={() => mediaInputRef.current?.click()}
        disabled={!firebaseStorage || mediaUploading || attachments.length >= MAX_ATTACHMENTS}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </ToolbarIcon>
      <ComposerEmojiPopover
        align={isModal ? 'end' : 'start'}
        zIndex={isModal ? 560 : 450}
        compact={isModal}
        onEmoji={(emoji) =>
          setContent((c) => `${c}${c.length && !/\s$/.test(c) ? ' ' : ''}${emoji}`)
        }
      />
      <ToolbarIcon
        compact={isModal}
        label={pollOpen ? 'Remove poll' : 'Add poll'}
        onClick={() => {
          setPollOpen((o) => !o)
          if (!pollOpen) setPollDraft((d) => (d.length >= 2 ? d : ['', '']))
        }}
        toggled={pollOpen}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 6h4v12H4V6zm8-2h4v14h-4V4zm8 4h4v10h-4V8z" />
      </ToolbarIcon>
      <ToolbarIcon
        ref={locationBtnRef}
        compact={isModal}
        label="Location"
        onClick={() => setLocationOpen((o) => !o)}
        toggled={Boolean(locationLabel || locationCoords)}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </ToolbarIcon>
    </>
  )

  return (
    <div className={wrapClass}>
      {locationPopoverPortal}
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200/80">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (user.name || user.email || 'U').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          {isModal && (
            <p className="mb-2 text-[13px] font-semibold text-neutral-900">
              {user.name || user.email?.split('@')[0] || 'You'}
            </p>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (!expanded) setExpanded(true)
            }}
            onFocus={() => setExpanded(true)}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-[15px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none min-h-[44px]"
            rows={expanded ? 4 : 2}
          />

          {expanded && (
            <div className="mt-3 space-y-3">
              {!pollOpen && (
                <div className="flex flex-wrap gap-1.5">
                  {POST_TYPES.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPostType(pt.id)}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        postType === pt.id
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              )}

              {pollOpen && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
                  <p className="mb-2 text-[11px] font-medium text-neutral-600">Poll — add 2–4 choices</p>
                  <div className="space-y-2">
                    {pollDraft.map((opt, i) => (
                      <input
                        key={i}
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollDraft]
                          next[i] = e.target.value
                          setPollDraft(next)
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
                      />
                    ))}
                  </div>
                  {pollDraft.length < 4 && (
                    <button
                      type="button"
                      onClick={() => setPollDraft((d) => [...d, ''])}
                      className="mt-2 text-[12px] font-medium text-neutral-600 hover:text-neutral-900"
                    >
                      + Add option
                    </button>
                  )}
                  {pollOpen && trimmedPollOptions.length > 0 && trimmedPollOptions.length < 2 && (
                    <p className="mt-2 text-[11px] text-amber-700">Enter at least two options to post a poll.</p>
                  )}
                </div>
              )}

              {postType === 'milestone' && !pollOpen && (
                <input
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  placeholder="Milestone title"
                  className="h-9 w-full rounded-full border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-300 focus:outline-none"
                />
              )}

              <input
                ref={mediaInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                onChange={handleMediaPick}
              />

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <div key={`${a.url}-${i}`} className="group relative">
                      {a.kind === 'image' ? (
                        <img src={a.url} alt="" className="h-20 w-20 rounded-lg border border-neutral-200 object-cover" />
                      ) : (
                        <video src={a.url} className="h-20 w-28 rounded-lg border border-neutral-200 bg-black object-cover" muted playsInline />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {mediaErr && <p className="text-[11px] text-neutral-600">{mediaErr}</p>}
              {!firebaseStorage && (
                <p className="text-[11px] text-neutral-500">Configure Firebase Storage to attach media.</p>
              )}

              {(locationLabel.trim() || locationCoords) && (
                <p className="flex items-center gap-1.5 text-[12px] text-neutral-600">
                  <span aria-hidden>📍</span>
                  {locationLabel.trim() || 'Current location'}
                </p>
              )}

              {isModal && (
                <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 pb-3">{toolbarExtras}</div>
              )}

              <div
                className={`flex items-center border-t border-neutral-100 pt-1 ${isModal ? 'justify-end' : 'justify-between'}`}
              >
                {!isModal ? <div className="flex flex-wrap items-center gap-0.5">{toolbarExtras}</div> : null}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="rounded-full bg-neutral-900 px-5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:opacity-100"
                >
                  {loading ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ToolbarIcon = React.forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode
    label: string
    onClick?: () => void
    disabled?: boolean
    toggled?: boolean
    compact?: boolean
  }
>(function ToolbarIcon({ children, label, onClick, disabled, toggled, compact }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        compact ? 'p-1.5' : 'p-2'
      } ${
        toggled
          ? 'bg-neutral-200 text-neutral-900'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
      }`}
    >
      <svg
        className={compact ? 'h-4 w-4' : 'h-5 w-5'}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  )
})
