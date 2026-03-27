import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'developer' | 'founder' | 'investor' | 'recruiter'

interface RoleStore {
  activeRole: UserRole
  setActiveRole: (role: UserRole) => void
  sidebarExpanded: boolean
  toggleSidebar: () => void
}

export const useRoleStore = create<RoleStore>()(
  persist(
    (set) => ({
      activeRole: 'developer',
      setActiveRole: (role) => set({ activeRole: role }),
      sidebarExpanded: true,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
    }),
    { name: 'buildry_role' }
  )
)

export interface NavItem {
  name: string
  href: string
  icon: string
}

const shared: NavItem[] = [
  { name: 'Feed', href: '/feed', icon: 'feed' },
]

const investTrade: NavItem = { name: 'Invest & Trade', href: '/invest', icon: 'invest' }

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  developer: [
    ...shared,
    { name: 'Explore', href: '/explore', icon: 'explore' },
    { name: 'Jobs', href: '/jobs', icon: 'jobs' },
    investTrade,
    { name: 'My Projects', href: '/projects', icon: 'projects' },
    { name: 'Launch Token', href: '/launch', icon: 'launch' },
  ],
  founder: [
    ...shared,
    { name: 'Launch Token', href: '/launch', icon: 'launch' },
    { name: 'My Startup', href: '/projects', icon: 'projects' },
    investTrade,
    { name: 'Hire Talent', href: '/jobs', icon: 'jobs' },
    { name: 'Explore', href: '/explore', icon: 'explore' },
  ],
  investor: [
    ...shared,
    investTrade,
    { name: 'Discover', href: '/explore', icon: 'explore' },
    { name: 'Backed Projects', href: '/projects', icon: 'projects' },
    { name: 'Talent Board', href: '/jobs', icon: 'jobs' },
  ],
  recruiter: [
    ...shared,
    { name: 'Post Job', href: '/jobs/new', icon: 'jobs' },
    { name: 'Talent Board', href: '/explore', icon: 'explore' },
    investTrade,
    { name: 'Applications', href: '/jobs', icon: 'projects' },
  ],
}
