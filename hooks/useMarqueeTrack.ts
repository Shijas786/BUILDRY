'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

type UseMarqueeTrackOptions = {
  speed?: number
  pause?: boolean
  /** When this changes, the loop restarts from the start */
  resetKey: string | number
  /** When false, no animation (e.g. short lists where a duplicate strip would show the same token twice). */
  enabled?: boolean
}

/**
 * Infinite horizontal marquee via translate3d.
 * The track element should have two segment children (duplicate content); loop length is
 * `children[1].offsetLeft` so it stays correct even when scrollWidth === clientWidth.
 */
export function useMarqueeTrack({
  speed = 0.3,
  pause = false,
  resetKey,
  enabled = true,
}: UseMarqueeTrackOptions): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    if (!enabled) {
      el.style.transform = ''
      return
    }

    let x = 0
    let raf = 0
    const effectiveSpeed = reduceMotion ? speed * 0.2 : speed

    const tick = () => {
      if (!pause && effectiveSpeed > 0) {
        const second = el.children[1] as HTMLElement | undefined
        const cycle = second != null ? second.offsetLeft : el.scrollWidth / 2
        if (cycle > 1) {
          x += effectiveSpeed
          if (x >= cycle) x -= cycle
          el.style.transform = `translate3d(${-x}px,0,0)`
        }
      }
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(raf)
      el.style.transform = ''
    }
  }, [speed, pause, resetKey, reduceMotion, enabled])

  return ref
}
