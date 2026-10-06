import { app, ipcMain } from 'electron'
import { IPC } from '@shared/constants'
import type { SaveFile } from '@shared/types'
import { toggleCatalog } from './catalogWindow'
import { getRuntime, onRuntimeChanged } from './runtime'
import { loadSave, patchSave } from './save'
import { syncTrayCount } from './tray'
import { applyMouseCapture, broadcast, displayInfo, getOverlay } from './windows'

export function registerIpc(): void {
  ipcMain.handle(IPC.rendererReady, () => getRuntime())
  ipcMain.handle(IPC.getDisplay, () => displayInfo())
  ipcMain.handle(IPC.quit, () => app.quit())
  ipcMain.handle(IPC.openCatalog, () => toggleCatalog())

  ipcMain.handle(IPC.setMouseCapture, (_event, active: unknown) => {
    applyMouseCapture(active === true)
  })

  ipcMain.handle(IPC.saveLoad, () => loadSave())
  ipcMain.handle(IPC.savePatch, async (_event, patch: Partial<SaveFile> | undefined) => {
    const save = await patchSave(patch ?? {})
    broadcast(IPC.saveUpdated, save)
    void syncTrayCount()
    return save
  })

  ipcMain.on(IPC.log, (_event, message: unknown) => {
    console.log('[overlay]', message)
  })

  onRuntimeChanged((state) => {
    broadcast(IPC.pauseChanged, state)
  })
}

export function hardenOverlay(): void {
  const overlay = getOverlay()
  if (!overlay) return
  overlay.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  overlay.webContents.on('will-navigate', (event) => event.preventDefault())
}
