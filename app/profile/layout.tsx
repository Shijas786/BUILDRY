import { WalletProviders } from '@/components/WalletProviders'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>
}
