import { FRAME_MS } from '@shared/constants'

export interface LoopHandle {
  start(): void
  stop(): void
}

/**
 * Fixed-step loop capped at FRAME_MS. rAF drives the pump so the loop idles at
 * zero cost when the window is hidden (no cats, no work).
 */
export function createLoop(update: (dtMs: number) => void): LoopHandle {
  let raf = 0
  let running = false
  let last = 0
  let accumulator = 0

  const tick = (now: number): void => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    if (document.hidden) {
      last = now
      return
    }
    if (last === 0) last = now
    accumulator += now - last
    last = now
    if (accumulator > FRAME_MS * 5) accumulator = FRAME_MS * 5
    while (accumulator >= FRAME_MS) {
      update(FRAME_MS)
      accumulator -= FRAME_MS
    }
  }

  return {
    start() {
      if (running) return
      running = true
      last = 0
      accumulator = 0
      raf = requestAnimationFrame(tick)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    }
  }
}
