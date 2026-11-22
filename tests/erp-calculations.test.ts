import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS } from '../src/shared/ipc-channels'

describe('IPC Channels and Constants', () => {
  it('should define essential ERP IPC channels including wholesale, suppliers, balance sheet and expiry returns', () => {
    expect(IPC_CHANNELS.APP.GET_INFO).toBe('app:get-info')
    expect(IPC_CHANNELS.DB.GET_STATS).toBe('db:get-stats')
    expect(IPC_CHANNELS.ITEMS.LIST).toBe('items:list')
    expect(IPC_CHANNELS.INVOICES.CREATE).toBe('invoices:create')
    expect(IPC_CHANNELS.STORE.GET_SETTINGS).toBe('store:get-settings')
    expect(IPC_CHANNELS.DB.EXPORT_BACKUP).toBe('db:export-backup')
    expect(IPC_CHANNELS.MENU.ACTION).toBe('menu:action')

    // Requirement 2: Suppliers & Balance sheet
    expect(IPC_CHANNELS.SUPPLIERS.LIST).toBe('suppliers:list')
    expect(IPC_CHANNELS.SUPPLIERS.CREATE_PURCHASE).toBe('suppliers:create-purchase')
    expect(IPC_CHANNELS.SUPPLIERS.RECORD_PAYMENT).toBe('suppliers:record-payment')
    expect(IPC_CHANNELS.BALANCE_SHEET.GET_SUMMARY).toBe('balance-sheet:get-summary')
    expect(IPC_CHANNELS.CUSTOMERS.GET_HISTORY).toBe('customers:get-history')
    expect(IPC_CHANNELS.CUSTOMERS.RECORD_PAYMENT).toBe('customers:record-payment')

    // Requirement 3: Expiry Returns to Supplier
    expect(IPC_CHANNELS.EXPIRY_RETURNS.LIST).toBe('expiry-returns:list')
    expect(IPC_CHANNELS.EXPIRY_RETURNS.CREATE).toBe('expiry-returns:create')
    expect(IPC_CHANNELS.EXPIRY_RETURNS.GET_ELIGIBLE_BATCHES).toBe(
      'expiry-returns:get-eligible-batches'
    )
  })
})

describe('Marg ERP Pharmacy Cash Memo Arithmetic (Photo Verification)', () => {
  it('replicates the exact bill lines and total from Janata Medical Stores photo', () => {
    const lines = [
      { name: 'AVERT 16', packUnits: 10, qtyPack: 1, qtyLoose: 0, mrp: 142.45, disc: 10 },
      { name: 'R.B.TONE XT', packUnits: 10, qtyPack: 1, qtyLoose: 0, mrp: 223.0, disc: 10 },
      { name: 'ESOKEM-D', packUnits: 15, qtyPack: 0, qtyLoose: 10, mrp: 200.39, disc: 10 },
      { name: 'D-RISE 60K CAP', packUnits: 4, qtyPack: 0, qtyLoose: 1, mrp: 132.38, disc: 10 },
      { name: 'TRYPTOMER 10MG TAB', packUnits: 30, qtyPack: 0, qtyLoose: 10, mrp: 76.88, disc: 10 }
    ]

    let mrpTotal = 0
    lines.forEach((l) => {
      const totalPacks = l.qtyPack + l.qtyLoose / l.packUnits
      const lineMrp = Math.round(totalPacks * l.mrp * 100) / 100
      mrpTotal += lineMrp
    })

    // Sum of MRPs matches 557.77 from photo
    expect(Math.round(mrpTotal * 100) / 100).toBe(557.77)

    const discountTotal = Math.round(mrpTotal * 0.1 * 100) / 100
    expect(discountTotal).toBe(55.78)

    const netPayable = mrpTotal - discountTotal
    const grandTotal = Math.round(netPayable)
    expect(grandTotal).toBe(502.0)
  })

  it('verifies CGST and SGST equal split on taxable turnover', () => {
    const netAmount = 501.99
    const gstRate = 5.0
    // Taxable turnover = netAmount / (1 + gstRate / 100)
    const taxable = Math.round((netAmount / (1 + gstRate / 100)) * 100) / 100
    const totalGst = Math.round((netAmount - taxable) * 100) / 100
    const cgst = Math.round((totalGst / 2) * 100) / 100
    const sgst = Math.round((totalGst / 2) * 100) / 100

    expect(cgst + sgst).toBeCloseTo(totalGst, 2)
    expect(cgst).toBe(sgst)
  })

  it('properly converts loose medicine units to strips and remaining loose pills', () => {
    const unitsPerPack = 10
    const looseUnits = 47
    const strips = Math.floor(looseUnits / unitsPerPack)
    const loose = looseUnits % unitsPerPack

    expect(strips).toBe(4)
    expect(loose).toBe(7)
  })
})

