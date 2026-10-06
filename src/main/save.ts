import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { SAVE_BACKUP, SAVE_FILE } from '@shared/constants'
import { defaultSave, parseSave } from '@shared/schema'
import type { SaveFile } from '@shared/types'

let queue: Promise<unknown> = Promise.resolve()
let cache: SaveFile | null = null

function paths(): { dir: string; file: string; backup: string; temp: string } {
  const dir = app.getPath('userData')
  const file = path.join(dir, SAVE_FILE)
  return { dir, file, backup: path.join(dir, SAVE_BACKUP), temp: `${file}.tmp` }
}

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as unknown
  } catch {
    return null
  }
}

async function readSave(): Promise<SaveFile> {
  const { file, backup } = paths()
  const primary = parseSave(await readJson(file))
  if (primary.ok) return primary.value
  const fallback = parseSave(await readJson(backup))
  if (fallback.ok) return fallback.value
  return defaultSave()
}

async function writeSave(save: SaveFile): Promise<SaveFile> {
  const { file, backup, temp } = paths()
  await fs.mkdir(path.dirname(file), { recursive: true })
  try {
    await fs.copyFile(file, backup)
  } catch {
    /* no existing save to back up */
  }
  await fs.writeFile(temp, JSON.stringify(save, null, 2), 'utf8')
  await fs.rename(temp, file)
  return save
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => undefined)
  return run
}

export function loadSave(): Promise<SaveFile> {
  return enqueue(async () => {
    if (!cache) cache = await readSave()
    return cache
  })
}

export function patchSave(patch: Partial<SaveFile>): Promise<SaveFile> {
  return enqueue(async () => {
    const current = cache ?? (await readSave())
    const next: SaveFile = {
      ...current,
      ...patch,
      version: current.version,
      caught: { ...current.caught, ...(patch.caught ?? {}) },
      inventory: { ...current.inventory, ...(patch.inventory ?? {}) },
      stats: { ...current.stats, ...(patch.stats ?? {}) },
      settings: { ...current.settings, ...(patch.settings ?? {}) },
      achievements: { ...current.achievements, ...(patch.achievements ?? {}) }
    }
    cache = await writeSave(next)
    return cache
  })
}

export function resetSaveCache(): void {
  cache = null
}