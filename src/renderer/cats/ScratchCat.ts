import type { Container } from 'pixi.js'
import type { CatDefinition } from '@shared/types'
import {
  MISSES_BEFORE_FLEE,
  SCRATCH_CAPTURED_MS,
  SCRATCH_CARRY_OFF_PX,
  SCRATCH_ENTER_MS,
  SCRATCH_FALL_ACCEL_PX_S2,
  SCRATCH_FALL_CLEAR_PX,
  SCRATCH_GRIP_MS,
  SCRATCH_RIP_CHANCE,
  SCRATCH_RIP_KEEP_CLEAR_PX,
  SCRATCH_RIP_MIN_TRAVEL_PX,
  SCRATCH_SPEED_FLOOR,
  SCRATCH_SPEED_PX_S,
  SCRATCH_SPEED_WOBBLE_HZ
} from '@shared/constants'
import type { Rect } from '../overlay/hitTest'
import { EDGE_MARGIN, type Bounds, type Placement } from './placements'
import { Flinch, clamp01, easeOutCubic, lerp } from './motion'
import type { TrailSprite } from './sprite'

export type ScratchState = 'enter' | 'grip' | 'scratch' | 'fall' | 'captured' | 'removed'

export interface ScratchCatOptions {
  definition: CatDefinition
  placement: Placement
  sprite: TrailSprite
  bounds: Bounds
  rng?: () => number
  /** Called once, if this cat tears the screen instead of letting go at the bottom. */
  onRip?: (progress: number, bounds: Rect) => void
}

/** Chance a given cat rips the screen, weighted by how clumsy it is. */
export function ripChance(clumsiness: number): number {
  return SCRATCH_RIP_CHANCE * (0.5 + clumsiness)
}

/**
 * Where this cat gives up and rips the screen, or null when it hangs on to the
 * bottom. Kept out of the constructor so the odds can be reasoned about on their own.
 */
export function rollRipY(
  rng: () => number,
  clumsiness: number,
  gripY: number,
  endY: number
): number | null {
  if (rng() >= ripChance(clumsiness)) return null

  const travel = Math.max(0, endY - gripY)
  const span = Math.max(0, travel - SCRATCH_RIP_MIN_TRAVEL_PX - SCRATCH_RIP_KEEP_CLEAR_PX)
  return gripY + Math.min(travel, SCRATCH_RIP_MIN_TRAVEL_PX + rng() * span)
}

/**
 * The top-edge scratcher. He drops his claws over the top of the screen, grips it,
 * then works his way down leaving claw marks, until he is collected, rips the screen
 * and drops off, or reaches the bottom and lets go.
 *
 * Behaviour follows `whisker_edge_top_scratcher_cat.html`.
 */
export class ScratchCat {
  readonly definition: CatDefinition
  readonly placement: Placement
  readonly sprite: TrailSprite
  readonly views: readonly Container[]

  state: ScratchState = 'enter'
  misses = 0

  private readonly screen: Bounds
  private readonly gripY: number
  private readonly endY: number
  private readonly ripAtY: number | null
  private readonly speedPxS: number
  private readonly onRip: ScratchCatOptions['onRip']
  private readonly shudder = new Flinch()

  /** Never resets: the pace wobble and the limb animation read the same clock. */
  private clockMs = 0
  private elapsed = 0
  private fallSpeed = 0
  private carryOffX = 0
  private carryOffY = 0
  private left = 0
  private top = 0

  constructor(options: ScratchCatOptions) {
    this.definition = options.definition
    this.placement = options.placement
    this.sprite = options.sprite
    this.views = [options.sprite.trailView, options.sprite.view]
    this.screen = options.bounds
    this.gripY = options.placement.y
    this.endY = options.bounds.height - EDGE_MARGIN - options.sprite.height
    this.speedPxS = SCRATCH_SPEED_PX_S * (0.8 + options.definition.traits.speed * 0.4)
    this.onRip = options.onRip

    const rng = options.rng ?? Math.random
    this.ripAtY = rollRipY(rng, options.definition.traits.clumsiness, this.gripY, this.endY)

    // The marks belong to the edge, not to the cat: one position, set once.
    this.sprite.trailView.position.set(options.placement.x, this.gripY)
    this.left = options.placement.fromX
    this.top = options.placement.fromY
    this.applyPosition(this.left, this.top)
    this.sprite.setFrame('enter')
  }

  get bounds(): Rect {
    return { x: this.left, y: this.top, width: this.sprite.width, height: this.sprite.height }
  }

