'use client'

import React from 'react'
import { useAuth } from '@/context/AuthProvider'
import Navbar from '@/components/Navbar'

/** Renders marketing Navbar only when there is no Firebase user (logged-out / public view). */
export default function LoggedOutNavShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen bg-white">{children}</div>
  }
  if (user) {
    return <>{children}</>
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
