import LoggedOutNavShell from '@/components/LoggedOutNavShell'
import { WalletProviders } from '@/components/WalletProviders'

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProviders>
      <LoggedOutNavShell>{children}</LoggedOutNavShell>
    </WalletProviders>
  )
}
