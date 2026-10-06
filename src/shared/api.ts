import type { AppRuntimeState, DisplayInfo, SaveFile } from './types'

export interface WhiskerApi {
  getRuntime(): Promise<AppRuntimeState>
  getDisplay(): Promise<DisplayInfo>
  onPauseChanged(cb: (state: AppRuntimeState) => void): () => void
  setMouseCapture(active: boolean): Promise<void>
  loadSave(): Promise<SaveFile>
  patchSave(patch: Partial<SaveFile>): Promise<SaveFile>
  onSaveUpdated(cb: (save: SaveFile) => void): () => void
  quit(): void
  openCatalog(): Promise<void>
  log(message: string): void
}

declare global {
  interface Window {
    whisker: WhiskerApi
  }
}