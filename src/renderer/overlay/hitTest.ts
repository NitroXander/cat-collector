export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type AlphaLookup = (localX: number, localY: number) => boolean

export function hitRect(rect: Rect, px: number, py: number): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
}

/**
 * Bounding box first, then a circular shape test so the transparent corners of a
 * sprite do not swallow clicks. When an alpha map is supplied (real sprite sheets
 * from the atlas), it overrides the shape test entirely.
 */
export function hitShape(
  rect: Rect,
  px: number,
  py: number,
  alpha?: AlphaLookup | null
): boolean {
  if (!hitRect(rect, px, py)) return false

  const localX = px - rect.x
  const localY = py - rect.y
  if (alpha) return alpha(localX, localY)

  const cx = rect.width / 2
  const cy = rect.height / 2
  const radius = Math.min(rect.width, rect.height) / 2
  const dx = localX - cx
  const dy = localY - cy
  return dx * dx + dy * dy <= radius * radius
}
