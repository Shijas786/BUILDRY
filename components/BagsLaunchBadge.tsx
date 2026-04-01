'use client'

import Link from 'next/link'

const BAGS_SITE = 'https://bags.fm'

export function bagsFmTokenUrl(mint: string): string {
  const m = mint.trim()
  if (!m) return BAGS_SITE
  return `${BAGS_SITE}/${encodeURIComponent(m)}`
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
      className={`absolute bottom-0 right-0 z-10 flex h-[18px] w-[18px] translate-x-1.5 translate-y-0.5 items-center justify-center rounded-full bg-white shadow-md ring-[1.5px] ring-white transition-transform hover:scale-110 hover:ring-sky-200 sm:h-5 sm:w-5 sm:translate-x-2 sm:translate-y-1 ${className}`}
    >
      <span className="flex h-[14px] w-[14px] items-center justify-center overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100 sm:h-4 sm:w-4">
        <BagsFmIcon
          className="h-2.5 w-2.5 object-cover sm:h-3 sm:w-3"
          width={10}
          height={10}
        />
      </span>
    </Link>
  )
}
