'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import type { EmojiClickData } from 'emoji-picker-react'
import { EmojiStyle, Theme } from 'emoji-picker-react'
import { getAnchoredPopoverPosition } from '@/lib/anchoredPopoverPosition'

/** Default size for `emoji-picker-react` root (`width`/`height` are the full picker, not just the grid). */
const PICKER_MAX_W = 320
const PICKER_MAX_H = 380

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-white text-[11px] text-neutral-500"
      style={{ width: PICKER_MAX_W, height: PICKER_MAX_H }}
    >
      Loading…
    </div>
  ),
})

type Props = {
  onEmoji: (emoji: string) => void
  zIndex?: number
  align?: 'start' | 'end'
  /** Smaller trigger (modal toolbar) */
  compact?: boolean
}

export default function ComposerEmojiPopover({
  onEmoji,
  zIndex = 560,
  align = 'start',
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const updatePos = () => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 12
    const width = Math.min(PICKER_MAX_W, Math.max(260, window.innerWidth - pad * 2))
    const height = Math.min(PICKER_MAX_H, Math.max(300, window.innerHeight - pad * 2))
    const p = getAnchoredPopoverPosition(rect, width, height, align)
    setPos({ top: p.top, left: p.left, width, height })
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    updatePos()
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updatePos()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [open])

  const panel =
    open &&
    pos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={panelRef}
        className="fixed overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        style={{
          top: pos.top,
          left: pos.left,
          width: pos.width,
          height: pos.height,
          zIndex,
        }}
        role="dialog"
        aria-label="Emoji picker"
      >
        <EmojiPicker
          width={pos.width}
          height={pos.height}
          theme={Theme.LIGHT}
          emojiStyle={EmojiStyle.NATIVE}
          onEmojiClick={(data: EmojiClickData) => {
            onEmoji(data.emoji)
            setOpen(false)
          }}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          searchDisabled
          lazyLoadEmojis={false}
        />
      </div>,
      document.body
    )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Emoji"
        className={`rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 ${
          compact ? 'p-1.5' : 'p-2'
        }`}
      >
        <svg
          className={compact ? 'h-4 w-4' : 'h-5 w-5'}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {panel}
    </>
  )
}
