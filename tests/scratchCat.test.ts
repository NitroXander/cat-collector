import { describe, expect, it } from 'vitest'
import type { Container } from 'pixi.js'
import {
  FRAME_MS,
  MISSES_BEFORE_FLEE,
  SCRATCH_CAPTURED_MS,
  SCRATCH_ENTER_MS,
  SCRATCH_GRIP_MS,
  SCRATCH_RIP_KEEP_CLEAR_PX,
  SCRATCH_RIP_MIN_TRAVEL_PX,
  SCRATCH_SPEED_FLOOR,
  SCRATCH_SPEED_PX_S
} from '@shared/constants'
import type { CatDefinition } from '@shared/types'
import { EDGE_MARGIN, resolvePlacement, type Bounds } from '@renderer/cats/placements'
import { ScratchCat, ripChance, rollRipY } from '@renderer/cats/ScratchCat'
import type { CatFrame, TrailSprite } from '@renderer/cats/sprite'

const SCREEN: Bounds = { width: 1920, height: 1032 }
const SPRITE = { width: 96, height: 123 }
const GRIP_Y = EDGE_MARGIN
const END_Y = SCREEN.height - EDGE_MARGIN - SPRITE.height

/** The actor only ever writes to these fields, so this stands in for a Pixi node. */
class FakeNode {
  x = 0
  y = 0
  alpha = 1
  visible = true
  rotation = 0
  pivot = vec2()
  position = vec2()
  scale = uniform()
}

function vec2(): { x: number; y: number; set(x: number, y: number): void } {
  return {
    x: 0,
    y: 0,
    set(x: number, y: number) {
      this.x = x
      this.y = y
    }
  }
}

function uniform(): { x: number; y: number; set(value: number): void } {
  return {
    x: 1,
    y: 1,
    set(value: number) {
      this.x = value
      this.y = value
    }
  }
}

class StubSprite implements TrailSprite {
  readonly fakeView = new FakeNode()
  readonly fakeTrail = new FakeNode()
  readonly view = this.fakeView as unknown as Container
  readonly trailView = this.fakeTrail as unknown as Container
  readonly width = SPRITE.width
  readonly height = SPRITE.height

  trail = 0
  fadeCount = 0
  frames: CatFrame[] = []
  destroyed = false

  setFrame(frame: CatFrame): void {
    this.frames.push(frame)
  }
  setTrail(lengthPx: number): void {
    this.trail = lengthPx
  }
  fadeTrail(): void {
    this.fadeCount += 1
  }
  tick(): void {}
  destroy(): void {
    this.destroyed = true
  }
}

function definition(overrides: Partial<CatDefinition> = {}): CatDefinition {
  return {
    id: 'top-scratcher',
    name: 'Top Scratcher',
    rarity: 'uncommon',
    sprite: 'top-scratcher',
    behaviour: 'scratcher',
    anchors: ['top'],
    traits: { shyness: 0.2, curiosity: 0.9, clumsiness: 0, speed: 0.5 },
    difficulty: 0.3,
    timeOfDay: null,
    flavor: '',
    ...overrides
  }
}

/** A deterministic stand-in for Math.random, cycling through the given values. */
function sequence(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

interface Harness {
  cat: ScratchCat
  sprite: StubSprite
  rips: number[]
}

function makeCat(
  options: { rng?: () => number; cat?: CatDefinition } = {}
): Harness {
  const rng = options.rng ?? (() => 1)
  const def = options.cat ?? definition()
  const sprite = new StubSprite()
  const rips: number[] = []
  const cat = new ScratchCat({
    definition: def,
    placement: resolvePlacement('top', SCREEN, SPRITE, rng),
    sprite,
    bounds: SCREEN,
    rng,
    onRip: (progress) => rips.push(progress)
  })
  return { cat, sprite, rips }
}

/** Runs fixed frames until `done` holds, so no test depends on one long dt. */
function stepUntil(cat: ScratchCat, done: (cat: ScratchCat) => boolean, maxFrames = 4000): boolean {
  for (let i = 0; i < maxFrames; i += 1) {
    cat.update(FRAME_MS)
    if (done(cat)) return true
  }
  return false
}

/** Runs whole frames covering `ms`, so no assertion lands on a rounding seam. */
function run(cat: ScratchCat, ms: number): void {
  const frames = Math.ceil(ms / FRAME_MS)
  for (let i = 0; i < frames; i += 1) cat.update(FRAME_MS)
}

describe('ScratchCat entrance', () => {
  it('starts above the screen and is not catchable on the way in', () => {
    const { cat } = makeCat()
    expect(cat.bounds.y).toBe(-SPRITE.height)
    expect(cat.capturable).toBe(false)

    run(cat, SCRATCH_ENTER_MS / 2)
    expect(cat.state).toBe('enter')
    expect(cat.bounds.y).toBeGreaterThan(-SPRITE.height)
    expect(cat.bounds.y).toBeLessThan(GRIP_Y)
  })

  it('ends up gripping the very top of the screen', () => {
    const { cat, sprite } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'grip')).toBe(true)
    expect(cat.bounds.y).toBe(GRIP_Y)
    // the marks belong to the edge, so they are positioned once and left there
    expect(sprite.fakeTrail.position.y).toBe(GRIP_Y)
  })

  it('grips before it starts scratching, and leaves no marks while it grips', () => {
    const { cat, sprite } = makeCat()
    run(cat, SCRATCH_ENTER_MS + SCRATCH_GRIP_MS - FRAME_MS)
    expect(cat.state).toBe('grip')
    expect(cat.bounds.y).toBe(GRIP_Y)
    expect(sprite.trail).toBe(0)
    expect(cat.capturable).toBe(true)
  })
})

