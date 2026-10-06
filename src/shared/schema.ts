import { z } from 'zod'
import { SAVE_VERSION } from './constants'
import type { SaveFile } from './types'

export const raritySchema = z.enum(['common', 'uncommon', 'rare', 'legendary'])
export const anchorSchema = z.enum(['corner', 'bottom', 'side', 'top'])
export const behaviourSchema = z.enum(['peeker', 'scratcher'])
export const spawnRateSchema = z.enum(['chill', 'normal', 'busy'])

const traitsSchema = z.object({
  shyness: z.number().min(0).max(1),
  curiosity: z.number().min(0).max(1),
  clumsiness: z.number().min(0).max(1),
  speed: z.number().min(0).max(1)
})

export const catDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: raritySchema,
  sprite: z.string().min(1),
  behaviour: behaviourSchema,
  anchors: z.array(anchorSchema).min(1),
  traits: traitsSchema,
  difficulty: z.number().min(0).max(1),
  timeOfDay: z.string().nullable(),
  flavor: z.string()
})

export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  caught: z.record(
    z.string(),
    z.object({
      count: z.number().int().min(0),
      firstCaughtAt: z.string()
    })
  ),
  inventory: z.object({
    coins: z.number().min(0),
    tools: z.record(z.string(), z.number().int().min(0)),
    cosmetics: z.array(z.string())
  }),
  stats: z.object({
    totalCaptures: z.number().int().min(0),
    misses: z.number().int().min(0),
    ripsWitnessed: z.number().int().min(0),
    streakDays: z.number().int().min(0),
    lastPlayedDay: z.string().nullable()
  }),
  achievements: z.record(z.string(), z.object({ unlockedAt: z.string() })),
  settings: z.object({
    spawnRate: spawnRateSchema,
    volume: z.number().min(0).max(1),
    quietMode: z.boolean(),
    autostart: z.boolean(),
    monitors: z.enum(['all', 'primary'])
  })
})

export function defaultSave(): SaveFile {
  return {
    version: SAVE_VERSION,
    caught: {},
    inventory: { coins: 0, tools: {}, cosmetics: [] },
    stats: {
      totalCaptures: 0,
      misses: 0,
      ripsWitnessed: 0,
      streakDays: 0,
      lastPlayedDay: null
    },
    achievements: {},
    settings: {
      spawnRate: 'normal',
      volume: 0.6,
      quietMode: false,
      autostart: false,
      monitors: 'primary'
    }
  }
}

export function parseSave(raw: unknown): { ok: true; value: SaveFile } | { ok: false; error: string } {
  const result = saveSchema.safeParse(raw)
  if (result.success) return { ok: true, value: result.data as SaveFile }
  return { ok: false, error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }
}