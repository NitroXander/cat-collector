import { Container, Graphics } from 'pixi.js'
import { CAT_BASE_SIZE, SCRATCH_TRAIL_FADE_MS, SPRITE_SCALE } from '@shared/constants'
import { RARITY_PALETTES, artForSprite } from '@shared/artwork'
import type { ArtPalette, ArtPart, ArtShapes, CatArt } from '@shared/artwork'
import type { CatDefinition } from '@shared/types'

export type CatFrame =
  | 'peekIn'
  | 'peeking'
  | 'peekOut'
  | 'flee'
  | 'enter'
  | 'grip'
  | 'scratch'
  | 'fall'
  | 'captured'
  | 'removed'

export interface CatSprite {
  readonly view: Container
  readonly width: number
  readonly height: number
  setFrame(frame: CatFrame): void
  tick(elapsedMs: number): void
  destroy(): void
}

/**
 * A cat that marks the screen it hangs from. The marks live in their own layer,
 * pinned to the edge, so they stay behind when the cat moves on.
 */
export interface TrailSprite extends CatSprite {
  readonly trailView: Container
  /** Length of the claw trail above the cat, in pixels. */
  setTrail(lengthPx: number): void
  /** Start fading the marks out. The cat is on its way off the screen. */
  fadeTrail(): void
}

/** Part names the scratch sprite animates. Any other part is drawn and left still. */
const TAIL = 'tail'
const ARM_L = 'armL'
const ARM_R = 'armR'

const CLAW_OFFSETS = [-7, 0, 7]
/** Per-claw trail lengths, so the top of the trail is ragged rather than squared off. */
const CLAW_LENGTHS = [0.86, 1, 0.92]
const CLAW_WIDTH_PX = 1.2
const CLAW_ALPHA = 0.42

/** One full reach of a front paw, and one sway of the tail. */
const REACH_PERIOD_MS = 700
const TAIL_SWAY_PERIOD_MS = 1400

interface BuiltCat {
  view: Container
  width: number
  height: number
  /** unit -> pixel scale, one factor per axis */
  u: number
  v: number
  parts: Map<string, Container>
}

/** Paints one bundle of art shapes, scaled per axis so portrait art is not squashed. */
function drawShapes(
  target: Graphics,
  shapes: ArtShapes,
  palette: ArtPalette,
  u: number,
  v: number
): void {
  for (const e of shapes.ellipses) {
    target
      .ellipse(e.cx * u, e.cy * v, e.rx * u, e.ry * v)
      .fill({ color: palette[e.fill], alpha: e.alpha ?? 1 })
  }
  for (const c of shapes.circles) {
    target.ellipse(c.cx * u, c.cy * v, c.r * u, c.r * v).fill(palette[c.fill])
  }
  for (const p of shapes.polygons) {
    const points: number[] = []
    for (let i = 0; i < p.points.length; i += 2) {
      points.push(p.points[i] * u, p.points[i + 1] * v)
    }
    target.poly(points).fill(palette[p.fill])
  }
}

/**
 * Turns an art definition into a Pixi container. Animated parts get a child
 * container of their own, pivoted on the joint so a rotation reads as a limb
 * moving rather than the whole cat tipping over.
 */
function buildCat(art: CatArt, palette: ArtPalette, size: number): BuiltCat {
  const boxHeight = art.boxHeight ?? art.box
  const u = size / art.box
  const v = size / boxHeight
  const view = new Container()
  const parts = new Map<string, Container>()

  for (const [name, part] of Object.entries(art.parts ?? {})) {
    const holder = buildPart(part, palette, u, v)
    view.addChild(holder)
    parts.set(name, holder)
  }

  // Added last, so the body and head cover the limbs that pass behind them.
  const body = new Graphics()
  drawShapes(
    body,
    { ellipses: art.ellipses, circles: art.circles, polygons: art.polygons },
    palette,
    u,
    v
  )
  view.addChild(body)

  return {
    view,
    width: Math.round(art.box * u),
    height: Math.round(boxHeight * v),
    u,
    v,
    parts
  }
}

