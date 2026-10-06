import { CAT_PLACEHOLDER_ID, CAT_TOP_SCRATCHER_ID } from './constants'
import type { Rarity } from './types'

/**
 * Renderer-agnostic description of a cat's placeholder art, in a 32x32 unit box.
 * Both the Pixi overlay and the Catdex window draw from this, so the cat looks
 * the same everywhere and the art lives in exactly one place.
 */
export interface ArtPalette {
  fur: string
  shade: string
  belly: string
  ink: string
}

export interface ArtEllipse {
  cx: number
  cy: number
  rx: number
  ry: number
  fill: keyof ArtPalette
  alpha?: number
}

export interface ArtCircle {
  cx: number
  cy: number
  r: number
  fill: keyof ArtPalette
}

export interface ArtPolygon {
  /** flat x,y pairs in the unit box */
  points: number[]
  fill: keyof ArtPalette
}

/** A bundle of shapes, so a cat can be split into layers as well as drawn flat. */
export interface ArtShapes {
  ellipses: ArtEllipse[]
  circles: ArtCircle[]
  polygons: ArtPolygon[]
}

/**
 * A named layer the overlay can move on its own. The overlay knows three part
 * names by convention: `tail`, `armL` and `armR` — the ones the top scratcher
 * animates while it hangs. Everything else is drawn once and never moves.
 */
export interface ArtPart {
  /** rotation origin, in unit-box coordinates */
  pivotX: number
  pivotY: number
  shapes: ArtShapes
}

export interface CatArt {
  /** width of the unit box */
  box: number
  /** height of the unit box; square art leaves this unset */
  boxHeight?: number
  /**
   * x positions, in unit-box coordinates, where the cat grips the screen. The
   * overlay draws its trail along these, so they must match the paw centres.
   */
  clawX?: number[]
  ellipses: ArtEllipse[]
  circles: ArtCircle[]
  polygons: ArtPolygon[]
  /** drawn under the main shapes, in the order they are declared */
  parts?: Record<string, ArtPart>
}

export const RARITY_PALETTES: Record<Rarity, ArtPalette> = {
  common: { fur: '#f3c98b', shade: '#dba76a', belly: '#ffeacb', ink: '#241c16' },
  uncommon: { fur: '#bfc9d6', shade: '#9aa7b8', belly: '#eef3f8', ink: '#1b2027' },
  rare: { fur: '#c9a7e8', shade: '#a684cc', belly: '#f0e4ff', ink: '#2a1d38' },
  legendary: { fur: '#f5b95c', shade: '#d1913a', belly: '#fff0cf', ink: '#3a2408' }
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary'
}

export const PLACEHOLDER_ART: CatArt = {
  box: 32,
  ellipses: [
    { cx: 16, cy: 23, rx: 10, ry: 8, fill: 'fur' },
    { cx: 16, cy: 25, rx: 6, ry: 5, fill: 'belly', alpha: 0.55 }
  ],
  circles: [
    { cx: 16, cy: 14, r: 9, fill: 'fur' },
    { cx: 12.8, cy: 13, r: 1.1, fill: 'ink' },
    { cx: 19.2, cy: 13, r: 1.1, fill: 'ink' }
  ],
  polygons: [
    { points: [7, 10, 9, 3, 14, 8], fill: 'shade' },
    { points: [25, 10, 23, 3, 18, 8], fill: 'shade' },
    { points: [16, 16, 15, 17.2, 17, 17.2], fill: 'ink' }
  ]
}

/**
 * The top scratcher: paws clamped over the screen edge at y=0, arms hanging down
 * outside a small head, body and hind paws below, tail curling off to one side.
 * A 32x41 box renders at 96x123 px, which is the hitbox called out in
 * `whisker_edge_top_scratcher_cat.html`. The claws sit on the very top of the box
 * so the cat grips the real edge, and the arms stay clear of the head so the reach
 * animation is actually visible.
 */
