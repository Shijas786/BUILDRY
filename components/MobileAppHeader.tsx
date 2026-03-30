'use client'

import React from 'react'
import Link from 'next/link'
import { useRoleStore } from '@/store/role'
import BuildryWordmark from '@/components/BuildryWordmark'

export default function MobileAppHeader() {
  const toggleMobileNav = useRoleStore((s) => s.toggleMobileNav)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[119] flex h-14 items-center gap-3 border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md md:hidden pt-[env(safe-area-inset-top,0px)]"
      style={{ minHeight: 'max(3.5rem, calc(3.5rem + env(safe-area-inset-top, 0px)))' }}
    >
      <button
        type="button"
        onClick={() => toggleMobileNav()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Link href="/feed" className="flex min-w-0 flex-1 items-center py-1" aria-label="Buildry feed">
        <BuildryWordmark tone="dark" variant="full" className="!h-9 w-auto max-w-[140px] object-contain object-left" />
      </Link>
    </header>
  )
}