function buildPart(part: ArtPart, palette: ArtPalette, u: number, v: number): Container {
  const holder = new Container()
  const pivotX = part.pivotX * u
  const pivotY = part.pivotY * v
  holder.pivot.set(pivotX, pivotY)
  holder.position.set(pivotX, pivotY)
  const shapes = new Graphics()
  drawShapes(shapes, part.shapes, palette, u, v)
  holder.addChild(shapes)
  return holder
}

/**
 * Placeholder cat built from the shared art description, so the Catdex window and
 * the overlay always draw the same cat. Real sprite sheets implement this same
 * interface and swap in without touching the actors or the director.
 */
export function createPeekSprite(definition: CatDefinition, scale = SPRITE_SCALE): CatSprite {
  const art = artForSprite(definition.sprite)
  const built = buildCat(art, RARITY_PALETTES[definition.rarity], CAT_BASE_SIZE * scale)

  let frame: CatFrame = 'peeking'
  let elapsed = 0

  return {
    view: built.view,
    width: built.width,
    height: built.height,
    setFrame(next: CatFrame) {
      frame = next
      built.view.alpha = next === 'peekOut' ? 0.85 : 1
    },
    tick(ms: number) {
      elapsed += ms
      built.view.pivot.y = frame === 'peeking' ? Math.sin(elapsed / 700) * (0.4 * built.u) : 0
    },
    destroy() {
      built.view.destroy({ children: true })
    }
  }
}

/**
 * The top scratcher: both paws clamped over the screen edge, paws taking turns
 * reaching and the tail swaying while it works its way down. Claw marks trail
 * above it on a separate layer so they stay on the edge once it lets go.
 */
export function createScratchSprite(definition: CatDefinition, scale = SPRITE_SCALE): TrailSprite {
  const palette = RARITY_PALETTES[definition.rarity]
  const art = artForSprite(definition.sprite)
  const built = buildCat(art, palette, CAT_BASE_SIZE * scale)

  // The art says where the paws grip; the marks follow them.
  const clawX = (art.clawX ?? []).map((x) => x * built.u)
  const marks = new Graphics()
  const trailView = new Container()
  trailView.addChild(marks)

  const armL = built.parts.get(ARM_L)
  const armR = built.parts.get(ARM_R)
  const tail = built.parts.get(TAIL)

  let frame: CatFrame = 'enter'
  let elapsed = 0
  let trailPx = 0
  let drawnTrailPx = -1
  let fading = false
  let fadeMs = 0

  function drawMarks(): void {
    marks.clear()
    if (trailPx < 2) return
    for (const x of clawX) {
      for (const [index, offset] of CLAW_OFFSETS.entries()) {
        const length = trailPx * CLAW_LENGTHS[index]
        marks.moveTo(x + offset, -length).lineTo(x + offset, 0)
      }
    }
    marks.stroke({ color: palette.ink, width: CLAW_WIDTH_PX, alpha: CLAW_ALPHA, cap: 'round' })
  }

  /** The cat only strains and sways once it is actually on the move. */
  function straining(): boolean {
    return frame === 'scratch' || frame === 'fall'
  }

  return {
    view: built.view,
    trailView,
    width: built.width,
    height: built.height,
    setFrame(next: CatFrame) {
      frame = next
      if (next === 'removed') built.view.visible = false
    },
    setTrail(lengthPx: number) {
      trailPx = Math.max(0, lengthPx)
      // redrawing every frame buys nothing; a pixel of drift is invisible
      if (Math.abs(trailPx - drawnTrailPx) < 2) return
      drawnTrailPx = trailPx
      drawMarks()
    },
    fadeTrail() {
      fading = true
    },
    tick(ms: number) {
      elapsed += ms

      // paws take turns reaching, the tail keeps its own slower time
      const reach = straining()
        ? Math.sin((elapsed / REACH_PERIOD_MS) * Math.PI * 2) * 0.14
        : 0
      if (armL) armL.rotation = reach
      if (armR) armR.rotation = -reach
      if (tail) tail.rotation = straining() ? Math.sin((elapsed / TAIL_SWAY_PERIOD_MS) * Math.PI * 2) * 0.2 : 0

      if (fading) {
        fadeMs += ms
        trailView.alpha = Math.max(0, 1 - fadeMs / SCRATCH_TRAIL_FADE_MS)
      }
    },
    destroy() {
      built.view.destroy({ children: true })
      trailView.destroy({ children: true })
    }
  }
}