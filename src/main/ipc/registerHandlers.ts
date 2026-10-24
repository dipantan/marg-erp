import { ipcMain, BrowserWindow, shell, app } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type {
  ApiResponse,
  StoreSettings,
  CreateProductInput,
  CreateBatchInput,
  PurchaseImportItem,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateInvoiceInput,
  HeldBill
} from '@shared/types'
import {
  getDatabase,
  getDatabaseStats,
  getDatabasePath,
  seedInitialDataIfEmpty,
  getStoreSettings,
  updateStoreSettings,
  exportDatabaseBackup,
  holdBill,
  getHeldBills,
  removeHeldBill
} from '../db/database'
import { itemRepository } from '../db/repositories/itemRepository'
import { customerRepository } from '../db/repositories/customerRepository'
import { invoiceRepository } from '../db/repositories/invoiceRepository'
import { printInvoiceSilent } from '../printing/printService'

function wrapHandler<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult> | TResult
): (_event: Electron.IpcMainInvokeEvent, ...args: TArgs) => Promise<ApiResponse<TResult>> {
  return async (_event, ...args: TArgs): Promise<ApiResponse<TResult>> => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (err: unknown) {
      console.error('IPC Handler error:', err)
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      return { success: false, error: message }
    }
  }
}

export function registerIpcHandlers(): void {
  // App Info & Shell
  ipcMain.handle(
    IPC_CHANNELS.APP.GET_INFO,
    wrapHandler(async () => {
      return {
        name: 'Bhowmik Medical ERP (Marg Alternative)',
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        platform: process.platform,
        userDataPath: app.getPath('userData'),
        dbPath: getDatabasePath()
      }
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.APP.OPEN_USER_DATA,
    wrapHandler(async () => {
      await shell.openPath(app.getPath('userData'))
      return true
    })
  )

  // Store Settings (Form 20/21 & Profile)
  ipcMain.handle(
    IPC_CHANNELS.STORE.GET_SETTINGS,
    wrapHandler(async () => {
      return getStoreSettings()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.STORE.UPDATE_SETTINGS,
    wrapHandler(async (settings: Partial<StoreSettings>) => {
      return updateStoreSettings(settings)
    })
  )

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // Database Management
  ipcMain.handle(
    IPC_CHANNELS.DB.GET_STATS,
    wrapHandler(async () => {
      return getDatabaseStats()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB.SEED_SAMPLE_DATA,
    wrapHandler(async () => {
      const db = getDatabase()
      return seedInitialDataIfEmpty(db)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB.VACUUM,
    wrapHandler(async () => {
      const db = getDatabase()
      db.exec('VACUUM;')
      return true
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB.EXPORT_BACKUP,
    wrapHandler(async () => {
      return exportDatabaseBackup()
    })
  )

  // Products / Items (Medicine Inventory with FEFO & Batches)
  ipcMain.handle(
    IPC_CHANNELS.ITEMS.LIST,
    wrapHandler(async (query?: string) => {
      return itemRepository.list(query)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.FTS_SEARCH,
    wrapHandler(async (query: string) => {
      return itemRepository.ftsSearch(query)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.GET_BY_ID,
    wrapHandler(async (id: number) => {
      return itemRepository.getById(id)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.CREATE,
    wrapHandler(async (input: CreateProductInput) => {
      return itemRepository.create(input)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.DELETE,
    wrapHandler(async (id: number) => {
      return itemRepository.delete(id)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.GET_BATCHES,
    wrapHandler(async (productId: number) => {
      return itemRepository.getBatches(productId)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.CREATE_BATCH,
    wrapHandler(async (input: CreateBatchInput) => {
      return itemRepository.createBatch(input)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.GET_EXPIRING_SOON,
    wrapHandler(async () => {
      return itemRepository.getExpiringSoon()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ITEMS.IMPORT_PURCHASE,
    wrapHandler(async (items: PurchaseImportItem[]) => {
      return itemRepository.importPurchase(items)
    })
  )

  // Customers (Patients)
  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.LIST,
    wrapHandler(async (query?: string) => {
      return customerRepository.list(query)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.GET_BY_ID,
    wrapHandler(async (id: number) => {
      return customerRepository.getById(id)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.CREATE,
    wrapHandler(async (input: CreateCustomerInput) => {
      return customerRepository.create(input)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.UPDATE,
    wrapHandler(async (input: UpdateCustomerInput) => {
      return customerRepository.update(input)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS.DELETE,
    wrapHandler(async (id: number) => {
      return customerRepository.delete(id)
    })
  )

  // Invoices (Cash Memo / Prescription Register)
  ipcMain.handle(
    IPC_CHANNELS.INVOICES.LIST,
    wrapHandler(async () => {
      return invoiceRepository.list()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.GET_BY_ID,
    wrapHandler(async (id: number) => {
      return invoiceRepository.getById(id)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.CREATE,
    wrapHandler(async (input: CreateInvoiceInput) => {
      return invoiceRepository.create(input)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.PRINT_SILENT,
    wrapHandler(async (invoiceId: number) => {
      const inv = invoiceRepository.getById(invoiceId)
      if (!inv) throw new Error(`Invoice #${invoiceId} not found`)
      const store = getStoreSettings()
      return printInvoiceSilent(inv, store)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.HOLD_BILL,
    wrapHandler(async (bill: HeldBill) => {
      return holdBill(bill)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.GET_HELD_BILLS,
    wrapHandler(async () => {
      return getHeldBills()
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICES.REMOVE_HELD_BILL,
    wrapHandler(async (id: string) => {
      return removeHeldBill(id)
    })
  )
}
