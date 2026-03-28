import type { Metadata } from 'next'
import '@farcaster/auth-kit/styles.css'
import './globals.css'
import Web3Provider from '@/context/Web3Provider'
import AuthProvider from '@/context/AuthProvider'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Buildry — Where Founders Build in Public',
  description:
    'The social platform for founders, developers, and investors. Share updates, showcase milestones, launch tokens, and grow your network.',
  keywords: ['startup', 'founders', 'developers', 'solana', 'reputation', 'web3', 'hiring'],
  openGraph: {
    title: 'Buildry',
    description: 'Where founders build in public.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <Web3Provider>
            <AppShell>
              {children}
            </AppShell>
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  )
}
