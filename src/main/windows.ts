import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { IPC, WINDOW_OVERLAY } from '@shared/constants'
import type { DisplayInfo } from '@shared/types'

let overlay: BrowserWindow | null = null

export function displayInfo(): DisplayInfo {
  const { x, y, width, height } = screen.getPrimaryDisplay().workArea
  return { x, y, width, height, scaleFactor: screen.getPrimaryDisplay().scaleFactor }
}

export function createOverlayWindow(): BrowserWindow {
  if (overlay && !overlay.isDestroyed()) return overlay

  const info = displayInfo()
  overlay = new BrowserWindow({
    x: info.x,
    y: info.y,
    width: info.width,
    height: info.height,
    show: false,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setIgnoreMouseEvents(true, { forward: true })

  overlay.once('ready-to-show', () => overlay?.showInactive())
  overlay.on('closed', () => {
    overlay = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void overlay.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${WINDOW_OVERLAY}.html`)
  } else {
    void overlay.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return overlay
}

export function getOverlay(): BrowserWindow | null {
  return overlay && !overlay.isDestroyed() ? overlay : null
}

export function applyMouseCapture(active: boolean): void {
  const win = getOverlay()
  if (!win) return
  win.setIgnoreMouseEvents(!active, { forward: true })
}

export function sendToOverlay(channel: string, payload?: unknown): void {
  const win = getOverlay()
  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

/** Sends to every live window, so the Catdex stays in step with the overlay. */
export function broadcast(channel: string, payload?: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

export const OVERLAY_READY_CHANNEL = IPC.rendererReady

export function destroyOverlay(): void {  const win = getOverlay()
  if (win && !win.isDestroyed()) win.destroy()
  overlay = null
}