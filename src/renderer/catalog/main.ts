import { CAT_CATALOG, TOTAL_CATS } from '@shared/cats'
import { RARITY_LABEL, RARITY_PALETTES, artForSprite, paintArt } from '@shared/artwork'
import type { CatDefinition, SaveFile } from '@shared/types'

const list = document.getElementById('list') as HTMLUListElement
const caughtEl = document.getElementById('caught') as HTMLElement
const totalEl = document.getElementById('total') as HTMLElement
const barEl = document.getElementById('bar') as HTMLElement
const coinsEl = document.getElementById('coins') as HTMLElement
const capturesEl = document.getElementById('captures') as HTMLElement
const streakEl = document.getElementById('streak') as HTMLElement

const THUMB = 46

function drawThumb(canvas: HTMLCanvasElement, cat: CatDefinition, known: boolean): void {
  const ratio = window.devicePixelRatio || 1
  canvas.width = THUMB * ratio
  canvas.height = THUMB * ratio
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(ratio, ratio)
  const art = artForSprite(cat.sprite)
  if (known) {
    paintArt(ctx, art, RARITY_PALETTES[cat.rarity], THUMB)
  } else {
    ctx.globalAlpha = 0.16
    paintArt(ctx, art, RARITY_PALETTES[cat.rarity], THUMB)
    ctx.globalAlpha = 1
  }
}

function render(save: SaveFile): void {
  const species = CAT_CATALOG.filter((cat) => save.caught[cat.id]).length

  totalEl.textContent = String(TOTAL_CATS)
  caughtEl.textContent = String(species)
  barEl.style.width = `${TOTAL_CATS === 0 ? 0 : (species / TOTAL_CATS) * 100}%`
  coinsEl.textContent = String(save.inventory.coins)
  capturesEl.textContent = String(save.stats.totalCaptures)
  streakEl.textContent = String(save.stats.streakDays)

  list.replaceChildren()

  if (CAT_CATALOG.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'empty'
    empty.textContent = 'No cats in the catalog yet.'
    list.append(empty)
    return
  }

  for (const cat of CAT_CATALOG) {
    const entry = save.caught[cat.id]
    const known = Boolean(entry)

    const row = document.createElement('li')
    if (!known) row.className = 'locked'

    const canvas = document.createElement('canvas')
    drawThumb(canvas, cat, known)

    const meta = document.createElement('div')
    meta.className = 'meta'

    const name = document.createElement('div')
    name.className = 'name'
    if (known) {
      const badge = document.createElement('span')
      badge.className = 'rarity'
      badge.textContent = RARITY_LABEL[cat.rarity]
      badge.style.background = RARITY_PALETTES[cat.rarity].fur
      badge.style.color = '#20191a'
      name.append(badge, cat.name)
    } else {
      name.textContent = '???'
    }

    const flavor = document.createElement('div')
    flavor.className = 'flavor'
    flavor.textContent = known ? cat.flavor : 'Not met yet'

    meta.append(name, flavor)
    row.append(canvas, meta)

    if (known) {
      const tally = document.createElement('span')
      tally.className = 'tally'
      tally.textContent = `x${entry?.count ?? 0}`
      row.append(tally)
    }

    list.append(row)
  }
}

async function boot(): Promise<void> {
  const api = window.whisker
  render(await api.loadSave())
  api.onSaveUpdated(render)
}

void boot().catch((error: unknown) => {
  console.error('catalog boot failed', error)
})
