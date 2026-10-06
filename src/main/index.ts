import { app, globalShortcut } from 'electron'
import { EMERGENCY_HOTKEY } from '@shared/constants'
import { hardenOverlay, registerIpc } from './ipc'
import { getRuntime, toggleCapture } from './runtime'
import { createTray, refreshTray } from './tray'
import { applyMouseCapture, createOverlayWindow } from './windows'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('second-instance', () => {
  createOverlayWindow()
})

app.whenReady().then(() => {
  app.setAppUserModelId('com.whiskeredge.app')

  registerIpc()
  const overlay = createOverlayWindow()
  overlay.once('ready-to-show', hardenOverlay)
  createTray()

  globalShortcut.register(EMERGENCY_HOTKEY, () => {
    toggleCapture()
    refreshTray()
    if (!getRuntime().captureEnabled) applyMouseCapture(false)
  })

  app.on('activate', () => {
    createOverlayWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})