'use client'

import React, { useEffect, useRef, useState } from 'react'
import { signInWithCustomToken } from 'firebase/auth'
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useSignMessage } from 'wagmi'
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebaseClient'
import { uint8ArrayToBase64 } from '@/lib/walletClientEncode'

type ReownSolWalletProvider = { signMessage?: (msg: Uint8Array) => Promise<Uint8Array> }

/**
 * Opens Reown to connect a wallet, then signs the user into Firebase if that wallet is on their Buildry profile.
 */
export default function AuthModalWalletLogin({
  onSignedIn,
  disabled,
}: {
  onSignedIn: () => void
  disabled?: boolean
}) {
  const { open } = useAppKit()
  const { address: evmAddress, isConnected: evmConnected } = useAppKitAccount()
  const { address: solAddress, isConnected: solConnected } = useAppKitAccount({ namespace: 'solana' })
  const { walletProvider: solProvider } = useAppKitProvider<ReownSolWalletProvider>('solana')
  const { signMessageAsync, isPending: evmSigning } = useSignMessage()

  const onSignedInRef = useRef(onSignedIn)
  onSignedInRef.current = onSignedIn

  const [connectTapped, setConnectTapped] = useState(false)
  const inFlightRef = useRef<string | null>(null)
  const failedKeyRef = useRef<string | null>(null)

  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    setConnectTapped(false)
    inFlightRef.current = null
    failedKeyRef.current = null
    setStatus('idle')
    setDetail('')
  }, [])

  const runEvm = async (address: string) => {
    const chRes = await fetch('/api/auth/wallet/login-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain: 'evm', address }),
    })
    const ch = await chRes.json().catch(() => ({}))
    if (!chRes.ok) {
      throw new Error(typeof ch.error === 'string' ? ch.error : 'This wallet is not linked to a Buildry account.')
    }
    const sig = await signMessageAsync({
      message: ch.message as string,
      account: address as `0x${string}`,
    })
    const vRes = await fetch('/api/auth/wallet/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: ch.challengeId, signature: sig }),
    })
    const v = await vRes.json().catch(() => ({}))
    if (!vRes.ok) {
      throw new Error(typeof v.error === 'string' ? v.error : 'Sign-in failed.')
    }
    if (typeof v.customToken !== 'string' || !v.customToken) {
      throw new Error('Sign-in failed.')
    }
    if (!firebaseAuth || !isFirebaseConfigured) throw new Error('Firebase is not configured.')
    await signInWithCustomToken(firebaseAuth, v.customToken)
  }

  const runSol = async (address: string) => {
    const chRes = await fetch('/api/auth/wallet/login-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain: 'sol', address }),
    })
    const ch = await chRes.json().catch(() => ({}))
    if (!chRes.ok) {
      throw new Error(typeof ch.error === 'string' ? ch.error : 'This wallet is not linked to a Buildry account.')
    }
    const encoded = new TextEncoder().encode(ch.message as string)
    if (typeof solProvider?.signMessage !== 'function') {
      throw new Error('This Solana wallet cannot sign messages here. Try Phantom.')
    }
    const sigBytes = await solProvider.signMessage(encoded)
    const sigB64 = uint8ArrayToBase64(sigBytes)
    const vRes = await fetch('/api/auth/wallet/login-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: ch.challengeId,
        signature: '',
        solSignatureBase64: sigB64,
      }),
    })
    const v = await vRes.json().catch(() => ({}))
    if (!vRes.ok) {
      throw new Error(typeof v.error === 'string' ? v.error : 'Sign-in failed.')
    }
    if (typeof v.customToken !== 'string' || !v.customToken) {
      throw new Error('Sign-in failed.')
    }
    if (!firebaseAuth || !isFirebaseConfigured) throw new Error('Firebase is not configured.')
    await signInWithCustomToken(firebaseAuth, v.customToken)
  }

  useEffect(() => {
    if (!connectTapped || disabled) return

    const evm = evmConnected && evmAddress
    const sol = solConnected && solAddress
    if (!evm && !sol) return

    const key = evm ? `evm:${evmAddress}` : `sol:${solAddress}`
    if (failedKeyRef.current === key) return
    if (inFlightRef.current === key) return

    const handle = window.setTimeout(() => {
      inFlightRef.current = key
      setStatus('working')
      setDetail('Sign the message in your wallet…')

      const p = evm ? runEvm(evmAddress!) : runSol(solAddress!)
      p.then(() => {
        inFlightRef.current = null
        setStatus('idle')
        setDetail('')
        onSignedInRef.current()
      }).catch((e: unknown) => {
        inFlightRef.current = null
        failedKeyRef.current = key
        setStatus('error')
        setDetail(e instanceof Error ? e.message : 'Wallet sign-in failed.')
      })
    }, 400)

    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signMessageAsync identity changes often; solProvider optional
  }, [connectTapped, disabled, evmConnected, evmAddress, solConnected, solAddress])

  const busy = disabled || status === 'working' || evmSigning

  return (
    <div className="mb-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setDetail('')
          setStatus('idle')
          failedKeyRef.current = null
          inFlightRef.current = null
          setConnectTapped(true)
          open({ view: 'Connect' })
        }}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:pointer-events-none"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {busy ? 'Working…' : 'Connect wallet'}
      </button>
      {detail ? (
        <p
          className={`text-xs font-medium text-center mt-3 px-1 ${status === 'error' ? 'text-red-500' : 'text-slate-500'}`}
        >
          {detail}
        </p>
      ) : null}
      {status === 'error' ? (
        <button
          type="button"
          className="mt-2 w-full text-[11px] font-bold text-blue-600 hover:text-blue-800"
          onClick={() => {
            failedKeyRef.current = null
            inFlightRef.current = null
            setStatus('idle')
            setDetail('')
            setConnectTapped(false)
            window.setTimeout(() => setConnectTapped(true), 0)
          }}
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
