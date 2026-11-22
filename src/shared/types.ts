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
  drugLicNo: string // Retail Drug License (Form 20 & 21)
  wholesaleDrugLicNo?: string // Wholesale Drug License (Form 20B & 21B)
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
  supplierId?: number
  supplierName?: string
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
    supplierId?: number
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
  supplierId?: number
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

export interface CustomerPayment {
  id: number
  customerId: number
  customerName?: string
  paymentDate: string
  amount: number
  paymentMode: 'CASH' | 'UPI' | 'BANK'
  notes?: string
  createdAt: string
}

export interface RecordCustomerPaymentInput {
  customerId: number
  paymentDate: string
  amount: number
  paymentMode: 'CASH' | 'UPI' | 'BANK'
  notes?: string
}

export interface CustomerMedicineHistoryItem {
  id: number
  invoiceId: number
  invoiceNo: string
  invoiceDate: string
  invoiceType: 'RETAIL' | 'WHOLESALE'
  grandTotal: number
  paymentMode: string
  paymentStatus: string
  productName: string
  pack: string
  batchNo: string
  expiryDate: string
  qtyPack: number
  qtyLoose: number
  mrp: number
  amount: number
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
  qtyPack: number // Strips/Packs
  qtyLoose: number // Loose capsules/tablets (RETAIL ONLY)
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
  invoiceType: 'RETAIL' | 'WHOLESALE'
  customerId?: number
  customerDlNo?: string
  customerGstin?: string
  patientName: string // In wholesale: Buyer Shop / Party Name
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
  invoiceType?: 'RETAIL' | 'WHOLESALE'
  customerId?: number
  customerDlNo?: string
  customerGstin?: string
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
  supplierId?: number
}

// Supplier & Purchase Management
export interface Supplier {
  id: number
  name: string
  phone: string
  gstin?: string
  drugLicNo?: string
  address?: string
  totalPurchases: number
  totalPaid: number
  currentBalance: number // Outstanding due to supplier
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierInput {
  name: string
  phone?: string
  gstin?: string
  drugLicNo?: string
  address?: string
  openingBalance?: number
}

export interface UpdateSupplierInput {
  id: number
  name?: string
  phone?: string
  gstin?: string
  drugLicNo?: string
  address?: string
}

export interface SupplierPurchase {
  id: number
  supplierId: number
  supplierName?: string
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  notes?: string
  createdAt: string
}

export interface CreateSupplierPurchaseInput {
  supplierId: number
  billNo: string
  billDate: string
  totalAmount: number
  paidAmount?: number
  notes?: string
}

export interface SupplierPayment {
  id: number
  supplierId: number
  supplierName?: string
  purchaseId?: number
  paymentDate: string
  amount: number
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE' | 'RETURN_ADJUSTMENT'
  notes?: string
  createdAt: string
}

export interface RecordSupplierPaymentInput {
  supplierId: number
  purchaseId?: number
  paymentDate: string
  amount: number
  paymentMode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE' | 'RETURN_ADJUSTMENT'
  notes?: string
}

// Expiry Returns to Supplier (Debit Note)
export interface ExpiryReturn {
  id: number
  returnNo: string
  returnDate: string
  supplierId: number
  supplierName?: string
  supplierPhone?: string
  productId: number
  productName: string
  batchId: number
  batchNo: string
  expDate: string
  packLabel: string
  qtyStrips: number
  purchaseRate: number
  totalAmount: number
  status: 'RETURNED' | 'CREDIT_NOTE_RECEIVED'
  notes?: string
  createdAt: string
}

export interface CreateExpiryReturnInput {
  supplierId: number
  batchId: number
  qtyStrips: number
  notes?: string
}

export interface BalanceSheetSummary {
  totalReceivables: number // Customer Due
  totalPayables: number // Supplier Due
  totalSalesRevenue: number
  totalPurchaseExpense: number
  totalExpiryReturnedAmount: number
  suppliersCount: number
  customersWithDueCount: number
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
  totalSuppliers?: number
  totalSupplierDue?: number
  totalCustomerDue?: number
  lastUpdated: string
}

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  transferred?: number
  total?: number
  bytesPerSecond?: number
  error?: string
}
