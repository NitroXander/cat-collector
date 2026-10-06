import { describe, expect, it } from 'vitest'
import { placeToast } from '@renderer/overlay/toast'

const viewport = { width: 1920, height: 1032 }
const toast = { width: 190, height: 28 }
const cat = { width: 96, height: 96 }

/** The toast's real drawn box, accounting for the -100% Y translate when above. */
function drawnBox(placement: ReturnType<typeof placeToast>) {
  return {
    left: placement.left,
    right: placement.left + toast.width,
    top: placement.below ? placement.top : placement.top - toast.height,
    bottom: placement.below ? placement.top + toast.height : placement.top
  }
}

function expectOnScreen(placement: ReturnType<typeof placeToast>, label: string): void {
  const box = drawnBox(placement)
  expect(box.left, `${label} left`).toBeGreaterThanOrEqual(0)
  expect(box.right, `${label} right`).toBeLessThanOrEqual(viewport.width)
  expect(box.top, `${label} top`).toBeGreaterThanOrEqual(0)
  expect(box.bottom, `${label} bottom`).toBeLessThanOrEqual(viewport.height)
}

describe('placeToast', () => {
  it('puts the toast above a cat with room overhead', () => {
    const p = placeToast({ x: 900, y: 500, ...cat }, toast, viewport)
    expect(p.below).toBe(false)
    expect(p.top).toBe(500 - 12)
  })

  it('flips below a cat on the top edge', () => {
    const p = placeToast({ x: 900, y: 2, ...cat }, toast, viewport)
    expect(p.below).toBe(true)
    expect(p.top).toBe(2 + 96 + 12)
  })

  it('stays on screen for a cat in every corner', () => {
    const spots = [
      { x: 2, y: 2 },
      { x: 1822, y: 2 },
      { x: 2, y: 934 },
      { x: 1822, y: 934 }
    ]
    for (const spot of spots) {
      const p = placeToast({ ...spot, ...cat }, toast, viewport)
      expectOnScreen(p, `${spot.x},${spot.y}`)
    }
  })

  it('stays on screen for a cat on any edge', () => {
    const edges = [
      { x: 0, y: 500 },
      { x: 960, y: 0 },
      { x: 1824, y: 500 },
      { x: 960, y: 936 }
    ]
    for (const spot of edges) {
      expectOnScreen(placeToast({ ...spot, ...cat }, toast, viewport), `${spot.x},${spot.y}`)
    }
  })

  it('clamps a wide toast at the left and right edges', () => {
    const wide = { width: 600, height: 28 }
    const left = placeToast({ x: 0, y: 500, ...cat }, wide, viewport)
    const right = placeToast({ x: 1824, y: 500, ...cat }, wide, viewport)
    expect(drawnBox(left).left).toBeGreaterThanOrEqual(0)
    expect(drawnBox(right).right).toBeLessThanOrEqual(viewport.width)
  })

  it('keeps the toast clear of the cat it describes', () => {
    const p = placeToast({ x: 900, y: 500, ...cat }, toast, viewport)
    expect(p.top).toBeLessThanOrEqual(500)
  })

  it('centres itself when there is no cat to anchor to', () => {
    const p = placeToast(undefined, toast, viewport)
    expect(p.left).toBe(Math.round(viewport.width / 2 - toast.width / 2))
    expectOnScreen(p, 'no anchor')
  })

  it('survives a viewport smaller than the toast', () => {
    const tiny = { width: 80, height: 40 }
    const p = placeToast({ x: 0, y: 0, ...cat }, toast, tiny)
    expect(p.left).toBeGreaterThanOrEqual(0)
    expect(p.top).toBeGreaterThanOrEqual(0)
  })

  it('never returns a fractional pixel', () => {
    const p = placeToast({ x: 913.7, y: 501.2, ...cat }, toast, viewport)
    expect(Number.isInteger(p.left)).toBe(true)
    expect(Number.isInteger(p.top)).toBe(true)
  })
})
