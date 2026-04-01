'use client'

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import PostComposer from '@/components/PostComposer'

export default function NewThreadModal({
  open,
  onClose,
  onPosted,
}: {
  open: boolean
  onClose: () => void
  onPosted: () => void
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (typeof document === 'undefined' || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="new-thread-title">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center border-b border-neutral-200 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className="w-10 shrink-0 rounded-full p-2 text-[15px] font-semibold text-neutral-900 hover:bg-neutral-100"
            aria-label="Close"
          >
            ✕
          </button>
          <h2 id="new-thread-title" className="flex-1 text-center text-[15px] font-semibold text-neutral-900">
            New thread
          </h2>
          <div className="w-10 shrink-0" aria-hidden />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-3 sm:px-4">
          <PostComposer
            variant="modal"
            onPostCreated={() => {
              onPosted()
              onClose()
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