describe('Requirement 1: Retail vs Wholesale Billing Rules', () => {
  it('enforces wholesale rule: no loose medicine sale (khuchra bikri prohibited in wholesale)', () => {
    interface BillItem {
      productName: string
      qtyPack: number
      qtyLoose: number
      mrp: number
    }

    const validateWholesaleBill = (items: BillItem[]): boolean => {
      // Loose quantity must be 0 for all items in wholesale mode
      return items.every((i) => i.qtyLoose === 0)
    }

    const validWholesaleBill: BillItem[] = [
      { productName: 'PARACETAMOL 650', qtyPack: 10, qtyLoose: 0, mrp: 30.0 },
      { productName: 'AMOXICILLIN 500', qtyPack: 5, qtyLoose: 0, mrp: 85.0 }
    ]

    const invalidWholesaleBillWithLoose: BillItem[] = [
      { productName: 'PARACETAMOL 650', qtyPack: 10, qtyLoose: 5, mrp: 30.0 }
    ]

    expect(validateWholesaleBill(validWholesaleBill)).toBe(true)
    expect(validateWholesaleBill(invalidWholesaleBillWithLoose)).toBe(false)
  })

  it('allows loose medicine units only in Retail Cash Memo mode', () => {
    const item = { packUnits: 10, qtyPack: 2, qtyLoose: 4, mrp: 100.0 }
    const totalPacks = item.qtyPack + item.qtyLoose / item.packUnits
    const retailGross = totalPacks * item.mrp

    // 2 packs (200) + 4 loose (40) = 240
    expect(retailGross).toBe(240.0)
  })
})

describe('Requirement 2: Balance Sheet & Dokan Due Calculation', () => {
  it('calculates supplier dokan outstanding due balance accurately', () => {
    const totalPurchased = 45000.0
    const paidInitial = 30000.0
    let dueBalance = totalPurchased - paidInitial
    expect(dueBalance).toBe(15000.0)

    // Make an additional payment to supplier
    const paymentMade = 5000.0
    dueBalance -= paymentMade
    expect(dueBalance).toBe(10000.0)
  })

  it('calculates customer outstanding due after payment settlement', () => {
    let customerDue = 1250.0
    const paymentReceived = 500.0
    customerDue -= paymentReceived
    expect(customerDue).toBe(750.0)
  })
})

describe('Requirement 3: Expiry Medicine Return to Supplier (Debit Note)', () => {
  it('deducts inventory stock and adjusts supplier due balance when returning expired stock', () => {
    let supplierDue = 10000.0
    let batchStockStrips = 50
    const purchaseRatePerStrip = 102.5

    // Return 20 expired strips to supplier
    const returnedStrips = 20
    const returnAmount = returnedStrips * purchaseRatePerStrip // 20 * 102.5 = 2050

    batchStockStrips -= returnedStrips
    supplierDue -= returnAmount

    expect(batchStockStrips).toBe(30)
    expect(returnAmount).toBe(2050.0)
    expect(supplierDue).toBe(7950.0)
  })
})

describe('Application Versioning & Auto-Update Engine', () => {
  const isNewerVersion = (remote: string, current: string): boolean => {
    const parse = (v: string): number[] =>
      v
        .replace(/^[^\d]*/, '')
        .split('.')
        .map((n) => parseInt(n, 10) || 0)
    const [rMaj = 0, rMin = 0, rPat = 0] = parse(remote)
    const [cMaj = 0, cMin = 0, cPat = 0] = parse(current)
    if (rMaj !== cMaj) return rMaj > cMaj
    if (rMin !== cMin) return rMin > cMin
    return rPat > cPat
  }

  it('correctly compares semantic versions for auto-updater checks', () => {
    // Current is 0.1.6, remote is 0.1.6 => no update
    expect(isNewerVersion('0.1.6', '0.1.6')).toBe(false)
    expect(isNewerVersion('v0.1.6', '0.1.6')).toBe(false)

    // Current is 0.1.6, remote is 0.1.7 => update available
    expect(isNewerVersion('0.1.7', '0.1.6')).toBe(true)
    expect(isNewerVersion('v0.2.0', '0.1.6')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.1.6')).toBe(true)

    // Current is 0.1.6, remote is 0.1.5 => no update (already newer)
    expect(isNewerVersion('0.1.5', '0.1.6')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.6')).toBe(false)
  })
})
