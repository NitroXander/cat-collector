import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { WINDOW_CATALOG } from '@shared/constants'

let catalog: BrowserWindow | null = null

export function getCatalog(): BrowserWindow | null {
  return catalog && !catalog.isDestroyed() ? catalog : null
}

export function createCatalogWindow(): BrowserWindow {
  const existing = getCatalog()
  if (existing) return existing

  const area = screen.getPrimaryDisplay().workArea
  const width = 360
  const height = 480

  catalog = new BrowserWindow({
    width,
    height,
    x: Math.round(area.x + area.width - width - 24),
    y: Math.round(area.y + area.height - height - 24),
    minWidth: 300,
    minHeight: 360,
    show: false,
    title: 'Catdex',
    backgroundColor: '#15120f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  catalog.once('ready-to-show', () => {
    catalog?.show()
    catalog?.focus()
  })
  catalog.on('closed', () => {
    catalog = null
  })
  catalog.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (process.env['ELECTRON_RENDERER_URL']) {
    void catalog.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${WINDOW_CATALOG}/index.html`)
  } else {
    void catalog.loadFile(path.join(__dirname, `../renderer/${WINDOW_CATALOG}/index.html`))
  }

  return catalog
}

export function toggleCatalog(): void {
  const existing = getCatalog()
  if (!existing) {
    createCatalogWindow()
    return
  }
  if (existing.isVisible()) existing.hide()
  else {
    existing.show()
    existing.focus()
  }
}
