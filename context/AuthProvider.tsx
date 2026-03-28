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

    const unsub = onAuthStateChanged(firebaseAuth, async (authUser) => {
      try {
        if (authUser?.uid) {
          setSession({ user: { id: authUser.uid } })
          await fetchUser(authUser)
        } else {
          setSession(null)
          setUser(null)
        }
      } catch {
        if (authUser?.uid) {
          setUser({
            id: authUser.uid,
            email: authUser.email ?? null,
            name: authUser.displayName || authUser.email?.split('@')[0] || 'builder',
            avatar_url: authUser.photoURL ?? null,
            account_type: null,
            wallet_address: null,
            created_at: new Date().toISOString(),
          })
        }
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
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
