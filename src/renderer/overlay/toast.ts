import type { Rect } from './hitTest'

export interface ToastPlacement {
  left: number
  top: number
  /** true when the toast had to sit below the cat instead of above it */
  below: boolean
}

export interface Size {
  width: number
  height: number
}

/**
 * Works out where a toast can go so it is always fully on screen.
 *
 * Toasts prefer to sit just above the cat they describe. A cat on the top edge has
 * no room above it, so the toast flips below instead. Horizontal position is
 * clamped so a cat in a corner does not push the toast off the side.
 */
export function placeToast(
  bounds: Rect | undefined,
  toast: Size,
  viewport: Size,
  margin = 12,
  fallbackFromBottom = 80
): ToastPlacement {
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(value, Math.max(min, max)))

  const anchorX = bounds ? bounds.x + bounds.width / 2 : viewport.width / 2
  const above = bounds ? bounds.y : viewport.height - fallbackFromBottom
  const below = bounds ? bounds.y + bounds.height : viewport.height - fallbackFromBottom

  const fitsAbove = above - toast.height - margin >= 0
  const rawTop = fitsAbove ? above - margin : below + margin
  const top = clamp(rawTop, margin, viewport.height - toast.height - margin)

  const rawLeft = anchorX - toast.width / 2
  const left = clamp(rawLeft, margin, viewport.width - toast.width - margin)

  return { left: Math.round(left), top: Math.round(top), below: !fitsAbove }
}
