import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/constants'
import type { WhiskerApi } from '@shared/api'
import type { AppRuntimeState, DisplayInfo, SaveFile } from '@shared/types'

function subscribe<T>(channel: string, cb: (value: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, value: T): void => cb(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

const api: WhiskerApi = {
  getRuntime: () => ipcRenderer.invoke(IPC.rendererReady) as Promise<AppRuntimeState>,
  getDisplay: () => ipcRenderer.invoke(IPC.getDisplay) as Promise<DisplayInfo>,
  onPauseChanged: (cb) => subscribe<AppRuntimeState>(IPC.pauseChanged, cb),
  setMouseCapture: (active) => ipcRenderer.invoke(IPC.setMouseCapture, active) as Promise<void>,
  loadSave: () => ipcRenderer.invoke(IPC.saveLoad) as Promise<SaveFile>,
  patchSave: (patch) => ipcRenderer.invoke(IPC.savePatch, patch) as Promise<SaveFile>,
  onSaveUpdated: (cb) => subscribe<SaveFile>(IPC.saveUpdated, cb),
  quit: () => void ipcRenderer.invoke(IPC.quit),
  openCatalog: () => ipcRenderer.invoke(IPC.openCatalog) as Promise<void>,
  log: (message: string) => ipcRenderer.send(IPC.log, message)
}

contextBridge.exposeInMainWorld('whisker', api)

export type { WhiskerApi }