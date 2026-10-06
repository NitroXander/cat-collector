import type { Anchor, CatDefinition } from '@shared/types'
import { MISSES_BEFORE_FLEE } from '@shared/constants'
import type { Container } from 'pixi.js'
import type { Rect } from '../overlay/hitTest'
import type { CatActor } from './CatActor'
import { Flinch, clamp01, easeOut } from './motion'
import type { Placement } from './placements'
import type { CatSprite } from './sprite'

export type CatState = 'peekIn' | 'peeking' | 'peekOut' | 'removed'

export interface CatOptions {
  definition: CatDefinition
  anchor: Anchor
  placement: Placement
  sprite: CatSprite
  rng?: () => number
}

const PEEK_IN_MS = 700
const PEEK_OUT_MS = 700
const PEEK_MIN_MS = 5_000
const PEEK_MAX_MS = 10_000

export class Cat implements CatActor {
  readonly definition: CatDefinition
  readonly anchor: Anchor
  readonly placement: Placement
  readonly sprite: CatSprite

  state: CatState = 'peekIn'
  misses = 0

  private readonly shudder = new Flinch()
  private elapsed = 0
  private dwellMs = PEEK_MIN_MS

  constructor(options: CatOptions) {
    this.definition = options.definition
    this.anchor = options.anchor
    this.sprite = options.sprite
    this.placement = options.placement
    const rng = options.rng ?? Math.random
    this.dwellMs = PEEK_MIN_MS + rng() * (PEEK_MAX_MS - PEEK_MIN_MS)
    this.applyPosition(0)
    this.sprite.setFrame('peekIn')
  }

  get views(): readonly Container[] {
    return [this.sprite.view]
  }

  get bounds(): Rect {
    return {
      x: this.placement.x,
      y: this.placement.y,
      width: this.sprite.width,
      height: this.sprite.height
    }
  }

  get capturable(): boolean {
    return this.state === 'peeking'
  }

  get removed(): boolean {
    return this.state === 'removed'
  }

  update(dtMs: number): void {
    if (this.state === 'removed') return
    this.elapsed += dtMs
    this.sprite.tick(dtMs)

    switch (this.state) {
      case 'peekIn': {
        const t = clamp01(this.elapsed / PEEK_IN_MS)
        this.applyPosition(easeOut(t))
        if (t >= 1) this.transition('peeking')
        break
      }
      case 'peeking': {
        this.applyPosition(1)
        if (this.elapsed >= this.dwellMs) this.transition('peekOut')
        break
      }
      case 'peekOut': {
        const t = clamp01(this.elapsed / PEEK_OUT_MS)
        this.applyPosition(1 - easeOut(t))
        this.sprite.view.alpha = 1 - t * 0.6
        if (t >= 1) this.transition('removed')
        break
      }
    }

    this.shudder.update(dtMs, this.sprite, this.elapsed)
  }

  /** A missed catch: flinch visibly, and leave after too many misses. */
  flinch(): void {
    this.misses += 1
    this.shudder.trigger()
    if (this.misses >= MISSES_BEFORE_FLEE) {
      this.elapsed = Math.max(this.elapsed, this.dwellMs)
    }
  }

  /** A successful catch: the cat heads off, happy. */
  collect(): void {
    this.transition('peekOut')
  }

  destroy(): void {
    this.sprite.destroy()
  }

  private transition(next: CatState): void {
    this.state = next
    this.elapsed = 0
    if (next === 'peeking') this.sprite.setFrame('peeking')
    if (next === 'peekOut') this.sprite.setFrame('peekOut')
  }

  private applyPosition(progress: number): void {
    const { x, y, fromX, fromY } = this.placement
    this.sprite.view.x = fromX + (x - fromX) * progress
    this.sprite.view.y = fromY + (y - fromY) * progress
  }
}