'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRoleStore, NAV_BY_ROLE, type UserRole } from '@/store/role'
import { useAuth } from '@/context/AuthProvider'
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { doc, getDoc } from 'firebase/firestore'
import BuildryWordmark from '@/components/BuildryWordmark'
import { FS } from '@/lib/firestoreCollections'

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
  const { activeRole, setActiveRole, sidebarExpanded, toggleSidebar } = useRoleStore()
  const { user, signOut } = useAuth()
  const { isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const [profileUsername, setProfileUsername] = React.useState<string | null>(null)
  const navItems = NAV_BY_ROLE[activeRole]
  const roleMeta = ROLE_META[activeRole]
  const profileHref = profileUsername ? `/profile/${profileUsername}` : '/settings'

  const handleLogout = async () => {
    await signOut()
    if (isConnected) disconnect()
  }

  React.useEffect(() => {
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

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-slate-100 z-[90] flex flex-col transition-all duration-300 ${
        sidebarExpanded ? 'w-[240px]' : 'w-[68px]'
      }`}
    >
      {/* Logo + collapse */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
        <Link href="/feed" className="flex items-center gap-2.5 min-w-0" aria-label="Buildry feed">
          {sidebarExpanded ? (
            <BuildryWordmark tone="dark" variant="full" className="max-w-[min(100%,200px)]" />
          ) : (
            <BuildryWordmark tone="dark" variant="icon" />
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all shrink-0"
        >
          <svg className={`w-4 h-4 transition-transform ${sidebarExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Role switcher */}
      <div className={`px-3 py-4 border-b border-slate-100 ${sidebarExpanded ? '' : 'px-2'}`}>
        {sidebarExpanded && (
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3 px-1">Switch role</p>
        )}
        <div className={`grid gap-1.5 ${sidebarExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {(Object.keys(ROLE_META) as UserRole[]).map((role) => {
            const meta = ROLE_META[role]
            const isActive = activeRole === role
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex items-center gap-2 rounded-xl transition-all ${
                  sidebarExpanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
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
                {sidebarExpanded && (
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">{meta.label}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href + item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl transition-all ${
                sidebarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={item.name}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {NAV_ICONS[item.icon] || NAV_ICONS.feed}
              </svg>
              {sidebarExpanded && (
                <span className="text-[11px] font-bold tracking-wide truncate">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + Profile */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1 shrink-0">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all ${
            sidebarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
          }`}
          title="Settings"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {sidebarExpanded && (
            <span className="text-[11px] font-bold tracking-wide">Settings</span>
          )}
        </Link>

        {user && (
          <>
            <Link
              href={profileHref}
              className={`flex items-center gap-3 rounded-xl hover:bg-slate-50 transition-all ${
                sidebarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              }`}
              title="Profile"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              {sidebarExpanded && (
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-900 truncate">{user.name || 'Your Profile'}</p>
                  <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all ${
                sidebarExpanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
              }`}
              title="Log out"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {sidebarExpanded && <span className="text-[11px] font-bold tracking-wide">Log out</span>}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
