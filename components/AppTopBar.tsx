'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { fmtAddr } from '@/lib/format'
import { firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { doc, getDoc } from 'firebase/firestore'
import { FS } from '@/lib/firestoreCollections'
import NotificationsBell from '@/components/NotificationsBell'

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

function AccountDropdownBody({
  signedInHeadline,
  userName,
  walletLine,
  profileHref,
  isConnected,
  showWalletSubline = true,
  onClose,
  onConnectWallet,
  onLogout,
}: {
  signedInHeadline: string
  userName?: string
  walletLine: string | null
  profileHref: string
  isConnected: boolean
  /** Sidebar: name-only surface — omit wallet under the header. */
  showWalletSubline?: boolean
  onClose: () => void
  onConnectWallet: () => void
  onLogout: () => void
}) {
  return (
    <>
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-[13px] font-semibold text-slate-900 truncate">{signedInHeadline}</p>
        {showWalletSubline && userName && walletLine ? (
          <p className="text-[11px] font-medium text-slate-400 mt-1 font-mono tracking-tight truncate">{walletLine}</p>
        ) : null}
      </div>

      <div className="py-1 px-1.5">
        <Link
          role="menuitem"
          href={profileHref}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <IconUser className="w-[18px] h-[18px] text-slate-500" />
          Profile
        </Link>
        <Link
          role="menuitem"
          href="/settings"
          onClick={onClose}
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
            onClick={onConnectWallet}
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
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700 text-left transition-colors"
        >
          <IconLogout className="w-[18px] h-[18px] text-slate-500" />
          Log out
        </button>
      </div>
    </>
  )
}

export type NavbarAccountClusterProps = {
  /** `above` = sidebar footer (menu opens upward). */
  menuOpen?: 'below' | 'above'
  /** Icon-only + tight layout for collapsed rail. */
  compact?: boolean
  /** Wide rail: fill width, always show name/wallet lines (not hidden on small breakpoints). */
  forSidebar?: boolean
}

/** Bell + account menu — Navbar (below) or Sidebar (above). */
export function NavbarAccountCluster({
  menuOpen = 'below',
  compact = false,
  forSidebar = false,
}: NavbarAccountClusterProps) {
  const { user, signOut: authSignOut } = useAuth()
  const { address, isConnected } = useAppKitAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const [showDropdown, setShowDropdown] = useState(false)
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const dropdownPanelRef = useRef<HTMLDivElement>(null)
  const [portalPos, setPortalPos] = useState<{ left: number; bottom: number; width: number } | null>(null)

  const usePortalMenu = menuOpen === 'above'

  const displayName = user?.name?.trim() || (address ? address.slice(0, 6) : 'User')
  const walletLine = isConnected && address ? fmtAddr(address) : null
  /** Menu header: name first; sidebar omits wallet from the title line. */
  const signedInHeadline = forSidebar
    ? user?.name?.trim() || 'Builder'
    : user?.name?.trim() || walletLine || 'Builder'
  const profileHref = profileUsername
    ? `/profile/${encodeURIComponent(profileUsername)}`
    : user?.id
      ? `/profile/${encodeURIComponent(user.id)}`
      : '/settings'

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

  useLayoutEffect(() => {
    if (!showDropdown || !usePortalMenu || !menuRef.current) {
      setPortalPos(null)
      return
    }
    const update = () => {
      const el = menuRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const w = Math.min(280, window.innerWidth - 16)
      let left = r.right - w
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      const gap = 10
      const bottom = window.innerHeight - r.top + gap
      setPortalPos({ left, bottom, width: w })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [showDropdown, usePortalMenu, compact, forSidebar])

  useEffect(() => {
    if (!showDropdown) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t)) return
      if (dropdownPanelRef.current?.contains(t)) return
      setShowDropdown(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [showDropdown])

  useEffect(() => {
    if (!showDropdown || !usePortalMenu) return
    const onScroll = () => setShowDropdown(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [showDropdown, usePortalMenu])

  const handleLogout = async () => {
    await authSignOut()
    if (isConnected) disconnect()
    setShowDropdown(false)
  }

  const menuPos =
    menuOpen === 'above'
      ? 'bottom-full mb-2 right-0 left-auto'
      : 'top-[calc(100%+10px)] right-0'

  const outerRow =
    compact
      ? 'flex-col items-center gap-2'
      : forSidebar
        ? 'flex-row items-center gap-1.5 w-full min-w-0'
        : 'flex-row items-center gap-1 sm:gap-2'

  return (
    <div ref={menuRef} className={`flex relative shrink-0 min-w-0 ${outerRow}`}>
      <NotificationsBell compact={compact} forSidebar={forSidebar} />

      <button
        type="button"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`group flex items-center rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all shadow-sm min-w-0 ${
          compact
            ? 'flex-col p-1 gap-0.5'
            : forSidebar
              ? 'flex-1 min-w-0 max-w-full gap-2 pl-1 pr-1.5 py-1.5'
              : 'gap-2.5 sm:gap-3 pl-1 pr-2 py-1'
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
          <div
            className={`text-left pr-0.5 min-w-0 ${forSidebar ? 'flex-1' : 'hidden sm:block max-w-[120px] lg:max-w-[140px]'}`}
          >
            <p className="text-[12px] sm:text-[13px] font-bold text-slate-900 leading-snug truncate">{displayName}</p>
            {!forSidebar && walletLine ? (
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 leading-snug font-mono truncate">
                {walletLine}
              </p>
            ) : null}
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

      {showDropdown &&
        (usePortalMenu && portalPos && typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={dropdownPanelRef}
                role="menu"
                style={{
                  position: 'fixed',
                  left: portalPos.left,
                  bottom: portalPos.bottom,
                  width: portalPos.width,
                  zIndex: 600,
                }}
                className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-900/10 py-2 fade-in max-h-[min(70vh,calc(100dvh-2rem))] overflow-y-auto"
              >
                <AccountDropdownBody
                  signedInHeadline={signedInHeadline}
                  userName={user?.name?.trim()}
                  walletLine={walletLine}
                  profileHref={profileHref}
                  isConnected={isConnected}
                  showWalletSubline={!forSidebar}
                  onClose={() => setShowDropdown(false)}
                  onConnectWallet={() => {
                    open()
                    setShowDropdown(false)
                  }}
                  onLogout={handleLogout}
                />
              </div>,
              document.body
            )
          : !usePortalMenu ? (
              <div
                ref={dropdownPanelRef}
                role="menu"
                className={`absolute ${menuPos} w-[min(calc(100vw-2rem),280px)] max-w-[min(100vw-2rem,280px)] bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-900/5 py-2 z-[600] fade-in max-h-[min(70vh,calc(100dvh-2rem))] overflow-y-auto`}
              >
                <AccountDropdownBody
                  signedInHeadline={signedInHeadline}
                  userName={user?.name?.trim()}
                  walletLine={walletLine}
                  profileHref={profileHref}
                  isConnected={isConnected}
                  showWalletSubline={!forSidebar}
                  onClose={() => setShowDropdown(false)}
                  onConnectWallet={() => {
                    open()
                    setShowDropdown(false)
                  }}
                  onLogout={handleLogout}
                />
              </div>
            ) : null)}
    </div>
  )
}
