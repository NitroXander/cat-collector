import { describe, expect, it } from 'vitest'
import { Director, RARITY_WEIGHTS, anchorWeights, pickAnchor } from '@renderer/cats/director'
import type { CatDefinition } from '@shared/types'

function cat(id: string, rarity: CatDefinition['rarity']): CatDefinition {
  return {
    id,
    name: id,
    rarity,
    sprite: id,
    behaviour: 'peeker',
    anchors: ['corner'],
    traits: { shyness: 0.5, curiosity: 0.5, clumsiness: 0.5, speed: 0.5 },
    difficulty: 0.2,
    timeOfDay: null,
    flavor: ''
  }
}

const CATS = [cat('a', 'common'), cat('b', 'uncommon'), cat('c', 'rare')]

describe('Director', () => {
  it('respects the max on screen limit', () => {
    const director = new Director({ spawnRate: 'normal', maxOnScreen: 2, now: () => 0 })
    expect(director.ready(1)).toBe(true)
    expect(director.ready(2)).toBe(false)
  })

  it('never picks the same cat twice in a row', () => {
    const director = new Director({ spawnRate: 'normal', rng: () => 0.5, now: () => 0 })
    const first = director.pick(CATS)
    const second = director.pick(CATS)
    expect(first?.id).not.toBe(second?.id)
  })

  it('falls back to the full pool when only one cat exists', () => {
    const director = new Director({ spawnRate: 'normal', rng: () => 0.5, now: () => 0 })
    const only = [CATS[0]]
    expect(director.pick(only)?.id).toBe('a')
    expect(director.pick(only)?.id).toBe('a')
  })

  it('returns null for an empty catalog', () => {
    const director = new Director({ spawnRate: 'normal', now: () => 0 })
    expect(director.pick([])).toBeNull()
  })

  it('rolls rares above commons over many samples', () => {
    const director = new Director({ spawnRate: 'normal', now: () => 0 })
    const counts: Record<string, number> = {}
    for (let i = 0; i < 4000; i += 1) {
      const picked = director.pick(CATS)
      if (picked) counts[picked.id] = (counts[picked.id] ?? 0) + 1
    }
    expect(counts['a']).toBeGreaterThan(counts['c'])
    expect(Object.values(RARITY_WEIGHTS)).toHaveLength(4)
  })

  it('schedules the next spawn inside the configured window', () => {
    let time = 0
    const director = new Director({ spawnRate: 'chill', now: () => time, rng: () => 1 })
    director.scheduleNext()
    expect(director.snapshot(0).nextSpawnInMs).toBeGreaterThanOrEqual(120_000)
    time += 120_000
    expect(director.snapshot(0).nextSpawnInMs).toBe(120_000)
  })
})

function withTraits(shyness: number): CatDefinition {
  return {
    ...cat('t', 'common'),
    anchors: ['corner', 'bottom', 'side', 'top'],
    traits: { shyness, curiosity: 0.5, clumsiness: 0.5, speed: 0.5 }
  }
}

describe('pickAnchor', () => {
  it('only returns anchors the cat allows', () => {
    const only = { ...cat('a', 'common'), anchors: ['top'] as const }
    for (let i = 0; i < 100; i += 1) {
      expect(pickAnchor({ ...only, anchors: ['top'] })).toBe('top')
    }
  })

  it('eventually uses every allowed anchor', () => {
    const shy = withTraits(0.5)
    const seen = new Set<string>()
    for (let i = 0; i < 500; i += 1) seen.add(pickAnchor(shy))
    expect(seen).toEqual(new Set(['corner', 'bottom', 'side', 'top']))
  })

  it('makes a shy cat peek more than it hangs', () => {
    const weights = anchorWeights(withTraits(0.9))
    expect(weights.corner).toBeGreaterThan(weights.top)
    expect(weights.side).toBeGreaterThan(weights.top)
  })

  it('makes a bold cat hang more than it peeks', () => {
    const weights = anchorWeights(withTraits(0.1))
    expect(weights.top).toBeGreaterThan(weights.corner)
    expect(weights.bottom).toBeGreaterThan(weights.side)
  })

  it('prefers corners for shy cats over many rolls', () => {
    const shy = withTraits(0.95)
    const counts: Record<string, number> = {}
    for (let i = 0; i < 2000; i += 1) {
      const anchor = pickAnchor(shy)
      counts[anchor] = (counts[anchor] ?? 0) + 1
    }
    expect(counts['corner']).toBeGreaterThan(counts['top'])
    expect(counts['side']).toBeGreaterThan(counts['top'])
  })

  it('is deterministic for a given roll', () => {
    const bold = withTraits(0.2)
    expect(pickAnchor(bold, () => 0)).toBe(pickAnchor(bold, () => 0))
    expect(pickAnchor(bold, () => 0.999999)).toBe('top')
  })
})