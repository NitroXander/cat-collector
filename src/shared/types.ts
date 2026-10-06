import { SAVE_VERSION } from './constants'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'
export type Anchor = 'corner' | 'bottom' | 'side' | 'top'
/** How a cat uses its anchor: peek in and out, or grip the edge and scratch down. */
export type CatBehaviour = 'peeker' | 'scratcher'
export type SpawnRate = 'chill' | 'normal' | 'busy'
export type MonitorScope = 'all' | 'primary'

export interface CatTraits {
  shyness: number
  curiosity: number
  clumsiness: number
  speed: number
}

export interface CatDefinition {
  id: string
  name: string
  rarity: Rarity
  sprite: string
  behaviour: CatBehaviour
  anchors: Anchor[]
  traits: CatTraits
  difficulty: number
  timeOfDay: string | null
  flavor: string
}

export interface CaughtEntry {
  count: number
  firstCaughtAt: string
}

export interface SaveStats {
  totalCaptures: number
  misses: number
  ripsWitnessed: number
  streakDays: number
  lastPlayedDay: string | null
}

export interface SaveSettings {
  spawnRate: SpawnRate
  volume: number
  quietMode: boolean
  autostart: boolean
  monitors: MonitorScope
}

export interface SaveInventory {
  coins: number
  tools: Record<string, number>
  cosmetics: string[]
}

export interface SaveV1 {
  version: typeof SAVE_VERSION
  caught: Record<string, CaughtEntry>
  inventory: SaveInventory
  stats: SaveStats
  achievements: Record<string, { unlockedAt: string }>
  settings: SaveSettings
}

export type SaveFile = SaveV1

export interface CaptureResult {
  catId: string
  success: boolean
  coins: number
}

export interface DisplayInfo {
  x: number
  y: number
  width: number
  height: number
  scaleFactor: number
}

export interface AppRuntimeState {
  paused: boolean
  captureEnabled: boolean
}