import { Menu, Tray, app, nativeImage } from 'electron'
import path from 'node:path'
import { CAT_CATALOG } from '@shared/cats'
import { toggleCatalog } from './catalogWindow'
import { getRuntime, setPaused, toggleCapture } from './runtime'
import { loadSave } from './save'

let tray: Tray | null = null
let caught = 0

function icon(): Electron.NativeImage {
  const image = nativeImage.createFromPath(path.join(__dirname, '../../resources/tray.png'))
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

function caughtLabel(): string {
  return caught === 1 ? '1 cat collected' : `${caught} cats collected`
}

export function createTray(): void {
  if (tray) return
  tray = new Tray(icon())
  tray.setToolTip('Whisker Edge')
  refreshTray()
  tray.on('click', () => tray?.popUpContextMenu())
}

export function refreshTray(): void {
  if (!tray) return
  const state = getRuntime()
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Catdex',
        sublabel: caughtLabel(),
        click: () => toggleCatalog()
      },
      { type: 'separator' },
      {
        label: state.paused ? 'Resume' : 'Pause',
        click: () => {
          setPaused(!getRuntime().paused)
          refreshTray()
        }
      },
      {
        label: state.captureEnabled ? 'Disable collecting (emergency)' : 'Enable collecting',
        click: () => {
          toggleCapture()
          refreshTray()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit()
      }
    ])
  )
}

/** Keeps the tray's collected count honest without reading the save on every open. */
export async function syncTrayCount(): Promise<void> {
  const save = await loadSave()
  const next = CAT_CATALOG.filter((cat) => save.caught[cat.id]).length
  if (next === caught) return
  caught = next
  if (tray) tray.setToolTip(`Whisker Edge — ${caughtLabel()}`)
  refreshTray()
}
