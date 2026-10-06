import type { Rarity } from '@shared/types'

export const BASE_CAPTURE_CHANCE = 0.95

const COINS: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 10,
  legendary: 40
}

export function coinValue(rarity: Rarity): number {
  return COINS[rarity]
}

/**
 * Success chance = base x state modifier x (1 - difficulty).
 * Missing is never punishing, it only makes the cat leave sooner.
 */
export function captureChance(
  difficulty: number,
  stateModifier = 1,
  rng: () => number = Math.random
): boolean {
  const chance = Math.max(0, Math.min(1, BASE_CAPTURE_CHANCE * stateModifier * (1 - difficulty)))
  return rng() < chance
}
