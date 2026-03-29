'use client'

import React, { ReactNode } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { mainnet, base, solana } from '@reown/appkit/networks'
import { WagmiProvider, cookieStorage, createStorage, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 1. Project ID from https://cloud.reown.com — set NEXT_PUBLIC_REOWN_PROJECT_ID in .env
const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'fe34153f6b31c344d6cbcc7008c37144'

// 2. Set up Wagmi Adapter
export const networks = [mainnet, base]
const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

// 3. Set up Solana Adapter
const solanaAdapter = new SolanaAdapter({
  wallets: [] // Standard wallets are discovered automatically
})

// 4. Create modal
const metadata = {
  name: 'Buildry',
  description: 'Identity-First Trading Protocol',
  url: 'https://buildry.network',
  icons: ['https://buildry.network/icon.png']
}

createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks: [mainnet, base, solana],
  projectId,
  metadata,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#2563EB',
    '--w3m-border-radius-master': '1px'
  },
  features: {
    // Extra Reown/network work on every load; only enable in production.
    analytics: process.env.NODE_ENV === 'production',
  },
})

const queryClient = new QueryClient()

export default function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
