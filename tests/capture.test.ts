import { describe, expect, it } from 'vitest'
import { BASE_CAPTURE_CHANCE, captureChance, coinValue } from '@renderer/cats/capture'

describe('captureChance', () => {
  it('succeeds with zero difficulty when the roll is under the base chance', () => {
    expect(captureChance(0, 1, () => 0.5)).toBe(true)
  })

  it('succeeds on any roll below the chance', () => {
    expect(captureChance(0, 1, () => 0)).toBe(true)
  })

  it('never exceeds the base chance', () => {
    const roll = BASE_CAPTURE_CHANCE - 0.001
    expect(captureChance(0, 1, () => roll)).toBe(true)
    expect(captureChance(0, 1, () => BASE_CAPTURE_CHANCE)).toBe(false)
  })

  it('gets harder as difficulty rises', () => {
    const roll = 0.9
    expect(captureChance(0, 1, () => roll)).toBe(true)
    expect(captureChance(0.95, 1, () => roll)).toBe(false)
  })

  it('clamps a negative difficulty instead of over-rolling', () => {
    expect(captureChance(-5, 1, () => 0.99)).toBe(true)
  })

  it('still respects the base chance ceiling', () => {
    expect(captureChance(0, 1, () => 0.999)).toBe(false)
  })

  it('is impossible at full difficulty', () => {
    expect(captureChance(1, 1, () => 0)).toBe(false)
  })
})

describe('coinValue', () => {
  it('pays more for rarer cats', () => {
    expect(coinValue('common')).toBeLessThan(coinValue('uncommon'))
    expect(coinValue('uncommon')).toBeLessThan(coinValue('rare'))
    expect(coinValue('rare')).toBeLessThan(coinValue('legendary'))
  })
})