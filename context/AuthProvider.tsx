'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { isSupabaseConfigured, type AppUser } from '@/lib/auth'
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient'
import { FS } from '@/lib/firestoreCollections'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'

interface AuthState {
  session: { user: { id: string } } | null
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

function optimisticAppUser(authUser: FirebaseUser): AppUser {
  return {
    id: authUser.uid,
    email: authUser.email ?? null,
    name: authUser.displayName || authUser.email?.split('@')[0] || 'builder',
    avatar_url: authUser.photoURL ?? null,
    account_type: null,
    wallet_address: null,
    created_at: new Date().toISOString(),
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: { id: string } } | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async (authUser: FirebaseUser) => {
    if (!firebaseDb) return
    const userRef = doc(firebaseDb, FS.USERS, authUser.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      const freshUser: AppUser = {
        id: authUser.uid,
        email: authUser.email,
        name: authUser.displayName || authUser.email?.split('@')[0] || 'builder',
        avatar_url: authUser.photoURL,
        account_type: null,
        wallet_address: null,
        created_at: new Date().toISOString(),
      }
      await setDoc(userRef, freshUser, { merge: true })
      setUser(freshUser)
      return
    }

    setUser(userSnap.data() as AppUser)
  }, [])

  const refreshUser = useCallback(async () => {
    if (firebaseAuth?.currentUser) {
      await fetchUser(firebaseAuth.currentUser)
    }
  }, [fetchUser])

  useEffect(() => {
    if (!isSupabaseConfigured || !firebaseAuth) {
      setLoading(false)
      return
    }

    // If Firestore getDoc/setDoc hangs, we still unblock the UI (not a browser cache issue).
    const bootTimer = window.setTimeout(() => setLoading(false), 12_000)

    const unsub = onAuthStateChanged(firebaseAuth, (authUser) => {
      window.clearTimeout(bootTimer)
      try {
        if (authUser?.uid) {
          setSession({ user: { id: authUser.uid } })
          setUser(optimisticAppUser(authUser))
          void fetchUser(authUser).catch(() => {
            /* keep optimistic profile */
          })
        } else {
          setSession(null)
          setUser(null)
        }
      } catch {
        if (authUser?.uid) setUser(optimisticAppUser(authUser))
      } finally {
        setLoading(false)
      }
    })

    return () => {
      window.clearTimeout(bootTimer)
      unsub()
    }
  }, [fetchUser])

  const handleSignOut = async () => {
    if (firebaseAuth) {
      const { signOut } = await import('@/lib/auth')
      await signOut()
    }
    setSession(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut: handleSignOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