describe('ScratchCat descent', () => {
  it('works down the screen at the configured pace', () => {
    const { cat } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'scratch')).toBe(true)
    const start = cat.bounds.y

    run(cat, 1_000)
    const travelled = cat.bounds.y - start
    expect(travelled).toBeGreaterThan(SCRATCH_SPEED_PX_S * SCRATCH_SPEED_FLOOR * 0.95)
    expect(travelled).toBeLessThan(SCRATCH_SPEED_PX_S * 1.05)
  })

  it('leaves claw marks above it, never longer than it has travelled', () => {
    const { cat, sprite } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'scratch')).toBe(true)
    run(cat, 1_500)
    expect(cat.state).toBe('scratch')
    expect(sprite.trail).toBeGreaterThan(0)
    expect(sprite.trail).toBeLessThanOrEqual(cat.bounds.y - GRIP_Y)
  })

  it('is catchable the whole way down, and not after it lets go', () => {
    const { cat } = makeCat()
    let wasCatchable = false
    stepUntil(cat, (current) => {
      if (current.state === 'fall') return true
      wasCatchable ||= current.capturable
      return false
    })
    expect(wasCatchable).toBe(true)
    expect(cat.capturable).toBe(false)
    expect(cat.state).toBe('fall')
  })

  it('lets go at the bottom and leaves the screen for good', () => {
    const { cat, sprite } = makeCat()
    expect(stepUntil(cat, (current) => current.removed)).toBe(true)
    expect(sprite.fadeCount).toBeGreaterThan(0)
    expect(sprite.destroyed).toBe(false)
  })

  it('keeps going once removed, without moving further', () => {
    const { cat } = makeCat()
    stepUntil(cat, (current) => current.removed)
    const resting = cat.bounds.y
    cat.update(FRAME_MS)
    expect(cat.bounds.y).toBe(resting)
  })
})

describe('ScratchCat rips', () => {
  const clumsy = definition({
    traits: { shyness: 0.2, curiosity: 0.9, clumsiness: 0.9, speed: 0.5 }
  })

  it('reports a rip once, part way down, then drops', () => {
    // placement, rip roll (below the chance), rip distance
    const { cat, rips } = makeCat({ rng: sequence([0.5, 0.05, 0.5]), cat: clumsy })
    expect(stepUntil(cat, (current) => current.removed)).toBe(true)

    expect(rips).toHaveLength(1)
    expect(rips[0]).toBeGreaterThan(0.2)
    expect(rips[0]).toBeLessThan(0.9)
    expect(cat.state).toBe('removed')
  })

  it('survives a lucky cat all the way to the bottom', () => {
    const { cat, rips } = makeCat({ rng: sequence([0.5, 0.9, 0.5]), cat: clumsy })
    expect(stepUntil(cat, (current) => current.removed)).toBe(true)
    expect(rips).toHaveLength(0)
  })

  it('never rips straight away or right at the bottom', () => {
    let roll = 0
    const rng = () => {
      roll += 1
      return roll % 2 === 1 ? 0.05 : 1
    }
    for (let i = 0; i < 200; i += 1) {
      const y = rollRipY(rng, 1, GRIP_Y, END_Y)
      if (y === null) continue
      expect(y).toBeGreaterThanOrEqual(GRIP_Y + SCRATCH_RIP_MIN_TRAVEL_PX)
      expect(y).toBeLessThanOrEqual(END_Y - SCRATCH_RIP_KEEP_CLEAR_PX)
    }
  })

  it('weights the rip chance by clumsiness', () => {
    expect(ripChance(1)).toBeGreaterThan(ripChance(0.5))
    expect(ripChance(0.5)).toBeGreaterThan(ripChance(0))
    expect(ripChance(0)).toBeGreaterThan(0)
  })
})

describe('ScratchCat misses and catches', () => {
  it('holds on through two misses, then lets go', () => {
    const { cat, sprite } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'grip')).toBe(true)

    cat.flinch()
    cat.flinch()
    expect(cat.misses).toBe(2)
    expect(cat.state).toBe('grip')

    cat.flinch()
    expect(cat.misses).toBe(MISSES_BEFORE_FLEE)
    expect(cat.state).toBe('fall')
    expect(sprite.fadeCount).toBeGreaterThan(0)
  })

  it('stops missing him off once he is already gone', () => {
    const { cat } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'scratch')).toBe(true)
    run(cat, 2_000)
    cat.collect()
    cat.flinch()
    expect(cat.state).toBe('captured')
  })

  it('carries a collected cat off toward the corner, then removes him', () => {
    const { cat, sprite } = makeCat()
    expect(stepUntil(cat, (current) => current.state === 'scratch')).toBe(true)
    run(cat, 1_000)
    const marksAtCatch = sprite.trail

    cat.collect()
    expect(cat.state).toBe('captured')
    expect(cat.capturable).toBe(false)
    expect(sprite.fadeCount).toBe(1)

    const startX = cat.bounds.x
    const startY = cat.bounds.y
    run(cat, SCRATCH_CAPTURED_MS / 2)
    expect(cat.bounds.x).toBeGreaterThan(startX)
    expect(cat.bounds.y).toBeGreaterThan(startY)
    expect(sprite.fakeView.scale.x).toBeLessThan(1)
    // the marks stay on the edge while he shrinks away
    expect(sprite.trail).toBe(marksAtCatch)

    expect(stepUntil(cat, (current) => current.removed)).toBe(true)
  })
})