  get capturable(): boolean {
    return this.state === 'grip' || this.state === 'scratch'
  }

  get removed(): boolean {
    return this.state === 'removed'
  }

  /** How far down the screen he has worked: 0 at the edge, 1 at the bottom. */
  get progress(): number {
    const travel = this.endY - this.gripY
    if (travel <= 0) return 0
    return clamp01((this.top - this.gripY) / travel)
  }

  update(dtMs: number): void {
    if (this.state === 'removed') return
    this.clockMs += dtMs
    this.elapsed += dtMs
    this.sprite.tick(dtMs)

    switch (this.state) {
      case 'enter': {
        const t = clamp01(this.elapsed / SCRATCH_ENTER_MS)
        const y = lerp(this.placement.fromY, this.gripY, easeOutCubic(t))
        this.applyPosition(this.placement.x, y)
        if (t >= 1) this.transition('grip')
        break
      }
      case 'grip': {
        this.applyPosition(this.placement.x, this.gripY)
        this.sprite.setTrail(0)
        if (this.elapsed >= SCRATCH_GRIP_MS) this.transition('scratch')
        break
      }
      case 'scratch': {
        this.scratchDown(dtMs)
        break
      }
      case 'fall': {
        this.fallSpeed += SCRATCH_FALL_ACCEL_PX_S2 * (dtMs / 1000)
        const next = this.top + this.fallSpeed * (dtMs / 1000)
        this.applyPosition(this.placement.x, next)
        if (next > this.screen.height + SCRATCH_FALL_CLEAR_PX) this.transition('removed')
        break
      }
      case 'captured': {
        this.carryOff()
        break
      }
    }

    this.shudder.update(dtMs, this.sprite, this.elapsed)
  }

  /**
   * A missed catch: he shudders, and after too many misses he lets go rather than
   * risk the screen.
   */
  flinch(): void {
    this.misses += 1
    this.shudder.trigger()
    if (this.misses >= MISSES_BEFORE_FLEE && this.capturable) this.letGo()
  }

  /** A successful catch: he is carried off toward the corner and shrinks away. */
  collect(): void {
    this.carryOffX = this.placement.x + this.sprite.width / 2
    this.carryOffY = this.top + this.sprite.height / 2
    this.transition('captured')
  }

  destroy(): void {
    this.sprite.destroy()
  }

  private scratchDown(dtMs: number): void {
    const wobble =
      SCRATCH_SPEED_FLOOR +
      (1 - SCRATCH_SPEED_FLOOR) *
        (0.5 + 0.5 * Math.sin((this.clockMs / 1000) * Math.PI * 2 * SCRATCH_SPEED_WOBBLE_HZ))
    const next = this.top + this.speedPxS * wobble * (dtMs / 1000)

    this.sprite.setTrail(Math.max(0, next - this.gripY))
    this.applyPosition(this.placement.x, next)

    if (this.ripAtY !== null && next >= this.ripAtY) {
      this.onRip?.(this.progress, this.bounds)
      this.letGo()
      return
    }
    if (next >= this.endY) this.letGo()
  }

  private carryOff(): void {
    const t = clamp01(this.elapsed / SCRATCH_CAPTURED_MS)
    const eased = t * t
    const centreX = lerp(this.carryOffX, this.screen.width - SCRATCH_CARRY_OFF_PX, eased)
    const centreY = lerp(this.carryOffY, this.screen.height - SCRATCH_CARRY_OFF_PX, eased)
    const scale = 1 - 0.8 * eased

    // Shrink about his middle, the way a net lifts him away.
    this.sprite.view.pivot.set(this.sprite.width / 2, this.sprite.height / 2)
    this.sprite.view.position.set(centreX, centreY)
    this.sprite.view.scale.set(scale)
    this.sprite.view.alpha = 1 - 0.6 * eased

    this.left = centreX - (this.sprite.width * scale) / 2
    this.top = centreY - (this.sprite.height * scale) / 2

    if (t >= 1) this.transition('removed')
  }

  private letGo(): void {
    this.transition('fall')
  }

  private transition(next: ScratchState): void {
    this.state = next
    this.elapsed = 0
    if (next === 'fall' || next === 'captured' || next === 'removed') this.sprite.fadeTrail()
    this.sprite.setFrame(next)
  }

  private applyPosition(left: number, top: number): void {
    this.left = left
    this.top = top
    this.sprite.view.x = left
    this.sprite.view.y = top
  }
}