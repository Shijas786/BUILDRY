'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { OPEN_AUTH_MODAL_EVENT, type OpenAuthModalDetail } from '@/lib/openAuthModal'
import BuildryWordmark from '@/components/BuildryWordmark'
import { AppSearchField, NavbarAccountCluster } from '@/components/AppTopBar'

export default function Navbar() {
  const { user } = useAuth()
  const { address, isConnected } = useAppKitAccount()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login')
  const [portalReady, setPortalReady] = useState(false)

  const isLoggedIn = !!user || (isConnected && !!address)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    const onOpenAuth = (e: Event) => {
      const detail = (e as CustomEvent<OpenAuthModalDetail>).detail
      setAuthModalInitialMode(detail?.mode ?? 'login')
      setShowAuthModal(true)
    }
    window.addEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuth)
    return () => window.removeEventListener(OPEN_AUTH_MODAL_EVENT, onOpenAuth)
  }, [])

  return (
    <>
      <nav className="h-[72px] flex items-center justify-between px-6 md:px-8 border-b border-slate-100 bg-white/95 backdrop-blur sticky top-0 z-[100]">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-2 min-w-0 py-1 -my-0.5 rounded-lg bg-white px-1 pr-2"
            aria-label="Buildry home"
          >
            {/* Same shine as post-login sidebar (shineSidebar); opaque bg so blend isn’t dulled by nav backdrop-blur */}
            <BuildryWordmark tone="dark" variant="full" priority shine shineSidebar />
          </Link>
        </div>

        {isLoggedIn && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <AppSearchField />
          </div>
        )}

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <NavbarAccountCluster />
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

      {showAuthModal &&
        portalReady &&
        createPortal(
          <AuthModal
            key={authModalInitialMode}
            initialMode={authModalInitialMode}
            onClose={() => setShowAuthModal(false)}
          />,
          document.body
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
      const { error: authError } =
        mode === 'login' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password)
      if (authError) {
        setError(authError.message)
      } else {
        onClose()
        if (mode === 'signup') window.location.href = '/feed'
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
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BuildryWordmark tone="dark" variant="full" className="max-w-[min(100%,380px)] sm:max-w-[440px]" />
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Join Buildry'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Where founders build in public</p>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <button
          onClick={() => {
            open()
            onClose()
          }}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all mb-5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-300 transition-all placeholder-slate-300"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
