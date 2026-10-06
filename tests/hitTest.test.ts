import { describe, expect, it } from 'vitest'
import { hitRect, hitShape } from '@renderer/overlay/hitTest'
import { EDGE_MARGIN, resolvePlacement } from '@renderer/cats/placements'

const rect = { x: 100, y: 100, width: 96, height: 96 }

describe('hitRect', () => {
  it('accepts points inside and on the edge', () => {
    expect(hitRect(rect, 148, 148)).toBe(true)
    expect(hitRect(rect, 100, 100)).toBe(true)
  })

  it('rejects points outside', () => {
    expect(hitRect(rect, 99, 148)).toBe(false)
    expect(hitRect(rect, 148, 197)).toBe(false)
  })
})

describe('hitShape', () => {
  it('rejects the transparent corners of the bounding box', () => {
    expect(hitRect(rect, 101, 101)).toBe(true)
    expect(hitShape(rect, 101, 101)).toBe(false)
  })

  it('accepts the middle of the sprite', () => {
    expect(hitShape(rect, 148, 148)).toBe(true)
  })

  it('defers to an alpha map when one is supplied', () => {
    expect(hitShape(rect, 148, 148, () => false)).toBe(false)
    expect(hitShape(rect, 101, 101, () => true)).toBe(true)
  })

  it('passes local coordinates to the alpha map', () => {
    let seen: [number, number] | null = null
    hitShape(rect, 148, 148, (x, y) => {
      seen = [x, y]
      return true
    })
    expect(seen).toEqual([48, 48])
  })
})

describe('resolvePlacement', () => {
  const bounds = { width: 1920, height: 1032 }
  const size = { width: 96, height: 96 }
  const ANCHORS = ['corner', 'bottom', 'side', 'top'] as const

  /** A deterministic stand-in for Math.random, cycling through the given values. */
  function sequence(values: number[]): () => number {
    let i = 0
    return () => values[i++ % values.length]
  }

  it('always starts fully off-screen', () => {
    for (const anchor of ANCHORS) {
      for (const rng of [sequence([0, 0]), sequence([0.5, 0.5]), sequence([1, 1])]) {
        const p = resolvePlacement(anchor, bounds, size, rng)
        const off =
          p.fromX + size.width <= 0 ||
          p.fromY + size.height <= 0 ||
          p.fromX >= bounds.width ||
          p.fromY >= bounds.height
        expect(off, `${anchor}`).toBe(true)
      }
    }
  })

  it('always rests fully on screen', () => {
    for (const anchor of ANCHORS) {
      for (const rng of [sequence([0, 0]), sequence([0.5, 0.5]), sequence([1, 1])]) {
        const p = resolvePlacement(anchor, bounds, size, rng)
        expect(p.x, anchor).toBeGreaterThanOrEqual(0)
        expect(p.y, anchor).toBeGreaterThanOrEqual(0)
        expect(p.x + size.width, anchor).toBeLessThanOrEqual(bounds.width)
        expect(p.y + size.height, anchor).toBeLessThanOrEqual(bounds.height)
      }
    }
  })

  it('uses all four corners rather than a fixed one', () => {
    const spots = new Set<string>()
    for (let i = 0; i < 200; i += 1) {
      const p = resolvePlacement('corner', bounds, size)
      spots.add(`${p.x},${p.y}`)
    }
    expect(spots.size).toBe(4)
  })

  it('enters corners from both the left and the right', () => {
    const fromLeft = new Set<number>()
    const fromRight = new Set<number>()
    for (let i = 0; i < 200; i += 1) {
      const p = resolvePlacement('corner', bounds, size)
      if (p.fromX < 0) fromLeft.add(p.y)
      else fromRight.add(p.y)
    }
    expect(fromLeft.size).toBe(2)
    expect(fromRight.size).toBe(2)
  })

  it('spreads bottom and top cats along the whole edge', () => {
    for (const anchor of ['bottom', 'top'] as const) {
      const xs = new Set<number>()
      for (let i = 0; i < 200; i += 1) xs.add(resolvePlacement(anchor, bounds, size).x)
      expect(xs.size, anchor).toBeGreaterThan(20)
      expect(Math.min(...xs), anchor).toBeLessThan(bounds.width / 4)
      expect(Math.max(...xs), anchor).toBeGreaterThan((bounds.width * 3) / 4)
    }
  })

  it('puts side cats on either edge at varied heights', () => {
    const lefts = new Set<number>()
    const rights = new Set<number>()
    for (let i = 0; i < 200; i += 1) {
      const p = resolvePlacement('side', bounds, size)
      if (p.x === EDGE_MARGIN) lefts.add(p.y)
      else rights.add(p.y)
    }
    expect(lefts.size).toBeGreaterThan(10)
    expect(rights.size).toBeGreaterThan(10)
  })

  it('hugs the bottom edge on the bottom anchor', () => {
    const p = resolvePlacement('bottom', bounds, size, sequence([0.5]))
    expect(p.y).toBe(bounds.height - size.height - EDGE_MARGIN)
  })

  it('hugs the top edge on the top anchor', () => {
    const p = resolvePlacement('top', bounds, size, sequence([0.5]))
    expect(p.y).toBe(EDGE_MARGIN)
  })

  it('never throws on a screen smaller than the cat', () => {
    const tiny = { width: 40, height: 40 }
    for (const anchor of ANCHORS) {
      expect(() => resolvePlacement(anchor, tiny, size)).not.toThrow()
    }
  })
})