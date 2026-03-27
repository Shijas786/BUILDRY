import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingStore {
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (seen: boolean) => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
    }),
    {
      name: 'buildry_onboarded',
    }
  )
)
