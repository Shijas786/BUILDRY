'use client'

import Image from 'next/image'

/** Black script wordmark on transparent PNG. Invert only for dark surfaces (`tone="light"`). */
const WORDMARK_SRC = '/brand/buildry_transparent.png'

type Props = {
  /** `dark` = on light backgrounds (default). `light` = on dark backgrounds (inverted to white). */
  tone?: 'dark' | 'light'
  /**
   * `full` — horizontal wordmark (navbar, footer).
   * `icon` — square crop for collapsed sidebar / tight spaces.
   */
  variant?: 'full' | 'icon'
  className?: string
  priority?: boolean
}

export default function BuildryWordmark({
  tone = 'dark',
  variant = 'full',
  className = '',
  priority = false,
}: Props) {
  const filterClass = tone === 'light' ? 'invert' : ''

  if (variant === 'icon') {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ${className}`}
        style={{ width: 48, height: 48 }}
      >
        <Image
          src={WORDMARK_SRC}
          alt="Buildry"
          fill
          sizes="48px"
          className={`object-cover object-[22%_50%] scale-[1.28] ${filterClass}`}
          priority={priority}
        />
      </div>
    )
  }

  return (
    <Image
      src={WORDMARK_SRC}
      alt="Buildry"
      width={1536}
      height={1024}
      className={`h-11 w-auto max-w-[220px] sm:h-12 sm:max-w-[280px] md:h-14 md:max-w-[320px] object-contain object-left ${filterClass} ${className}`}
      priority={priority}
    />
  )
}
