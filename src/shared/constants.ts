export const APP_NAME = 'Whisker Edge'

export const FRAME_MS = 1000 / 30
export const CAT_BASE_SIZE = 32
export const SPRITE_SCALE = 3

export const MAX_CATS_ON_SCREEN = 2
export const SPAWN_INTERVAL_MIN_MS = 60_000
export const SPAWN_INTERVAL_MAX_MS = 180_000

export const MISSES_BEFORE_FLEE = 3

/**
 * Top-edge scratcher cat. Timing and pace follow
 * `whisker_edge_top_scratcher_cat.html`; this is the only place to tune them.
 */
export const SCRATCH_ENTER_MS = 500
export const SCRATCH_GRIP_MS = 800
export const SCRATCH_SPEED_PX_S = 140
/** The descent eases between this share of the speed and the full speed. */
export const SCRATCH_SPEED_FLOOR = 0.75
/** Swings per second of that easing — slow, so it reads as a steady climb down. */
export const SCRATCH_SPEED_WOBBLE_HZ = 0.5
/** Base chance of tearing the screen mid-descent, scaled by the cat's clumsiness. */
export const SCRATCH_RIP_CHANCE = 0.1
/** A rip never lands this close to the edge it started from... */
export const SCRATCH_RIP_MIN_TRAVEL_PX = 200
/** ...nor this close to the bottom, so a fall is always a real fall. */
export const SCRATCH_RIP_KEEP_CLEAR_PX = 120
export const SCRATCH_FALL_ACCEL_PX_S2 = 2600
/** How far past the bottom of the screen a falling cat travels before it is gone. */
export const SCRATCH_FALL_CLEAR_PX = 20
export const SCRATCH_CAPTURED_MS = 600
/** Where a collected cat is carried off to, measured in from the corner. */
export const SCRATCH_CARRY_OFF_PX = 80
export const SCRATCH_TRAIL_FADE_MS = 1200

export const SAVE_FILE = 'save.json'
export const SAVE_BACKUP = 'save.bak'
export const SAVE_VERSION = 1

export const EMERGENCY_HOTKEY = 'Control+Shift+Alt+C'

export const IPC = {
  rendererReady: 'renderer:ready',
  setMouseCapture: 'capture:set',
  pauseChanged: 'app:pause-changed',
  getDisplay: 'app:display',
  openCatalog: 'app:open-catalog',
  quit: 'app:quit',
  saveLoad: 'save:load',
  savePatch: 'save:patch',
  saveUpdated: 'save:updated',
  log: 'renderer:log'
} as const

export const CAT_PLACEHOLDER_ID = 'placeholder'
export const CAT_TOP_SCRATCHER_ID = 'top-scratcher'

export const WINDOW_OVERLAY = 'index'
export const WINDOW_CATALOG = 'catalog'