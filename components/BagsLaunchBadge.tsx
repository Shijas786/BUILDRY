'use client'

import Link from 'next/link'

const BAGS_SITE = 'https://bags.fm'

export function bagsFmTokenUrl(mint: string): string {
  const m = mint.trim()
  if (!m) return BAGS_SITE
  return `${BAGS_SITE}/token/${encodeURIComponent(m)}`
}

type Props = {
  /** Primary mint for deep link to token on Bags when available */
  mint?: string | null
  className?: string
  /** `float` = corner overlay on avatars; `inline` = compact pill */
  variant?: 'float' | 'inline'
}

/** Official Bags.fm favicon (green mark) — reuse for builder / launch affordances. */
export function BagsFmIcon({
  className,
  width = 18,
  height = 18,
}: {
  className?: string
  width?: number
  height?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BAGS_SITE}/favicon.ico`}
      alt=""
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}

/**
 * Marks builders whose Solana wallet has creator tokens from the Bags API (Bags launch).
 */
export default function BagsLaunchBadge({ mint, className = '', variant = 'float' }: Props) {
  const href = mint ? bagsFmTokenUrl(mint) : BAGS_SITE

  if (variant === 'inline') {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title="Launched on Bags"
        aria-label="Launched on Bags — open on bags.fm"
        className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-800 ring-1 ring-sky-200/80 transition-colors hover:bg-sky-100 ${className}`}
      >
        <span className="flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white ring-1 ring-sky-100">
          <BagsFmIcon className="size-3 object-cover" />
        </span>
        <span>Bags</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Launched on Bags"
      aria-label="Launched on Bags — open on bags.fm"
      className={`absolute -bottom-0.5 -right-0.5 z-10 flex size-8 items-center justify-center rounded-full bg-white p-0.5 shadow-md ring-2 ring-white transition-transform hover:scale-105 hover:ring-sky-200 ${className}`}
    >
      <span className="flex size-[26px] items-center justify-center overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100">
        <BagsFmIcon className="size-[18px] object-cover" />
      </span>
    </Link>
  )
}
