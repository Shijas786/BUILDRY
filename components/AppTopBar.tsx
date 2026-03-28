'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { fmtAddr } from '@/lib/format'
import { firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { doc, getDoc } from 'firebase/firestore'
import { FS } from '@/lib/firestoreCollections'

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconLogout({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  )
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}

/** Shared search field (navbar + sidebar). */
export function AppSearchField({
  className = '',
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'sidebar'
}) {
  const isSidebar = variant === 'sidebar'
  return (
    <div className={`w-full relative group min-w-0 ${className}`}>
      <div
        className={`absolute top-1/2 -translate-y-1/2 text-slate-300 ${isSidebar ? 'left-3' : 'left-4'}`}
      >
        <svg className={isSidebar ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        placeholder={isSidebar ? 'Search…' : 'Search builders, projects, startups...'}
        className={`w-full rounded-xl bg-slate-50 border border-slate-100 font-medium text-slate-900 focus:outline-none focus:border-slate-200 transition-all placeholder-slate-300 ${
          isSidebar
            ? 'h-9 pl-9 pr-3 text-[10px]'
            : 'h-10 pl-11 pr-12 text-[11px]'
        }`}
      />
      {!isSidebar && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-20 group-focus-within:opacity-0 transition-opacity pointer-events-none">
          <span className="text-[10px] font-bold border border-slate-300 px-1 rounded">⌘</span>
          <span className="text-[10px] font-bold border border-slate-300 px-1 rounded">K</span>
        </div>
      )}
    </div>
  )
}

export type NavbarAccountClusterProps = {
  /** `above` = sidebar footer (menu opens upward). */
  menuOpen?: 'below' | 'above'
  /** Icon-only + tight layout for collapsed rail. */
  compact?: boolean
}

/** Bell + account menu — Navbar (below) or Sidebar (above). */
export function NavbarAccountCluster({ menuOpen = 'below', compact = false }: NavbarAccountClusterProps) {
  const { user, signOut: authSignOut } = useAuth()
  const { address, isConnected } = useAppKitAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const [showDropdown, setShowDropdown] = useState(false)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user?.name || (address ? address.slice(0, 6) : 'User')
  const displayAddr = address ? fmtAddr(address) : user?.email || ''
  const profileHref = profileUsername ? `/profile/${profileUsername}` : '/settings'

  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured || !firebaseDb) {
      setProfileUsername(null)
      return
    }
    getDoc(doc(firebaseDb, FS.BUILDER_PROFILES, user.id)).then((snapshot) => {
      if (!snapshot.exists()) {
        setProfileUsername(null)
        return
      }
      setProfileUsername((snapshot.data() as any)?.username || null)
    })
  }, [user?.id])

  useEffect(() => {
    if (!showDropdown) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = menuRef.current
      if (el && !el.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [showDropdown])

  const handleLogout = async () => {
    await authSignOut()
    if (isConnected) disconnect()
    setShowDropdown(false)
  }

  const menuPos =
    menuOpen === 'above'
      ? 'bottom-full mb-2 right-0 left-auto'
      : 'top-[calc(100%+10px)] right-0'

  return (
    <div
      ref={menuRef}
      className={`flex relative shrink-0 min-w-0 ${compact ? 'flex-col items-center gap-2' : 'flex-row items-center gap-1 sm:gap-2'}`}
    >
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        className={`relative rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all ${
          compact ? 'w-9 h-9' : 'w-10 h-10'
        }`}
      >
        <IconBell className={compact ? 'w-5 h-5' : 'w-[22px] h-[22px]'} />
      </button>

      <button
        type="button"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`group flex items-center rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all shadow-sm min-w-0 ${
          compact ? 'flex-col p-1 gap-0.5' : 'gap-2.5 sm:gap-3 pl-1 pr-2 py-1'
        }`}
      >
        <div
          className={`rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 font-bold shadow-sm group-hover:scale-[1.02] transition-transform overflow-hidden shrink-0 ${
            compact ? 'w-8 h-8 text-[10px]' : 'w-9 h-9 text-xs'
          }`}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        {!compact && (
          <div className="text-left hidden sm:block pr-1 min-w-0 max-w-[120px] lg:max-w-[140px]">
            <p className="text-[13px] font-bold text-slate-900 leading-tight truncate">{displayName}</p>
            <p className="text-[10px] font-medium text-slate-400 leading-tight font-mono truncate">
              {isConnected && address ? fmtAddr(address) : displayAddr}
            </p>
          </div>
        )}
        <svg
          className={`text-slate-400 shrink-0 transition-transform ${compact ? 'w-3 h-3' : 'w-4 h-4'} ${
            menuOpen === 'above'
              ? showDropdown
                ? ''
                : 'rotate-180'
              : showDropdown
                ? 'rotate-180'
                : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div
          role="menu"
          className={`absolute ${menuPos} w-[min(calc(100vw-2rem),280px)] max-w-[min(100vw-2rem,280px)] bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-900/5 py-2 z-[200] fade-in`}
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[11px] font-medium text-slate-400 mb-1">Connected:</p>
            <p className="text-[13px] font-semibold text-slate-900 font-mono tracking-tight break-all">
              {isConnected && address ? fmtAddr(address) : user?.email || displayAddr || '—'}
            </p>
          </div>

          <div className="py-1 px-1.5">
            <Link
              role="menuitem"
              href={profileHref}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <IconUser className="w-[18px] h-[18px] text-slate-500" />
              Profile
            </Link>
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <IconGear className="w-[18px] h-[18px] text-slate-500" />
              Settings
            </Link>
          </div>

          {!isConnected && (
            <div className="border-t border-slate-100 py-1 px-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  open()
                  setShowDropdown(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 text-left transition-colors"
              >
                <svg
                  className="w-[18px] h-[18px] text-slate-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Connect wallet
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 pt-1 pb-1 px-1.5 mt-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 text-left transition-colors"
            >
              <IconLogout className="w-[18px] h-[18px] text-slate-500" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
