'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { useRoleStore } from '@/store/role'
import Sidebar from './Sidebar'
import DeploymentTicker from './DeploymentTicker'
import MobileAppHeader from './MobileAppHeader'

const PUBLIC_ROUTES = ['/', '/auth']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const sidebarExpanded = useRoleStore((s) => s.sidebarExpanded)
  const mobileNavOpen = useRoleStore((s) => s.mobileNavOpen)
  const setMobileNavOpen = useRoleStore((s) => s.setMobileNavOpen)

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const closeIfDesktop = () => {
      if (mq.matches) setMobileNavOpen(false)
    }
    closeIfDesktop()
    mq.addEventListener('change', closeIfDesktop)
    return () => mq.removeEventListener('change', closeIfDesktop)
  }, [setMobileNavOpen])

  useEffect(() => {
    const isMobile = () => !window.matchMedia('(min-width: 768px)').matches
    if (mobileNavOpen && isMobile()) {
      const prevHtml = document.documentElement.style.overflow
      const prevBody = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prevHtml
        document.body.style.overflow = prevBody
      }
    }
  }, [mobileNavOpen])

  if (isPublicRoute || loading || !user) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen min-h-dvh">
      <MobileAppHeader />
      <Sidebar />
      <main
        className={`flex min-h-screen min-h-dvh flex-1 flex-col transition-[margin] duration-300 max-md:ml-0 max-md:w-full max-md:pt-[calc(3.5rem+env(safe-area-inset-top,0px))] ${
          sidebarExpanded ? 'md:ml-[268px]' : 'md:ml-[68px]'
        }`}
      >
        <DeploymentTicker />
        <div className="min-h-0 flex-1">{children}</div>
      </main>
    </div>
  )
}
