'use client'

import React from 'react'
import BuilderShowcaseSection from '@/components/BuilderShowcaseSection'

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden pt-6">
      <BuilderShowcaseSection
        title="Explore Builders"
        subtitle="Ranked by onchain reputation — not followers"
        showRightRail={false}
        cta={{ href: '/feed', label: 'View feed' }}
      />
    </div>
  )
}
