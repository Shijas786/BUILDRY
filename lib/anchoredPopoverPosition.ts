/** Viewport-fixed popover position anchored to a trigger `getBoundingClientRect()`. */
export function getAnchoredPopoverPosition(
  trigger: DOMRect,
  popW: number,
  popH: number,
  align: 'start' | 'end'
): { top: number; left: number } {
  const pad = 8
  let left = align === 'end' ? trigger.right - popW : trigger.left
  left = Math.min(Math.max(pad, left), window.innerWidth - popW - pad)

  let top = trigger.top - popH - pad
  if (top < pad) {
    top = trigger.bottom + pad
  }
  const vh = window.innerHeight
  if (top + popH > vh - pad) {
    top = Math.max(pad, vh - popH - pad)
  }
  if (top < pad) top = pad
  return { top, left }
}
