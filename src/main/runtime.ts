import { EventEmitter } from 'node:events'
import type { AppRuntimeState } from '@shared/types'

const emitter = new EventEmitter()

let state: AppRuntimeState = { paused: false, captureEnabled: true }

export function getRuntime(): AppRuntimeState {
  return { ...state }
}

export function setPaused(paused: boolean): AppRuntimeState {
  if (state.paused === paused) return getRuntime()
  state = { ...state, paused }
  emitter.emit('changed', getRuntime())
  return getRuntime()
}

export function toggleCapture(): AppRuntimeState {
  state = { ...state, captureEnabled: !state.captureEnabled }
  emitter.emit('changed', getRuntime())
  return getRuntime()
}

export function onRuntimeChanged(cb: (state: AppRuntimeState) => void): () => void {
  emitter.on('changed', cb)
  return () => emitter.off('changed', cb)
}