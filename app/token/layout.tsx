import LoggedOutNavShell from '@/components/LoggedOutNavShell'

export default function TokenLayout({ children }: { children: React.ReactNode }) {
  return <LoggedOutNavShell>{children}</LoggedOutNavShell>
}
