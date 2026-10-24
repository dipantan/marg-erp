export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AppInfo {
  name: string
  version: string
  electronVersion: string
  nodeVersion: string
  platform: string
  userDataPath: string
  dbPath: string
}

export interface StoreSettings {
  id: number
  storeName: string
  tagline: string
  address: string
  city: string
  district: string
  pincode: string
  phone: string
  alternatePhone?: string
  gstin: string
  drugLicNo: string
  fssaiNo: string
  registeredPharmacist: string
  pharmacistRegNo: string
  upiId: string
  termsAndConditions: string
  updatedAt: string
}

export interface Product {
  id: number
  name: string
  hsnCode: string // e.g. "3004"
  packLabel: string // e.g. "10S", "1*15", "1*4"
  unitsPerPack: number // 10, 15, 4 (used for loose division)
  isScheduleH: boolean // 1 = requires Dr and Patient details
  defaultGstRate: number // 5.0, 12.0
  reorderLevel: number // Alert threshold
  createdAt: string
}

export interface ProductBatch {
  id: number
  productId: number
  productName?: string
  packLabel?: string
  unitsPerPack?: number
  batchNo: string // e.g. "P9670", "E260994"
  expDate: string // e.g. "2/28", "12/27"
  expSortKey: number // YYYYMM integer (e.g. 202802 for 2/28)
  mrp: number // Full pack MRP
  purchaseRate: number
  stockLooseUnits: number // Baseline stock in lowest loose units
  stockStrips: number // Computed: Math.floor(stockLooseUnits / unitsPerPack)
  stockLoose: number // Computed: stockLooseUnits % unitsPerPack
  isActive: boolean
}

export interface ProductWithBatches extends Product {
  batches: ProductBatch[]
  totalStockStrips: number
  totalStockLoose: number
}

export interface CreateProductInput {
  name: string
  hsnCode?: string
  packLabel: string
  unitsPerPack: number
  isScheduleH?: boolean
  defaultGstRate?: number
  reorderLevel?: number
  initialBatch?: {
    batchNo: string
    expDate: string
    mrp: number
    purchaseRate?: number
    stockStrips: number
    stockLoose: number
  }
}

export interface CreateBatchInput {
  productId: number
  batchNo: string
  expDate: string
  mrp: number
  purchaseRate?: number
  stockStrips: number
  stockLoose: number
}

export interface Customer {
  id: number
  name: string
  ageGender?: string // e.g. "30/F"
  phone: string
  address?: string
  currentBalance: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerInput {
  name: string
  ageGender?: string
  phone?: string
  address?: string
  currentBalance?: number
}

export interface UpdateCustomerInput {
  id: number
  name?: string
  ageGender?: string
  phone?: string
  address?: string
  currentBalance?: number
}

export interface InvoiceLineItem {
  id?: number
  invoiceId?: number
  productId?: number
  batchId?: number
  productName: string
  pack: string
  hsnCode: string
  batchNo: string
  expiryDate: string
  qtyPack: number // Strips
  qtyLoose: number // Loose capsules/tablets
  unitsPerPack?: number
  mrp: number
  discountPercent: number
  gstPercent: number
  amount: number
}

export interface Invoice {
  id: number
  invoiceNumber: string
  invoiceDate: string
  patientName: string
  patientAgeGender: string
  patientAddress: string
  patientPhone: string
  doctorName: string
  doctorRegNo: string
  items: InvoiceLineItem[]
  mrpTotal: number
  discountTotal: number
  taxableAmount: number
  cgst: number
  sgst: number
  roundOff: number
  grandTotal: number
  paymentMode: 'CASH' | 'UPI' | 'DUE/CREDIT'
  paymentStatus: 'PAID' | 'PENDING'
  notes?: string
  createdAt: string
}

export interface CreateInvoiceInput {
  invoiceDate: string
  patientName: string
  patientAgeGender?: string
  patientAddress?: string
  patientPhone?: string
  doctorName?: string
  doctorRegNo?: string
  items: Array<{
    productId?: number
    batchId?: number
    productName: string
    pack: string
    hsnCode: string
    batchNo: string
    expiryDate: string
    qtyPack: number
    qtyLoose: number
    unitsPerPack: number
    mrp: number
    discountPercent: number
    gstPercent: number
  }>
  paymentMode: 'CASH' | 'UPI' | 'DUE/CREDIT'
  paymentStatus: 'PAID' | 'PENDING'
  notes?: string
}

export interface HeldBill {
  id: string
  parkedAt: string
  patientName: string
  itemCount: number
  totalAmount: number
  payload: CreateInvoiceInput
}

export interface PurchaseImportItem {
  name: string
  pack: string
  unitsPerPack: number
  hsnCode: string
  batchNo: string
  expDate: string
  mrp: number
  purchaseRate: number
  qtyStrips: number
}

export interface DatabaseStats {
  databasePath: string
  fileSizeKb: number
  walSizeKb: number
  totalProducts: number
  totalBatches: number
  totalCustomers: number
  totalInvoices: number
  totalRevenue: number
  expiringSoonCount: number
  lowStockCount: number
  lastUpdated: string
}
