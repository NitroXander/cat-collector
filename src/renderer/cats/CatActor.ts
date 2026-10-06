import type { Container } from 'pixi.js'
import type { Anchor, CatDefinition } from '@shared/types'
import type { Rect } from '../overlay/hitTest'
import { Cat } from './Cat'
import { resolvePlacement, type Bounds, type Placement } from './placements'
import { ScratchCat } from './ScratchCat'
import { createPeekSprite, createScratchSprite, type CatSprite } from './sprite'

/**
 * Everything a cat on screen has to be, whatever its behaviour. The overlay only
 * ever talks to this, so a new cat type is a new actor plus a data entry.
 */
export interface CatActor {
  readonly definition: CatDefinition
  readonly placement: Placement
  readonly sprite: CatSprite
  /** Every display object the cat owns, so the scene adds and removes them together. */
  readonly views: readonly Container[]
  readonly bounds: Rect
  readonly capturable: boolean
  readonly removed: boolean
  readonly misses: number
  update(dtMs: number): void
  /** A missed catch. */
  flinch(): void
  /** A successful catch. */
  collect(): void
  destroy(): void
}

export interface CatActorOptions {
  definition: CatDefinition
  anchor: Anchor
  bounds: Bounds
  rng?: () => number
  /** Scratchers only: reported once if the cat tears the screen. */
  onRip?: (progress: number, bounds: Rect) => void
}

/**
 * Builds the actor for a cat definition and places it. Behaviour picks the state
 * machine and the sprite; the anchor picks where on the screen it rests.
 */
export function createCatActor(options: CatActorOptions): CatActor {
  const { definition, bounds } = options

  if (definition.behaviour === 'scratcher') {
    const sprite = createScratchSprite(definition)
    return new ScratchCat({
      definition,
      // A scratcher only exists on the top edge, whatever anchors it declares.
      placement: resolvePlacement(
        'top',
        bounds,
        { width: sprite.width, height: sprite.height },
        options.rng
      ),
      sprite,
      bounds,
      rng: options.rng,
      onRip: options.onRip
    })
  }

  const sprite = createPeekSprite(definition)
  return new Cat({
    definition,
    anchor: options.anchor,
    placement: resolvePlacement(
      options.anchor,
      bounds,
      { width: sprite.width, height: sprite.height },
      options.rng
    ),
    sprite,
    rng: options.rng
  })
}