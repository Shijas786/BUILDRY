'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { useRoleStore } from '@/store/role'
import Sidebar from './Sidebar'

const PUBLIC_ROUTES = ['/', '/onboarding', '/auth']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { sidebarExpanded } = useRoleStore()

  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  )

  if (isPublicRoute || loading || !user) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarExpanded ? 'ml-[240px]' : 'ml-[68px]'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
