import { describe, expect, it } from 'vitest'
import { CAT_BASE_SIZE, SPRITE_SCALE } from '@shared/constants'
import { CAT_CATALOG, TOP_SCRATCHER_CAT } from '@shared/cats'
import { PLACEHOLDER_ART, SCRATCHER_ART, artForSprite } from '@shared/artwork'
import type { ArtShapes } from '@shared/artwork'

/** Every coordinate in a bundle of shapes, as [x, y] pairs. */
function pointsOf(shapes: ArtShapes): [number, number][] {
  const points: [number, number][] = []
  for (const e of shapes.ellipses) {
    points.push([e.cx - e.rx, e.cy - e.ry], [e.cx + e.rx, e.cy + e.ry])
  }
  for (const c of shapes.circles) {
    points.push([c.cx - c.r, c.cy - c.r], [c.cx + c.r, c.cy + c.r])
  }
  for (const p of shapes.polygons) {
    for (let i = 0; i < p.points.length; i += 2) points.push([p.points[i], p.points[i + 1]])
  }
  return points
}

const baseShapes: ArtShapes = {
  ellipses: SCRATCHER_ART.ellipses,
  circles: SCRATCHER_ART.circles,
  polygons: SCRATCHER_ART.polygons
}

describe('artForSprite', () => {
  it('gives every cat in the roster its own art', () => {
    for (const cat of CAT_CATALOG) {
      expect(artForSprite(cat.sprite), cat.id).toBeDefined()
    }
    expect(artForSprite(TOP_SCRATCHER_CAT.sprite)).toBe(SCRATCHER_ART)
  })

  it('falls back to the placeholder for a sprite it has never seen', () => {
    expect(artForSprite('nobody')).toBe(PLACEHOLDER_ART)
  })
})

describe('scratcher art', () => {
  it('renders at the 96 x 123 hitbox the design calls for', () => {
    const width = CAT_BASE_SIZE * SPRITE_SCALE
    const height = (width / SCRATCHER_ART.box) * (SCRATCHER_ART.boxHeight ?? SCRATCHER_ART.box)
    expect(width).toBe(96)
    expect(height).toBe(123)
  })

  it('has the limbs the overlay animates', () => {
    expect(Object.keys(SCRATCHER_ART.parts ?? {})).toEqual(['tail', 'armL', 'armR'])
  })

  it('marks its trail along the paws, not beside them', () => {
    const paws = ['armL', 'armR'].map((name) => SCRATCHER_ART.parts?.[name]?.shapes.circles[0]?.cx)
    expect(SCRATCHER_ART.clawX).toEqual(paws)
  })

  it('puts the claws on the very top of the box, so the cat grips the edge', () => {
    const claws = ['armL', 'armR'].flatMap((name) =>
      pointsOf(SCRATCHER_ART.parts?.[name]?.shapes ?? { ellipses: [], circles: [], polygons: [] })
    )
    expect(claws.length).toBeGreaterThan(0)
    expect(Math.min(...claws.map(([, y]) => y))).toBeLessThanOrEqual(0.5)
  })

  it('keeps every shape inside the unit box, except the paws over the edge', () => {
    const width = SCRATCHER_ART.box
    const height = SCRATCHER_ART.boxHeight ?? SCRATCHER_ART.box
    // the paws deliberately overlap the top of the box: they clamp over the edge
    const overTheEdge = 0.6
    const slack = 1e-9
    const all = [
      ...pointsOf(baseShapes),
      ...Object.values(SCRATCHER_ART.parts ?? {}).flatMap((part) => pointsOf(part.shapes))
    ]

    for (const [x, y] of all) {
      expect(x, `x=${x}`).toBeGreaterThanOrEqual(0)
      expect(x, `x=${x}`).toBeLessThanOrEqual(width)
      expect(y, `y=${y}`).toBeGreaterThanOrEqual(-overTheEdge - slack)
      expect(y, `y=${y}`).toBeLessThanOrEqual(height)
    }
  })
})