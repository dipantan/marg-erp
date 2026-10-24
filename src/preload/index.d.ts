import type { IpcApi } from '@shared/ipc-channels'

declare global {
  interface Window {
    api: IpcApi
  }
}
