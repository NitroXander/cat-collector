import { CAT_PLACEHOLDER_ID, CAT_TOP_SCRATCHER_ID } from './constants'
import type { CatDefinition } from './types'

/**
 * The one cat we start with. Tune placement, timing and feel against this before
 * adding more — decisions live in `renderer/cats/placements.ts` and `director.ts`.
 */
export const PLACEHOLDER_CAT: CatDefinition = {
  id: CAT_PLACEHOLDER_ID,
  name: 'Placeholder',
  rarity: 'common',
  sprite: CAT_PLACEHOLDER_ID,
  behaviour: 'peeker',
  anchors: ['corner', 'bottom', 'side', 'top'],
  traits: { shyness: 0.7, curiosity: 0.4, clumsiness: 0.1, speed: 0.5 },
  difficulty: 0.2,
  timeOfDay: null,
  flavor: 'Not art yet. Still sits on your taskbar.'
}

/**
 * The second cat: grips the top edge of the screen with both front paws and
 * scratches all the way down, leaving claw marks behind it. Built from
 * `whisker_edge_top_scratcher_cat.html` — the behaviour lives in
 * `renderer/cats/ScratchCat.ts`, the feel in `renderer/cats/sprite.ts`.
 */
export const TOP_SCRATCHER_CAT: CatDefinition = {
  id: CAT_TOP_SCRATCHER_ID,
  name: 'Top Scratcher',
  rarity: 'uncommon',
  sprite: CAT_TOP_SCRATCHER_ID,
  behaviour: 'scratcher',
  anchors: ['top'],
  traits: { shyness: 0.2, curiosity: 0.9, clumsiness: 0.9, speed: 0.5 },
  difficulty: 0.3,
  timeOfDay: null,
  flavor: 'Hangs off the top of your screen and scratches all the way down. Catch him before he rips it.'
}

export const CAT_CATALOG: CatDefinition[] = [PLACEHOLDER_CAT, TOP_SCRATCHER_CAT]

export const TOTAL_CATS = CAT_CATALOG.length