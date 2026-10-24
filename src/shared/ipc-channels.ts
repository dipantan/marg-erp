import type {
  ApiResponse,
  AppInfo,
  DatabaseStats,
  StoreSettings,
  ProductWithBatches,
  ProductBatch,
  CreateProductInput,
  CreateBatchInput,
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  Invoice,
  CreateInvoiceInput,
  HeldBill,
  PurchaseImportItem
} from './types'

export const IPC_CHANNELS = {
  APP: {
    GET_INFO: 'app:get-info',
    OPEN_USER_DATA: 'app:open-user-data'
  },
  MENU: {
    ACTION: 'menu:action'
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close'
  },
  STORE: {
    GET_SETTINGS: 'store:get-settings',
    UPDATE_SETTINGS: 'store:update-settings'
  },
  DB: {
    GET_STATS: 'db:get-stats',
    SEED_SAMPLE_DATA: 'db:seed-sample-data',
    VACUUM: 'db:vacuum',
    EXPORT_BACKUP: 'db:export-backup'
  },
  ITEMS: {
    LIST: 'items:list',
    FTS_SEARCH: 'items:fts-search',
    GET_BY_ID: 'items:get-by-id',
    CREATE: 'items:create',
    DELETE: 'items:delete',
    GET_BATCHES: 'items:get-batches',
    CREATE_BATCH: 'items:create-batch',
    GET_EXPIRING_SOON: 'items:expiring-soon',
    IMPORT_PURCHASE: 'items:import-purchase'
  },
  CUSTOMERS: {
    LIST: 'customers:list',
    GET_BY_ID: 'customers:get-by-id',
    CREATE: 'customers:create',
    UPDATE: 'customers:update',
    DELETE: 'customers:delete'
  },
  INVOICES: {
    LIST: 'invoices:list',
    GET_BY_ID: 'invoices:get-by-id',
    CREATE: 'invoices:create',
    PRINT_SILENT: 'invoices:print-silent',
    HOLD_BILL: 'invoices:hold-bill',
    GET_HELD_BILLS: 'invoices:get-held-bills',
    REMOVE_HELD_BILL: 'invoices:remove-held-bill'
  }
} as const

export interface IpcApi {
  app: {
    getInfo: () => Promise<ApiResponse<AppInfo>>
    openUserData: () => Promise<ApiResponse<boolean>>
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  store: {
    getSettings: () => Promise<ApiResponse<StoreSettings>>
    updateSettings: (settings: Partial<StoreSettings>) => Promise<ApiResponse<StoreSettings>>
  }
  db: {
    getStats: () => Promise<ApiResponse<DatabaseStats>>
    seedSampleData: () => Promise<ApiResponse<boolean>>
    vacuum: () => Promise<ApiResponse<boolean>>
    exportBackup: () => Promise<ApiResponse<{ savedPath: string }>>
  }
  items: {
    list: (searchQuery?: string) => Promise<ApiResponse<ProductWithBatches[]>>
    ftsSearch: (query: string) => Promise<ApiResponse<ProductWithBatches[]>>
    getById: (id: number) => Promise<ApiResponse<ProductWithBatches | null>>
    create: (input: CreateProductInput) => Promise<ApiResponse<ProductWithBatches>>
    delete: (id: number) => Promise<ApiResponse<boolean>>
    getBatches: (productId: number) => Promise<ApiResponse<ProductBatch[]>>
    createBatch: (input: CreateBatchInput) => Promise<ApiResponse<ProductBatch>>
    getExpiringSoon: () => Promise<ApiResponse<ProductBatch[]>>
    importPurchase: (items: PurchaseImportItem[]) => Promise<ApiResponse<{ importedCount: number }>>
  }
  customers: {
    list: (searchQuery?: string) => Promise<ApiResponse<Customer[]>>
    getById: (id: number) => Promise<ApiResponse<Customer | null>>
    create: (input: CreateCustomerInput) => Promise<ApiResponse<Customer>>
    update: (input: UpdateCustomerInput) => Promise<ApiResponse<Customer>>
    delete: (id: number) => Promise<ApiResponse<boolean>>
  }
  invoices: {
    list: () => Promise<ApiResponse<Invoice[]>>
    getById: (id: number) => Promise<ApiResponse<Invoice | null>>
    create: (input: CreateInvoiceInput) => Promise<ApiResponse<Invoice>>
    printSilent: (invoiceId: number) => Promise<ApiResponse<boolean>>
    holdBill: (bill: HeldBill) => Promise<ApiResponse<boolean>>
    getHeldBills: () => Promise<ApiResponse<HeldBill[]>>
    removeHeldBill: (id: string) => Promise<ApiResponse<boolean>>
  }
  menu: {
    onAction: (callback: (action: string) => void) => () => void
  }
}
