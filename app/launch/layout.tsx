import { WalletProviders } from '@/components/WalletProviders'

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>
}
