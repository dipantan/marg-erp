import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { IpcApi } from '@shared/ipc-channels'
import type { UpdateStatus } from '@shared/types'

const apiBridge: IpcApi = {
  app: {
    getInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_INFO),
    openUserData: () => ipcRenderer.invoke(IPC_CHANNELS.APP.OPEN_USER_DATA)
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.CLOSE)
  },
  store: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.STORE.GET_SETTINGS),
    updateSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.STORE.UPDATE_SETTINGS, settings)
  },
  db: {
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DB.GET_STATS),
    seedSampleData: () => ipcRenderer.invoke(IPC_CHANNELS.DB.SEED_SAMPLE_DATA),
    vacuum: () => ipcRenderer.invoke(IPC_CHANNELS.DB.VACUUM),
    exportBackup: () => ipcRenderer.invoke(IPC_CHANNELS.DB.EXPORT_BACKUP)
  },
  items: {
    list: (searchQuery?: string) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.LIST, searchQuery),
    ftsSearch: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.FTS_SEARCH, query),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.GET_BY_ID, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.CREATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.DELETE, id),
    getBatches: (productId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ITEMS.GET_BATCHES, productId),
    createBatch: (input) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.CREATE_BATCH, input),
    getExpiringSoon: () => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.GET_EXPIRING_SOON),
    importPurchase: (items) => ipcRenderer.invoke(IPC_CHANNELS.ITEMS.IMPORT_PURCHASE, items)
  },
  customers: {
    list: (searchQuery?: string) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.LIST, searchQuery),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.GET_BY_ID, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.CREATE, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.DELETE, id),
    getHistory: (customerId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.GET_HISTORY, customerId),
    recordPayment: (input) => ipcRenderer.invoke(IPC_CHANNELS.CUSTOMERS.RECORD_PAYMENT, input)
  },
  invoices: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.LIST),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.GET_BY_ID, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.CREATE, input),
    printSilent: (invoiceId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICES.PRINT_SILENT, invoiceId),
    holdBill: (bill) => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.HOLD_BILL, bill),
    getHeldBills: () => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.GET_HELD_BILLS),
    removeHeldBill: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.INVOICES.REMOVE_HELD_BILL, id)
  },
  suppliers: {
    list: (searchQuery?: string) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.LIST, searchQuery),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.GET_BY_ID, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.CREATE, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.UPDATE, input),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.DELETE, id),
    listPurchases: (supplierId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.LIST_PURCHASES, supplierId),
    createPurchase: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.CREATE_PURCHASE, input),
    listPayments: (supplierId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.LIST_PAYMENTS, supplierId),
    recordPayment: (input) => ipcRenderer.invoke(IPC_CHANNELS.SUPPLIERS.RECORD_PAYMENT, input)
  },
  expiryReturns: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.EXPIRY_RETURNS.LIST),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.EXPIRY_RETURNS.CREATE, input),
    getEligibleBatches: () => ipcRenderer.invoke(IPC_CHANNELS.EXPIRY_RETURNS.GET_ELIGIBLE_BATCHES)
  },
  balanceSheet: {
    getSummary: () => ipcRenderer.invoke(IPC_CHANNELS.BALANCE_SHEET.GET_SUMMARY)
  },
  menu: {
    onAction: (callback: (action: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, action: string): void => {
        callback(action)
      }
      ipcRenderer.on(IPC_CHANNELS.MENU.ACTION, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.MENU.ACTION, listener)
      }
    }
  },
  updater: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.CHECK),
    download: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.INSTALL),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.STATUS),
    checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.CHECK),
    downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.DOWNLOAD),
    quitAndInstall: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER.INSTALL),
    onStatusChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: unknown): void => {
        callback(status as UpdateStatus)
      }
      ipcRenderer.on(IPC_CHANNELS.UPDATER.STATUS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.UPDATER.STATUS, listener)
      }
    }
  }
}

try {
  contextBridge.exposeInMainWorld('api', apiBridge)
} catch (error) {
  console.error('Failed to expose context bridge api in preload script:', error)
}
