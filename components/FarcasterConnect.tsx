'use client'

import React from 'react'
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit'

/** Strip scheme/path; keep host only (e.g. buildry.in). */
function parseEnvDomain(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  return raw.replace(/^https?:\/\//i, '').split('/')[0]?.trim() || undefined
}

function buildAuthKitConfig() {
  const envHost = parseEnvDomain(process.env.NEXT_PUBLIC_APP_DOMAIN)
  const relay =
    process.env.NEXT_PUBLIC_FARCASTER_AUTH_RELAY?.trim() || 'https://relay.farcaster.xyz'
  const rpcUrl =
    process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL?.trim() || 'https://mainnet.optimism.io'

  if (typeof window === 'undefined') {
    const host = envHost || 'localhost'
    const isLocal = host.includes('localhost') || host.startsWith('127.')
    return {
      domain: host,
      siweUri: isLocal ? `http://${host}` : `https://${host}`,
      rpcUrl,
      relay,
    }
  }

  const hostname = window.location.hostname
  const isLocalPage = hostname === 'localhost' || hostname.startsWith('127.')

  if (isLocalPage) {
    return {
      domain: hostname,
      siweUri: window.location.origin,
      rpcUrl,
      relay,
    }
  }

  // Use the **actual** page host + origin for SIWE. Mismatch with a different host in env (e.g. apex vs www) is the
  // most common cause of Warpcast showing "Sign in failed" after approve — the relay verifies against your
  // Farcaster developer app domain, which must match this host exactly.
  return {
    domain: hostname,
    siweUri: window.location.origin,
    rpcUrl,
    relay,
  }
}

type SignInSuccess = {
  fid?: number
  username?: string
  bio?: string
  displayName?: string
  pfpUrl?: string
  custody?: string
  verifications?: string[]
}

function InnerConnect({
  onConnected,
  onError,
  nonce,
}: {
  onConnected: (profile: any) => void
  onError?: (message: string) => void
  nonce: string
}) {
  const { isAuthenticated, profile } = useProfile()
  const reported = React.useRef(false)

  const handleSuccess = React.useCallback(
    (data: SignInSuccess) => {
      if (reported.current) return
      const fid = data?.fid
      // Relay must return a numeric fid; without it Auth Kit's UI shows "!undefined"
      if (fid == null || typeof fid !== 'number' || !Number.isFinite(fid)) {
        onError?.('Could not read your Farcaster ID. Close Warpcast and try again.')
        return
      }
      const rawName = typeof data?.username === 'string' ? data.username.trim() : ''
      const username = rawName || `!${fid}`
      reported.current = true
      onConnected({
        username,
        fid,
        bio: data.bio,
        displayName: data.displayName,
        pfpUrl: data.pfpUrl,
        custody: data.custody,
        verifications: data.verifications,
      })
    },
    [onConnected, onError]
  )

  React.useEffect(() => {
    if (!isAuthenticated || reported.current) return
    const fid = profile?.fid
    if (fid == null || typeof fid !== 'number' || !Number.isFinite(fid)) return
    const rawName = typeof profile?.username === 'string' ? profile.username.trim() : ''
    reported.current = true
    onConnected({
      username: rawName || `!${fid}`,
      fid,
      bio: profile.bio,
      displayName: profile.displayName,
      pfpUrl: profile.pfpUrl,
      custody: profile.custody,
      verifications: profile.verifications,
    })
  }, [isAuthenticated, profile, onConnected])

  return (
    <div className="farcaster-connect-kit [&_button]:w-full [&_button]:min-h-[40px] [&_button]:rounded-xl [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-widest">
      <SignInButton
        nonce={nonce}
        hideSignOut
        timeout={600_000}
        interval={2000}
        onSuccess={handleSuccess}
        onError={(err) => {
          const detail =
            err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string'
              ? (err as { message: string }).message
              : String(err ?? '')
          onError?.(detail || 'Farcaster connect failed')
        }}
      />
    </div>
  )
}

export default function FarcasterConnect({
  onConnected,
  onError,
}: {
  onConnected: (profile: any) => void
  onError?: (message: string) => void
}) {
  const [nonce] = React.useState(() => {
    // SIWE (EIP-4361) requires nonce to be alphanumeric only — no hyphens.
    const rand =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID().replace(/-/g, '')
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    return rand.slice(0, 16)
  })

  const [config, setConfig] = React.useState<ReturnType<typeof buildAuthKitConfig> | null>(null)

  React.useEffect(() => {
    setConfig(buildAuthKitConfig())
  }, [])

  if (!config) {
    return (
      <div className="w-full min-h-[40px] rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
    )
  }

  return (
    <AuthKitProvider config={config}>
      <InnerConnect nonce={nonce} onConnected={onConnected} onError={onError} />
    </AuthKitProvider>
  )
}
