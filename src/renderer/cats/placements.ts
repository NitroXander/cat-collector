import type { Anchor } from '@shared/types'

export interface Bounds {
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Placement {
  /** resting top-left position in screen pixels */
  x: number
  y: number
  /** where the cat starts before it walks/slides in */
  fromX: number
  fromY: number
}

/** Gap between the cat and the screen edge, in CSS pixels. */
export const EDGE_MARGIN = 2

/** Keeps a value inside a range even when the range is inverted or tiny. */
function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.max(min, Math.min(max, value))
}

/** A random point along an axis, inset by the sprite size and the edge margin. */
function along(extent: number, size: number, rng: () => number): number {
  const min = EDGE_MARGIN
  const max = extent - size - EDGE_MARGIN
  return Math.round(clamp(min + rng() * (max - min), min, max))
}

/**
 * Where a cat rests for a given anchor, and where it comes from.
 * Positions are randomised so cats show up all across the screen instead of
 * always in the same spot — this is the main tuning surface for placement.
 */
export function resolvePlacement(
  anchor: Anchor,
  bounds: Bounds,
  size: Size,
  rng: () => number = Math.random
): Placement {
  switch (anchor) {
    case 'corner': {
      // any of the four corners, entering from the nearer horizontal edge
      const left = rng() < 0.5
      const top = rng() < 0.5
      const x = left ? EDGE_MARGIN : bounds.width - size.width - EDGE_MARGIN
      const y = top ? EDGE_MARGIN : bounds.height - size.height - EDGE_MARGIN
      return { x, y, fromX: left ? -size.width : bounds.width + size.width, fromY: y }
    }
    case 'bottom': {
      const x = along(bounds.width, size.width, rng)
      const y = bounds.height - size.height - EDGE_MARGIN
      return { x, y, fromX: x, fromY: bounds.height + size.height }
    }
    case 'side': {
      const left = rng() < 0.5
      const x = left ? EDGE_MARGIN : bounds.width - size.width - EDGE_MARGIN
      const y = along(bounds.height, size.height, rng)
      return { x, y, fromX: left ? -size.width : bounds.width + size.width, fromY: y }
    }
    case 'top': {
      const x = along(bounds.width, size.width, rng)
      return { x, y: EDGE_MARGIN, fromX: x, fromY: -size.height }
    }
  }
}
