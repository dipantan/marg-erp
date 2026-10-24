import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { ApiResponse, UpdateStatus } from '../shared/types'

let updateStatus: UpdateStatus = { status: 'idle' }
let mainWindowRef: BrowserWindow | null = null

export function getUpdateStatus(): UpdateStatus {
  return updateStatus
}

function broadcastStatus(status: UpdateStatus): void {
  updateStatus = status
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(IPC_CHANNELS.UPDATER.STATUS, status)
  }
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindowRef = window

  // Configure electron-updater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Logging & Event Listeners
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates on GitHub Releases...')
    broadcastStatus({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`)
    broadcastStatus({
      status: 'available',
      version: info.version
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log(`[AutoUpdater] Up to date (Current: v${info.version})`)
    broadcastStatus({
      status: 'not-available',
      version: info.version
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    broadcastStatus({
      status: 'downloading',
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdater] Update downloaded: v${info.version}`)
    broadcastStatus({
      status: 'downloaded',
      version: info.version
    })

    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      dialog
        .showMessageBox(mainWindowRef, {
          type: 'info',
          title: 'Update Ready - Marg ERP',
          message: `Marg ERP v${info.version} has been downloaded.`,
          detail: 'Would you like to restart the application now to apply the update?',
          buttons: ['Restart & Install Now', 'Later'],
          defaultId: 0,
          cancelId: 1
        })
        .then((res) => {
          if (res.response === 0) {
            autoUpdater.quitAndInstall()
          }
        })
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err == null ? 'unknown' : (err.stack || err).toString())
    broadcastStatus({
      status: 'error',
      error: err ? err.message : 'Unknown update error'
    })
  })

  // Register IPC Handlers
  ipcMain.handle(IPC_CHANNELS.UPDATER.CHECK, async (): Promise<ApiResponse<UpdateStatus>> => {
    if (!app.isPackaged) {
      return {
        success: true,
        data: {
          status: 'not-available',
          version: app.getVersion(),
          error: 'Auto-updater is active only in packaged production builds.'
        }
      }
    }

    try {
      broadcastStatus({ status: 'checking' })
      const res = await autoUpdater.checkForUpdates()
      return {
        success: true,
        data: {
          status: res?.updateInfo ? 'available' : 'not-available',
          version: res?.updateInfo?.version || app.getVersion()
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Check update error'
      broadcastStatus({ status: 'error', error: errorMsg })
      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER.DOWNLOAD, async (): Promise<ApiResponse<boolean>> => {
    if (!app.isPackaged) {
      return { success: false, error: 'Cannot download updates in dev environment.' }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { success: true, data: true }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Download update error'
      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER.INSTALL, async (): Promise<void> => {
    autoUpdater.quitAndInstall()
  })

  // Automatically check for updates on startup (after 3 seconds) in production
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Background startup check failed:', err.message)
      })
    }, 3000)
  }
}
