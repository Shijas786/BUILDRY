'use client'

import React from 'react'
import { AuthKitProvider, SignInButton, useProfile } from '@farcaster/auth-kit'

function InnerConnect({ onConnected }: { onConnected: (profile: any) => void }) {
  const { isAuthenticated, profile } = useProfile()

  React.useEffect(() => {
    if (isAuthenticated && profile?.username) {
      onConnected(profile)
    }
  }, [isAuthenticated, profile, onConnected])

  return (
    <SignInButton
      nonce="buildry-farcaster"
      hideSignOut
      onSuccess={() => {}}
      onError={() => {}}
    />
  )
}

export default function FarcasterConnect({ onConnected }: { onConnected: (profile: any) => void }) {
  const domain =
    typeof window !== 'undefined' ? window.location.hostname : process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost'
  const config = React.useMemo(
    () => ({
      domain,
      siweUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    }),
    [domain]
  )

  return (
    <AuthKitProvider config={config}>
      <InnerConnect onConnected={onConnected} />
    </AuthKitProvider>
  )
}

