'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/context/AuthProvider'
import { OPEN_AUTH_MODAL_EVENT, type OpenAuthModalDetail } from '@/lib/openAuthModal'
import BuildryWordmark from '@/components/BuildryWordmark'
import { AppSearchField, NavbarAccountCluster } from '@/components/AppTopBar'
import AuthModalWalletLogin from '@/components/AuthModalWalletLogin'

export default function Navbar() {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login')
  const [portalReady, setPortalReady] = useState(false)

  /** Wallet connection alone is not a Buildry session — use Google or wallet sign-in (signature + custom token). */
  const isLoggedIn = !!user

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
      <nav className="sticky top-0 z-[100] flex h-[64px] items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur sm:h-[72px] sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-10">
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
  const [mode] = useState<'login' | 'signup'>(initialMode)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const { signInWithGoogle } = await import('@/lib/auth')
      const { error: authError } = await signInWithGoogle()
      if (authError) {
        setError(authError.message)
        return
      }
      onClose()
      if (mode === 'signup') window.location.href = '/feed'
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleWalletSignedIn = useCallback(() => {
    onClose()
    if (mode === 'signup') window.location.href = '/feed'
  }, [onClose, mode])

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[8000] flex items-center justify-center p-4"
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
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'signup' ? 'Sign up with Google to get started.' : 'Sign in with Google to continue.'}
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all mb-3 disabled:opacity-50 disabled:pointer-events-none"
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
          {loading ? 'Connecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <AuthModalWalletLogin disabled={loading} onSignedIn={handleWalletSignedIn} />

        {error ? <p className="text-xs text-red-500 font-medium text-center mt-4">{error}</p> : null}
      </div>
    </div>
  )
}
