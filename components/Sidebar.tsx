'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRoleStore, NAV_BY_ROLE, type UserRole } from '@/store/role'
import BuildryWordmark from '@/components/BuildryWordmark'
import { NavbarAccountCluster } from '@/components/AppTopBar'

const ROLE_META: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  developer: {
    label: 'Developer',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  },
  founder: {
    label: 'Founder',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
  investor: {
    label: 'Investor',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  },
  recruiter: {
    label: 'Recruiter',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  },
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  feed: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />,
  explore: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
  jobs: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  projects: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
  launch: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />,
  invest: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></>,
}

export default function Sidebar() {
  const pathname = usePathname()
  const {
    activeRole,
    setActiveRole,
    sidebarExpanded,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useRoleStore()
  const navItems = NAV_BY_ROLE[activeRole]
  const roleMeta = ROLE_META[activeRole]

  const showLabels = sidebarExpanded || mobileNavOpen
  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[115] bg-slate-900/40 backdrop-blur-[1px] md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-[120] flex h-dvh max-h-dvh w-[min(288px,calc(100vw-0.75rem))] flex-col overflow-x-hidden border-r border-slate-100 bg-white shadow-xl transition-transform duration-300 ease-out md:shadow-none ${
          sidebarExpanded ? 'md:w-[268px]' : 'md:w-[68px]'
        } ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
      {/* Logo + collapse */}
      <div className="flex min-h-[88px] shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <Link
          href="/feed"
          onClick={closeMobileNav}
          className="flex min-w-0 flex-1 items-center gap-2 overflow-visible"
          aria-label="Buildry feed"
        >
          {showLabels ? (
            <BuildryWordmark
              tone="dark"
              variant="full"
              shine
              shineSidebar
              className="!h-[52px] sm:!h-14 md:!h-[60px] !max-h-[60px] w-auto max-w-[min(100%,228px)] object-contain object-left"
            />
          ) : (
            <BuildryWordmark tone="dark" variant="icon" />
          )}
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {mobileNavOpen && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-slate-50 hover:text-slate-900 md:flex"
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg className={`h-4 w-4 transition-transform ${sidebarExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Role switcher */}
      <div className={`shrink-0 border-b border-slate-100 px-3 py-4 ${showLabels ? '' : 'px-2'}`}>
        {showLabels && (
          <p className="mb-3 px-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Switch role</p>
        )}
        <div className={`grid gap-1.5 grid-cols-1`}>
          {(Object.keys(ROLE_META) as UserRole[]).map((role) => {
            const meta = ROLE_META[role]
            const isActive = activeRole === role
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex min-w-0 items-center gap-2 rounded-xl transition-all ${
                  showLabels ? 'w-full px-3 py-2' : 'justify-center px-0 py-2'
                } ${
                  isActive
                    ? `${meta.color} border font-black`
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
                title={meta.label}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {meta.icon}
                </svg>
                {showLabels && (
                  <span className="min-w-0 flex-1 truncate text-left text-[10px] font-bold uppercase tracking-wider">
                    {meta.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 pb-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href + item.name}
              href={item.href}
              onClick={closeMobileNav}
              className={`flex items-center gap-3 rounded-xl transition-all ${
                showLabels ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              } ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={item.name}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {NAV_ICONS[item.icon] || NAV_ICONS.feed}
              </svg>
              {showLabels && <span className="truncate text-[11px] font-bold tracking-wide">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2.5">
        <NavbarAccountCluster
          menuOpen="above"
          compact={!showLabels}
          forSidebar={showLabels}
        />
      </div>
    </aside>
    </>
  )
}
