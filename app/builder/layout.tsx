import LoggedOutNavShell from '@/components/LoggedOutNavShell'

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <LoggedOutNavShell>{children}</LoggedOutNavShell>
}
