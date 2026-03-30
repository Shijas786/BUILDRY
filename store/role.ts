import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'developer' | 'founder' | 'investor' | 'recruiter'

interface RoleStore {
  activeRole: UserRole
  setActiveRole: (role: UserRole) => void
  sidebarExpanded: boolean
  toggleSidebar: () => void
  /** Slide-over nav on small screens; not persisted */
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  toggleMobileNav: () => void
}

export const useRoleStore = create<RoleStore>()(
  persist(
    (set) => ({
      activeRole: 'developer',
      setActiveRole: (role) => set({ activeRole: role }),
      sidebarExpanded: true,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
    }),
    {
      name: 'buildry_role',
      partialize: (state) => ({
        activeRole: state.activeRole,
        sidebarExpanded: state.sidebarExpanded,
      }),
    }
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
    { name: 'Launch Token', href: '/launch', icon: 'launch' },
  ],
  founder: [
    ...shared,
    investTrade,
    { name: 'Hire Talent', href: '/jobs', icon: 'jobs' },
    { name: 'Explore', href: '/explore', icon: 'explore' },
    { name: 'Launch Token', href: '/launch', icon: 'launch' },
  ],
  investor: [
    ...shared,
    investTrade,
    { name: 'Discover', href: '/explore', icon: 'explore' },
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