export const SCRATCHER_ART: CatArt = {
  box: 32,
  boxHeight: 41,
  clawX: [8.2, 23.8],
  parts: {
    tail: {
      pivotX: 9.4,
      pivotY: 32,
      shapes: {
        ellipses: [],
        circles: [],
        polygons: [
          {
            points: [8.6, 31.2, 5.2, 33.8, 3.4, 37.8, 5.6, 40.6, 7.2, 38.8, 5.8, 36, 7.6, 34.4, 10.6, 33.4],
            fill: 'fur'
          }
        ]
      }
    },
    armL: {
      pivotX: 9.8,
      pivotY: 18.6,
      shapes: {
        ellipses: [{ cx: 8.6, cy: 11, rx: 1.8, ry: 8.2, fill: 'fur' }],
        circles: [{ cx: 8.2, cy: 2.6, r: 2.4, fill: 'fur' }],
        polygons: [
          { points: [5.6, 2.2, 7, 0.4, 8.4, 2.2], fill: 'ink' },
          { points: [8.2, 2.2, 9.6, 0.4, 11, 2.2], fill: 'ink' }
        ]
      }
    },
    armR: {
      pivotX: 22.2,
      pivotY: 17.6,
      shapes: {
        ellipses: [{ cx: 23.4, cy: 10.2, rx: 1.8, ry: 7.8, fill: 'fur' }],
        circles: [{ cx: 23.8, cy: 2.3, r: 2.4, fill: 'fur' }],
        polygons: [
          { points: [21.2, 2, 22.6, 0.2, 24, 2], fill: 'ink' },
          { points: [23.8, 2, 25.2, 0.2, 26.6, 2], fill: 'ink' }
        ]
      }
    }
  },
  ellipses: [
    { cx: 16, cy: 26.4, rx: 8.8, ry: 9.6, fill: 'fur' },
    { cx: 16, cy: 29, rx: 5, ry: 5.6, fill: 'belly', alpha: 0.5 },
    { cx: 12.4, cy: 35.6, rx: 4.4, ry: 2.6, fill: 'shade' },
    { cx: 19.6, cy: 34.8, rx: 4.2, ry: 2.5, fill: 'shade' },
    { cx: 16, cy: 20.6, rx: 3.2, ry: 2, fill: 'belly', alpha: 0.4 }
  ],
  circles: [
    { cx: 16, cy: 17.6, r: 6, fill: 'fur' },
    { cx: 13.9, cy: 17.2, r: 1.05, fill: 'ink' },
    { cx: 18.1, cy: 17.2, r: 1.05, fill: 'ink' }
  ],
  polygons: [
    { points: [10.6, 13.6, 9.8, 8.4, 15, 12], fill: 'shade' },
    { points: [21.4, 13.6, 22.2, 8.4, 17, 12], fill: 'shade' },
    { points: [16, 19.6, 14.9, 20.9, 17.1, 20.9], fill: 'ink' }
  ]
}

/** Art per sprite id, so a new cat only needs a data entry. */
const CAT_ART: Record<string, CatArt> = {
  [CAT_PLACEHOLDER_ID]: PLACEHOLDER_ART,
  [CAT_TOP_SCRATCHER_ID]: SCRATCHER_ART
}

export function artForSprite(sprite: string): CatArt {
  return CAT_ART[sprite] ?? PLACEHOLDER_ART
}

/** Draws the art onto a 2D canvas context, used by the Catdex window. */
export function paintArt(
  ctx: CanvasRenderingContext2D,
  art: CatArt,
  palette: ArtPalette,
  size: number
): void {
  const boxWidth = art.box
  const boxHeight = art.boxHeight ?? art.box
  // Fit the whole box at one scale and centre it, so a tall cat reads as a tall
  // cat in a square thumbnail instead of being stretched.
  const u = Math.min(size / boxWidth, size / boxHeight)
  const v = u

  ctx.clearRect(0, 0, size, size)
  ctx.save()
  ctx.translate((size - boxWidth * u) / 2, (size - boxHeight * v) / 2)

  // Parts go down first, so the body and head stay on top of the limbs behind them.
  for (const part of Object.values(art.parts ?? {})) {
    paintShapes(ctx, part.shapes, palette, u, v)
  }
  paintShapes(
    ctx,
    { ellipses: art.ellipses, circles: art.circles, polygons: art.polygons },
    palette,
    u,
    v
  )

  ctx.restore()
  ctx.globalAlpha = 1
}

function paintShapes(
  ctx: CanvasRenderingContext2D,
  shapes: ArtShapes,
  palette: ArtPalette,
  u: number,
  v: number
): void {
  for (const e of shapes.ellipses) {
    ctx.globalAlpha = e.alpha ?? 1
    ctx.fillStyle = palette[e.fill]
    ctx.beginPath()
    ctx.ellipse(e.cx * u, e.cy * v, e.rx * u, e.ry * v, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const c of shapes.circles) {
    ctx.globalAlpha = 1
    ctx.fillStyle = palette[c.fill]
    ctx.beginPath()
    ctx.ellipse(c.cx * u, c.cy * v, c.r * u, c.r * v, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const p of shapes.polygons) {
    ctx.globalAlpha = 1
    ctx.fillStyle = palette[p.fill]
    ctx.beginPath()
    p.points.forEach((value, index) => {
      const x = value * u
      const y = p.points[index + 1] * v
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
  }
}
