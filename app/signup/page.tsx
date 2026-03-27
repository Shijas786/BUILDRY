'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import OnboardingShell from '@/components/onboarding/OnboardingShell'

export default function SignupPage() {
  const router = useRouter()

  const handleComplete = () => {
    // Simulate signup completion
    localStorage.setItem('buildry_onboarded', 'true')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-black">
      <OnboardingShell onComplete={handleComplete} />
    </div>
  )
}
