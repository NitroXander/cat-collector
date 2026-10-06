import { describe, expect, it } from 'vitest'
import { defaultSave, parseSave } from '@shared/schema'
import { SAVE_VERSION } from '@shared/constants'

describe('parseSave', () => {
  it('accepts a fresh default save', () => {
    const result = parseSave(defaultSave())
    expect(result.ok).toBe(true)
  })

  it('rejects a mismatched version', () => {
    const result = parseSave({ ...defaultSave(), version: 99 })
    expect(result.ok).toBe(false)
  })

  it('rejects missing sections', () => {
    const { stats, ...partial } = defaultSave()
    expect(stats.totalCaptures).toBe(0)
    expect(parseSave(partial).ok).toBe(false)
  })

  it('rejects out-of-range settings', () => {
    const save = defaultSave()
    const result = parseSave({ ...save, settings: { ...save.settings, volume: 4 } })
    expect(result.ok).toBe(false)
  })

  it('rejects a malformed caught entry', () => {
    const save = defaultSave()
    const result = parseSave({ ...save, caught: { mochi: { count: -1, firstCaughtAt: 'now' } } })
    expect(result.ok).toBe(false)
  })

  it('reports which field failed', () => {
    const save = defaultSave()
    const result = parseSave({ ...save, settings: { ...save.settings, volume: 4 } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('settings.volume')
  })
})

describe('defaultSave', () => {
  it('is internally consistent', () => {
    const save = defaultSave()
    expect(save.version).toBe(SAVE_VERSION)
    expect(save.caught).toEqual({})
    expect(save.stats.lastPlayedDay).toBeNull()
    expect(save.settings.monitors).toBe('primary')
  })
})
