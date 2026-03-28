'use client'

import React from 'react'
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit'

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
        onSuccess={() => {}}
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
  const nonce = React.useMemo(() => `buildry-${crypto.randomUUID()}`, [])
  const domain =
    typeof window !== 'undefined' ? window.location.hostname : process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost'
  const config = React.useMemo(
    () => ({
      domain,
      siweUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
      rpcUrl: 'https://mainnet.optimism.io',
    }),
    [domain]
  )

  return (
    <AuthKitProvider config={config}>
      <InnerConnect nonce={nonce} onConnected={onConnected} onError={onError} />
    </AuthKitProvider>
  )
}

