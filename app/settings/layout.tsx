import { WalletProviders } from '@/components/WalletProviders'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>
}
