'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createAuthClient, isSupabaseConfigured, type AppUser } from '@/lib/auth'
import type { Session } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = isSupabaseConfigured ? createAuthClient() : null

  const fetchUser = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setUser(data as AppUser | null)
  }, [supabase])

  const refreshUser = useCallback(async () => {
    if (session?.user?.id) {
      await fetchUser(session.user.id)
    }
  }, [session, fetchUser])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user?.id) fetchUser(s.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user?.id) {
        fetchUser(s.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchUser])

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut: handleSignOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
