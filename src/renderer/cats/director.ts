import { MAX_CATS_ON_SCREEN, SPAWN_INTERVAL_MAX_MS, SPAWN_INTERVAL_MIN_MS } from '@shared/constants'
import type { Anchor, CatDefinition, Rarity, SpawnRate } from '@shared/types'

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 0.6,
  uncommon: 0.25,
  rare: 0.12,
  legendary: 0.03
}

const SPAWN_INTERVALS: Record<SpawnRate, [number, number]> = {
  chill: [120_000, 240_000],
  normal: [SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MAX_MS],
  busy: [30_000, 75_000]
}

export interface DirectorOptions {
  spawnRate: SpawnRate
  maxOnScreen?: number
  rng?: () => number
  now?: () => number
}

export interface DirectorSnapshot {
  /** ms until the next spawn is allowed, 0 when one is due now */
  nextSpawnInMs: number
  activeCount: number
}

export class Director {
  readonly maxOnScreen: number

  private interval: [number, number]
  private rng: () => number
  private now: () => number
  private nextSpawnAt: number
  private lastSpawnedId: string | null = null

  constructor(options: DirectorOptions) {
    this.rng = options.rng ?? Math.random
    this.now = options.now ?? (() => Date.now())
    this.maxOnScreen = options.maxOnScreen ?? MAX_CATS_ON_SCREEN
    this.interval = SPAWN_INTERVALS[options.spawnRate]
    this.nextSpawnAt = this.now()
  }

  setSpawnRate(rate: SpawnRate): void {
    this.interval = SPAWN_INTERVALS[rate]
  }

  /** True when a spawn is due and there is room on screen. */
  ready(activeCount: number): boolean {
    return activeCount < this.maxOnScreen && this.now() >= this.nextSpawnAt
  }

  /** Picks the next cat, then schedules the following spawn. */
  pick(available: CatDefinition[]): CatDefinition | null {
    if (available.length === 0) return null
    let pool = available.filter((cat) => cat.id !== this.lastSpawnedId)
    if (pool.length === 0) pool = available

    const weighted = pool
      .map((cat) => ({ cat, weight: RARITY_WEIGHTS[cat.rarity] }))
      .filter((entry) => entry.weight > 0)
    if (weighted.length === 0) return null

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0)
    let roll = this.rng() * total
    let chosen = weighted[0].cat
    for (const entry of weighted) {
      roll -= entry.weight
      if (roll <= 0) {
        chosen = entry.cat
        break
      }
    }

    this.lastSpawnedId = chosen.id
    this.scheduleNext()
    return chosen
  }

  scheduleNext(): void {
    const [min, max] = this.interval
    this.nextSpawnAt = this.now() + min + this.rng() * (max - min)
  }

  snapshot(activeCount: number): DirectorSnapshot {
    return {
      nextSpawnInMs: Math.max(0, this.nextSpawnAt - this.now()),
      activeCount
    }
  }
}

/**
 * How much a cat favours each anchor, from its shyness. Shy cats prefer to peek
 * from a corner or side; bolder cats walk the bottom edge or hang from the top.
 */
export function anchorWeights(definition: CatDefinition): Record<Anchor, number> {
  const shyness = definition.traits.shyness
  return {
    corner: 0.6 + shyness,
    side: 0.4 + shyness * 0.8,
    bottom: 1.1 - shyness * 0.6,
    top: 0.9 - shyness * 0.7
  }
}

/** Picks one of the cat's allowed anchors, weighted by personality. */
export function pickAnchor(definition: CatDefinition, rng: () => number = Math.random): Anchor {
  const weights = anchorWeights(definition)
  const allowed = definition.anchors.map((anchor) => ({ anchor, weight: weights[anchor] }))
  const total = allowed.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) return definition.anchors[0]

  let roll = rng() * total
  for (const entry of allowed) {
    roll -= entry.weight
    if (roll <= 0) return entry.anchor
  }
  return allowed[allowed.length - 1].anchor
}
