'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { fmtAddr } from '@/lib/format'
import { OPEN_AUTH_MODAL_EVENT, type OpenAuthModalDetail } from '@/lib/openAuthModal'
import { firebaseDb, isFirebaseConfigured } from '@/lib/firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

export default function Navbar() {
  const { user, loading, signOut: authSignOut } = useAuth()
  const { address, isConnected } = useAppKitAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login')
  const [profileUsername, setProfileUsername] = useState<string | null>(null)

  const isLoggedIn = !!user || (isConnected && !!address)
  const displayName = user?.name || (address ? address.slice(0, 6) : 'User')
  const displayAddr = address ? fmtAddr(address) : user?.email || ''
  const profileHref = profileUsername ? `/profile/${profileUsername}` : '/settings'

  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured || !firebaseDb) {
      setProfileUsername(null)
      return
    }

    getDoc(doc(firebaseDb, 'builder_profiles', user.id)).then((snapshot) => {
      if (!snapshot.exists()) {
        setProfileUsername(null)
        return
      }
      setProfileUsername((snapshot.data() as any)?.username || null)
    })
  }, [user?.id])

  useEffect(() => {
    const onOpenAuth = (e: Event) => {
      const detail = (e as CustomEvent<OpenAuthModalDetail>).detail
      setAuthModalInitialMode(detail?.mode ?? 'login')
      setShowAuthModal(true)
    }
    window.addEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuth)
    return () => window.removeEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuth)
  }, [])

  const handleLogout = async () => {
    await authSignOut()
    if (isConnected) disconnect()
    setShowDropdown(false)
  }

  return (
    <>
      <nav className="h-[72px] flex items-center justify-between px-6 md:px-8 border-b border-slate-100 bg-white/95 backdrop-blur sticky top-0 z-[100]">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-xl shadow-slate-900/10">
              B
            </div>
            <span className="text-sm font-black text-slate-900 tracking-widest hidden lg:block">BUILDRY</span>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="w-full relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input
              type="text"
              placeholder="Search builders, projects, startups..."
              className="w-full h-10 pl-11 pr-12 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-900 focus:outline-none focus:border-slate-200 transition-all placeholder-slate-300"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-20 group-focus-within:opacity-0 transition-opacity">
              <span className="text-[10px] font-bold border border-slate-300 px-1 rounded">⌘</span>
              <span className="text-[10px] font-bold border border-slate-300 px-1 rounded">K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4 relative">
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              </button>

              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="group flex items-center gap-3 p-1.5 rounded-2xl bg-slate-50 border border-slate-100/50 hover:border-slate-300 transition-all shadow-sm"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 text-[10px] font-black shadow-sm group-hover:scale-105 transition-transform">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block pr-2">
                  <p className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-widest">{displayName}</p>
                  <p className="text-[9px] font-bold text-slate-400 leading-tight tracking-wider font-mono opacity-80">{displayAddr}</p>
                </div>
                <svg className={`w-3 h-3 text-slate-300 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
              </button>

              {showDropdown && (
                <div className="absolute top-14 right-0 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 z-[200] fade-in">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Account</p>
                    <p className="text-[10px] font-bold text-slate-900 break-all">{user?.email || displayAddr}</p>
                  </div>
                  {[
                    { name: 'Profile', href: profileHref },
                    { name: 'Settings', href: '/settings' },
                    { name: 'Feed', href: '/feed' },
                  ].map(item => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-all"
                    >
                      {item.name}
                    </Link>
                  ))}
                  {!isConnected && (
                    <button
                      onClick={() => { open(); setShowDropdown(false) }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-all"
                    >
                      Connect Wallet
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl hover:bg-red-50 text-[11px] font-bold text-red-500 hover:text-red-700 transition-all border-t border-slate-100 pt-3"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAuthModalInitialMode('login')
                  setShowAuthModal(true)
                }}
                className="text-slate-600 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:text-slate-900 transition-all"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalInitialMode('signup')
                  setShowAuthModal(true)
                }}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal
          key={authModalInitialMode}
          initialMode={authModalInitialMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </>
  )
}

function AuthModal({
  initialMode = 'login',
  onClose,
}: {
  initialMode?: 'login' | 'signup'
  onClose: () => void
}) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { open } = useAppKit()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { signInWithEmail, signUpWithEmail } = await import('@/lib/auth')
      const { error: authError } = mode === 'login'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password)
      if (authError) {
        setError(authError.message)
      } else {
        onClose()
        if (mode === 'signup') window.location.href = '/onboarding'
      }
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    const { signInWithGoogle } = await import('@/lib/auth')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error.message)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl mx-auto mb-4">B</div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{mode === 'login' ? 'Welcome back' : 'Join Buildry'}</h2>
          <p className="text-sm text-slate-400 mt-1">Where founders build in public</p>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <button
          onClick={() => { open(); onClose() }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all mb-5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          Connect Wallet
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or continue with email</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 transition-all placeholder-slate-300"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 transition-all placeholder-slate-300"
            required
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? '...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
