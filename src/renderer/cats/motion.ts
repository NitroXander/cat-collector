/**
 * Shared motion for every cat actor: the easings both state machines use, and the
 * shudder a cat gives when a catch misses. Keeping it here means a peeker and a
 * scratcher react to a miss in exactly the same way.
 */
import type { CatSprite } from './sprite'

export const FLINCH_MS = 260

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t)
}

/**
 * A one-shot shudder. `trigger()` starts it, `update()` runs it down; the caller
 * re-applies the cat's position every frame, so the offset never accumulates.
 */
export class Flinch {
  private remaining = 0

  get active(): boolean {
    return this.remaining > 0
  }

  trigger(): void {
    this.remaining = FLINCH_MS
  }

  update(dtMs: number, sprite: CatSprite, elapsedMs: number): void {
    if (this.remaining <= 0) return
    this.remaining = Math.max(0, this.remaining - dtMs)
    const strength = (this.remaining / FLINCH_MS) * 5
    sprite.view.x += Math.sin(elapsedMs / 16) * strength
  }
}