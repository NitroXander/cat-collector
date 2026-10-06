import type { AppRuntimeState, SaveFile } from '@shared/types'
import { CAT_CATALOG } from '@shared/cats'
import { createCatActor, type CatActor } from '../cats/CatActor'
import { captureChance, coinValue } from '../cats/capture'
import { Director, pickAnchor } from '../cats/director'
import { hitShape, type Rect } from './hitTest'
import { createLoop } from './loop'
import { createScene, type Scene } from './renderer'
import { placeToast } from './toast'

const canvas = document.getElementById('stage') as HTMLCanvasElement
const hint = document.getElementById('hint')
const toastHost = document.getElementById('toasts')

type ToastKind = 'good' | 'bad'

async function boot(): Promise<void> {
  const api = window.whisker
  const display = await api.getDisplay()
  let runtime: AppRuntimeState = await api.getRuntime()
  let save: SaveFile = await api.loadSave()

  const scene: Scene = await createScene(canvas, display.width, display.height)
  const cats = new Set<CatActor>()
  const director = new Director({ spawnRate: save.settings.spawnRate })

  let hovered: CatActor | null = null
  let captureActive = false

  function setHint(visible: boolean): void {
    hint?.classList.toggle('visible', visible)
  }

  /** Single place that owns the click-through state, so it can never get stuck. */
  async function requestCapture(active: boolean): Promise<void> {
    if (captureActive === active) return
    captureActive = active
    setHint(active)
    await api.setMouseCapture(active)
  }

  /**
   * Shows a toast near a cat, flipping below it when there is no room above and
   * clamping horizontally, so a cat on the top edge never pushes it off-screen.
   */
  function toast(text: string, kind: ToastKind, bounds?: Rect): void {
    if (!toastHost) return

    const el = document.createElement('div')
    el.className = `toast ${kind}`
    const label = document.createElement('span')
    label.textContent = text
    el.append(label)

    // measure before positioning, so clamping uses the real size
    el.style.opacity = '0'
    el.style.left = '0px'
    el.style.top = '0px'
    toastHost.append(el)

    const spot = placeToast(
      bounds,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: scene.width, height: scene.height }
    )

    el.classList.toggle('below', spot.below)
    el.style.left = `${spot.left}px`
    el.style.top = `${spot.top}px`
    el.style.opacity = ''

    setTimeout(() => el.remove(), 1_500)
  }

  function clearHover(): void {
    if (!hovered) return
    hovered = null
    void requestCapture(false)
  }

  /** A cat that tore the screen instead of letting go at the bottom. */
  function reportRip(name: string, progress: number, bounds: Rect): void {
    toast(`${name} ripped the screen — ${Math.round(progress * 100)}% of the way down`, 'bad', bounds)
    void api
      .patchSave({ stats: { ...save.stats, ripsWitnessed: save.stats.ripsWitnessed + 1 } })
      .then((next) => {
        save = next
      })
  }

  function spawn(): void {
    const definition = director.pick(CAT_CATALOG)
    if (!definition) return
    const anchor = pickAnchor(definition)
    const cat = createCatActor({
      definition,
      anchor,
      bounds: { width: scene.width, height: scene.height },
      onRip: (progress, bounds) => reportRip(definition.name, progress, bounds)
    })
    for (const node of cat.views) scene.cats.addChild(node)
    cats.add(cat)
    api.log(`spawn ${definition.id} anchor=${anchor} at ${cat.placement.x},${cat.placement.y}`)
  }

  function update(dtMs: number): void {
    if (runtime.paused) return

    if (!save.settings.quietMode && director.ready(cats.size)) {
      spawn()
    }

    for (const cat of [...cats]) {
      cat.update(dtMs)
      if (cat.removed) {
        if (hovered === cat) clearHover()
        for (const node of cat.views) scene.cats.removeChild(node)
        cats.delete(cat)
        cat.destroy()
      }
    }

    // a cat that stopped being catchable must not keep the cursor hostage
    if (hovered && (!cats.has(hovered) || !hovered.capturable)) clearHover()
  }

  function catAt(px: number, py: number): CatActor | null {
    for (const cat of cats) {
      if (cat.capturable && hitShape(cat.bounds, px, py)) return cat
    }
    return null
  }

  window.addEventListener('mousemove', (event) => {
    if (runtime.paused || !runtime.captureEnabled) return
    const next = catAt(event.clientX, event.clientY)
    if (next === hovered) return
    if (hovered && hovered !== next) {
      hovered = null
      void requestCapture(false)
    }
    hovered = next
    if (next) void requestCapture(true)
  })

  window.addEventListener('mouseleave', () => clearHover())

  window.addEventListener('mousedown', (event) => {
    if (runtime.paused || !runtime.captureEnabled) return

    // Re-test at the click position rather than trusting the last hover, so a
    // click that lands on a cat always registers even if the pointer never moved.
    const cat = catAt(event.clientX, event.clientY)
    if (!cat) {
      clearHover()
      return
    }

    event.preventDefault()
    const bounds = cat.bounds

    // Always give the cursor back, whether the catch lands or not.
    clearHover()

    if (!captureChance(cat.definition.difficulty)) {
      cat.flinch()
      const left = 3 - cat.misses
      toast(left > 0 ? `Missed — ${left} left` : 'Missed — it bolts', 'bad', bounds)
      void api
        .patchSave({ stats: { ...save.stats, misses: save.stats.misses + 1 } })
        .then((next) => {
          save = next
        })
      return
    }

    const coins = coinValue(cat.definition.rarity)
    const existing = save.caught[cat.definition.id]
    const total = (existing?.count ?? 0) + 1

    cat.collect()
    toast(`${cat.definition.name} collected · +${coins}`, 'good', bounds)

    void api
      .patchSave({
        caught: {
          [cat.definition.id]: {
            count: total,
            firstCaughtAt: existing?.firstCaughtAt ?? new Date().toISOString()
          }
        },
        inventory: { ...save.inventory, coins: save.inventory.coins + coins },
        stats: { ...save.stats, totalCaptures: save.stats.totalCaptures + 1 }
      })
      .then((next) => {
        save = next
      })
  })

  api.onPauseChanged((state) => {
    runtime = state
    scene.cats.visible = !state.paused
    if (state.paused || !state.captureEnabled) clearHover()
  })

  createLoop(update).start()
  void requestCapture(false)
  api.log(
    `booted on ${display.width}x${display.height} at ${display.x},${display.y} (renderer ${scene.app.renderer.type})`
  )
}

void boot().catch((error: unknown) => {
  console.error('boot failed', error)
  try {
    window.whisker?.log(`boot failed: ${String(error)}`)
  } catch {
    /* the preload bridge is unavailable, the console line above is all we get */
  }
})
