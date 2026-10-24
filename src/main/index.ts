import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { setupApplicationMenu } from './menu'
import { initDatabase } from './db/database'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { initAutoUpdater } from './updater'

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // Set app user model id for windows notifications & taskbar grouping
    electronApp.setAppUserModelId('com.marg.erp')

    // Watch for F12, Cmd+R in development and ignore in production
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // 1. Initialize SQLite Database
    try {
      initDatabase()
      console.log('✅ SQLite Database successfully initialized with WAL mode.')
    } catch (err) {
      console.error('❌ Failed to initialize SQLite database:', err)
    }

    // 2. Register IPC Handlers
    registerIpcHandlers()

    // 3. Create Main Window & Register Native System Menu
    mainWindow = createMainWindow()
    setupApplicationMenu(mainWindow)

    // 4. Initialize Auto Updater with GitHub Releases
    initAutoUpdater(mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
        setupApplicationMenu(mainWindow)
        initAutoUpdater(mainWindow)
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
