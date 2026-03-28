'use client'

import React from 'react'
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit'

/** Strip scheme/path; keep host only (e.g. buildry.in). */
function parseEnvDomain(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined
  return raw.replace(/^https?:\/\//i, '').split('/')[0]?.trim() || undefined
}

function apexHost(host: string): string {
  return host.replace(/^www\./i, '')
}

function hostsMatch(a: string, b: string): boolean {
  return apexHost(a) === apexHost(b)
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

  // Production: if env host matches this page (e.g. www vs apex), use env for SIWE so it matches Farcaster app config.
  const domain = envHost && hostsMatch(hostname, envHost) ? envHost : hostname
  let siweUri = window.location.origin
  if (envHost && hostsMatch(hostname, envHost)) {
    const isLocalEnv = envHost.includes('localhost') || envHost.startsWith('127.')
    const protocol = isLocalEnv ? 'http' : 'https'
    siweUri = `${protocol}://${envHost}`
  }

  return { domain, siweUri, rpcUrl, relay }
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
      const username =
        data?.username || (data?.fid != null ? `!${data.fid}` : '')
      if (!username) return
      reported.current = true
      onConnected({
        username,
        fid: data.fid,
        bio: data.bio,
        displayName: data.displayName,
        pfpUrl: data.pfpUrl,
        custody: data.custody,
        verifications: data.verifications,
      })
    },
    [onConnected]
  )

  React.useEffect(() => {
    if (!isAuthenticated || !profile?.username || reported.current) return
    reported.current = true
    onConnected(profile)
  }, [isAuthenticated, profile, onConnected])

  return (
    <div className="farcaster-connect-kit [&_button]:w-full [&_button]:min-h-[40px] [&_button]:rounded-xl [&_button]:text-[10px] [&_button]:font-black [&_button]:uppercase [&_button]:tracking-widest">
      <SignInButton
        nonce={nonce}
        hideSignOut
        timeout={600_000}
        interval={2000}
        onSuccess={handleSuccess}
        onError={(err) => onError?.(err?.message || 'Farcaster connect failed')}
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
  const [nonce] = React.useState(
    () => `buildry-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
  )

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
