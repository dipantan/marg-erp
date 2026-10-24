import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, statSync, copyFileSync } from 'fs'
import { CREATE_TABLES_SQL } from './schema'
import type { DatabaseStats, StoreSettings, HeldBill } from '@shared/types'

let dbInstance: Database.Database | null = null
let resolvedDbPath: string = ''

export function parseExpSortKey(expDate: string): number {
  const parts = expDate.trim().split(/[-/]/)
  if (parts.length === 2) {
    let month = parseInt(parts[0], 10)
    let year = parseInt(parts[1], 10)
    if (year < 100) year += 2000
    if (month > 12) {
      const temp = month
      month = year
      year = temp
    }
    return year * 100 + month
  }
  return 209912
}

export function getDatabasePath(): string {
  if (resolvedDbPath) return resolvedDbPath
  const userDataDir = app.getPath('userData')
  if (!existsSync(userDataDir)) {
    mkdirSync(userDataDir, { recursive: true })
  }
  resolvedDbPath = join(userDataDir, 'bhowmik-medical.db')
  return resolvedDbPath
}

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance

  const dbPath = getDatabasePath()
  dbInstance = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
  })

  // Optimize performance with SQLite PRAGMAs
  dbInstance.pragma('journal_mode = WAL')
  dbInstance.pragma('synchronous = NORMAL')
  dbInstance.pragma('foreign_keys = ON')
  dbInstance.pragma('temp_store = MEMORY')

  // Execute schema
  dbInstance.exec(CREATE_TABLES_SQL)

  // Initialize store settings & sample data if newly created
  initStoreSettings(dbInstance)
  seedInitialDataIfEmpty(dbInstance)

  return dbInstance
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase()
  }
  return dbInstance
}

export function initStoreSettings(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM store_settings').get() as {
    count: number
  }
  if (existing.count === 0) {
    db.prepare(
      `
      INSERT INTO store_settings (
        id, store_name, sub_title, address_line1, address_line2, district_state,
        mobile, delivery_phone, gstin, drug_lic_no, fssai_no,
        registered_pharmacist, pharmacist_reg_no, upi_id, jurisdiction
      ) VALUES (
        1,
        'M/S JANATA MEDICAL STORES',
        '(Chemist & druggist)',
        'TOWN- BUNIADPUR, P.O-BUNIADPUR',
        'DIST -DAKSHIN DINAJPUR',
        'DAKSHIN DINAJPUR, WEST BENGAL',
        '9434220466',
        '9732101206',
        '19ALGPS1320N1ZT',
        'WD-6172-S/WD-6173-SB / WB/DDP/NBOR/R/791800',
        '22817005000401',
        'SUJIT BHOWMIK (D.Pharm)',
        'A-29233',
        '9434220466@upi',
        'BUNIADPUR'
      )
    `
    ).run()
  }
}

interface StoreSettingsRow {
  id: number
  store_name: string
  sub_title: string | null
  address_line1: string
  address_line2: string | null
  district_state: string | null
  mobile: string
  delivery_phone: string | null
  gstin: string
  drug_lic_no: string
  fssai_no: string | null
  registered_pharmacist: string | null
  pharmacist_reg_no: string | null
  upi_id: string | null
  jurisdiction: string | null
  terms_and_conditions: string
  updated_at: string
}

export function getStoreSettings(): StoreSettings {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM store_settings WHERE id = 1').get() as StoreSettingsRow
  return {
    id: row.id,
    storeName: row.store_name,
    tagline: row.sub_title || '(Chemist & druggist)',
    address: `${row.address_line1}${row.address_line2 ? ', ' + row.address_line2 : ''}`,
    city: 'BUNIADPUR',
    district: row.jurisdiction || 'DAKSHIN DINAJPUR',
    pincode: '733121',
    phone: row.mobile,
    alternatePhone: row.delivery_phone || '9732101206',
    gstin: row.gstin,
    drugLicNo: row.drug_lic_no,
    fssaiNo: row.fssai_no || '22817005000401',
    registeredPharmacist: row.registered_pharmacist || 'SUJIT BHOWMIK (D.Pharm)',
    pharmacistRegNo: row.pharmacist_reg_no || 'A-29233',
    upiId: row.upi_id || '9434220466@upi',
    termsAndConditions: row.terms_and_conditions,
    updatedAt: row.updated_at
  }
}

export function updateStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
  const db = getDatabase()
  const current = getStoreSettings()
  const merged = {
    store_name: settings.storeName ?? current.storeName,
    sub_title: settings.tagline ?? current.tagline,
    address_line1: settings.address ?? current.address,
    mobile: settings.phone ?? current.phone,
    delivery_phone: settings.alternatePhone ?? current.alternatePhone,
    gstin: settings.gstin ?? current.gstin,
    drug_lic_no: settings.drugLicNo ?? current.drugLicNo,
    fssai_no: settings.fssaiNo ?? current.fssaiNo,
    registered_pharmacist: settings.registeredPharmacist ?? current.registeredPharmacist,
    pharmacist_reg_no: settings.pharmacistRegNo ?? current.pharmacistRegNo,
    upi_id: settings.upiId ?? current.upiId,
    terms_and_conditions: settings.termsAndConditions ?? current.termsAndConditions
  }

  db.prepare(
    `
    UPDATE store_settings SET
      store_name = @store_name,
      sub_title = @sub_title,
      address_line1 = @address_line1,
      mobile = @mobile,
      delivery_phone = @delivery_phone,
      gstin = @gstin,
      drug_lic_no = @drug_lic_no,
      fssai_no = @fssai_no,
      registered_pharmacist = @registered_pharmacist,
      pharmacist_reg_no = @pharmacist_reg_no,
      upi_id = @upi_id,
      terms_and_conditions = @terms_and_conditions,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `
  ).run(merged)

  return getStoreSettings()
}

export function getDatabaseStats(): DatabaseStats {
  const db = getDatabase()
  const dbPath = getDatabasePath()
  const walPath = `${dbPath}-wal`

  let fileSizeKb = 0
  let walSizeKb = 0

  try {
    if (existsSync(dbPath)) {
      fileSizeKb = Math.round(statSync(dbPath).size / 1024)
    }
    if (existsSync(walPath)) {
      walSizeKb = Math.round(statSync(walPath).size / 1024)
    }
  } catch (err) {
    console.error('Failed reading db file stats:', err)
  }

  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  const batchCount = db.prepare('SELECT COUNT(*) as count FROM product_batches').get() as {
    count: number
  }
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }
  const invCount = db
    .prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as totalRevenue FROM invoices'
    )
    .get() as {
    count: number
    totalRevenue: number
  }

  const currentYearMonth = new Date().getFullYear() * 100 + (new Date().getMonth() + 1)
  const alertYearMonth = currentYearMonth + 100 // 1 year ahead

  const expiringSoonRow = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM product_batches
    WHERE is_active = 1 AND exp_sort_key <= ?
  `
    )
    .get(alertYearMonth) as { count: number }

  const lowStockRow = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    WHERE pb.is_active = 1 AND pb.stock_loose_units <= (p.reorder_level * p.units_per_pack)
  `
    )
    .get() as { count: number }

  return {
    databasePath: dbPath,
    fileSizeKb,
    walSizeKb,
    totalProducts: prodCount.count,
    totalBatches: batchCount.count,
    totalCustomers: custCount.count,
    totalInvoices: invCount.count,
    totalRevenue: Math.round(invCount.totalRevenue * 100) / 100,
    expiringSoonCount: expiringSoonRow.count,
    lowStockCount: lowStockRow.count,
    lastUpdated: new Date().toISOString()
  }
}

export function exportDatabaseBackup(): { savedPath: string } {
  const db = getDatabase()
  db.pragma('wal_checkpoint(TRUNCATE)')

  const dbPath = getDatabasePath()
  const desktopPath = app.getPath('desktop')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFileName = `janata-pharma-backup-${timestamp}.db`
  const targetPath = join(desktopPath, backupFileName)

  copyFileSync(dbPath, targetPath)
  return { savedPath: targetPath }
}

// Held Bill management
export function holdBill(bill: HeldBill): boolean {
  const db = getDatabase()
  db.prepare(
    `
    INSERT OR REPLACE INTO draft_invoices (id, parked_at, patient_name, item_count, total_amount, payload_json)
    VALUES (@id, @parked_at, @patient_name, @item_count, @total_amount, @payload_json)
  `
  ).run({
    id: bill.id,
    parked_at: bill.parkedAt,
    patient_name: bill.patientName,
    item_count: bill.itemCount,
    total_amount: bill.totalAmount,
    payload_json: JSON.stringify(bill.payload)
  })
  return true
}

export function getHeldBills(): HeldBill[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM draft_invoices ORDER BY parked_at DESC').all() as Array<{
    id: string
    parked_at: string
    patient_name: string
    item_count: number
    total_amount: number
    payload_json: string
  }>

  return rows.map((r) => ({
    id: r.id,
    parkedAt: r.parked_at,
    patientName: r.patient_name,
    itemCount: r.item_count,
    totalAmount: r.total_amount,
    payload: JSON.parse(r.payload_json)
  }))
}

export function removeHeldBill(id: string): boolean {
  const db = getDatabase()
  db.prepare('DELETE FROM draft_invoices WHERE id = ?').run(id)
  return true
}

export function seedInitialDataIfEmpty(db: Database.Database): boolean {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }
  if (countRow.count > 0) {
    return false
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (name, hsn_code, pack_label, units_per_pack, is_schedule_h, default_gst_rate, reorder_level)
    VALUES (@name, @hsn_code, @pack_label, @units_per_pack, @is_schedule_h, @default_gst_rate, @reorder_level)
  `)

  const insertBatch = db.prepare(`
    INSERT INTO product_batches (product_id, batch_no, exp_date, exp_sort_key, mrp, purchase_rate, stock_loose_units, is_active)
    VALUES (@product_id, @batch_no, @exp_date, @exp_sort_key, @mrp, @purchase_rate, @stock_loose_units, 1)
  `)

  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, age_gender, phone, address, current_balance)
    VALUES (@name, @age_gender, @phone, @address, @current_balance)
  `)

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      invoice_no, invoice_date, patient_name, patient_meta, patient_address,
      patient_phone, dr_name, dr_reg_no, payment_mode, payment_status,
      mrp_total, discount_total, taxable_amount, cgst_total, sgst_total, round_off, grand_total, notes
    ) VALUES (
      @invoice_no, @invoice_date, @patient_name, @patient_meta, @patient_address,
      @patient_phone, @dr_name, @dr_reg_no, @payment_mode, @payment_status,
      @mrp_total, @discount_total, @taxable_amount, @cgst_total, @sgst_total, @round_off, @grand_total, @notes
    )
  `)

  const insertInvoiceItem = db.prepare(`
    INSERT INTO invoice_items (
      invoice_id, product_id, batch_id, product_name, pack, hsn, exp, batch,
      qty_strip, qty_loose, mrp, disc_percent, gst_percent, amount
    ) VALUES (
      @invoice_id, @product_id, @batch_id, @product_name, @pack, @hsn, @exp, @batch,
      @qty_strip, @qty_loose, @mrp, @disc_percent, @gst_percent, @amount
    )
  `)

  const transaction = db.transaction(() => {
    // 1. Seed Real Medicines from Client's Cash Memo
    const sampleMedicines = [
      {
        name: 'AVERT 16 *',
        packLabel: '10S',
        unitsPerPack: 10,
        hsnCode: '3004',
        isScheduleH: 1,
        defaultGstRate: 5.0,
        reorderLevel: 5,
        batchNo: 'P9670',
        expDate: '2/28',
        mrp: 142.45,
        purchaseRate: 102.5,
        initialStrips: 50,
        initialLoose: 0
      },
      {
        name: 'R.B.TONE XT *',
        packLabel: '1*10',
        unitsPerPack: 10,
        hsnCode: '3004',
        isScheduleH: 0,
        defaultGstRate: 5.0,
        reorderLevel: 5,
        batchNo: 'E260994',
        expDate: '6/28',
        mrp: 223.0,
        purchaseRate: 160.0,
        initialStrips: 40,
        initialLoose: 0
      },
      {
        name: 'ESOKEM-D *',
        packLabel: '1*15',
        unitsPerPack: 15,
        hsnCode: '3004',
        isScheduleH: 0,
        defaultGstRate: 5.0,
        reorderLevel: 5,
        batchNo: 'PCM0026',
        expDate: '12/27',
        mrp: 200.39,
        purchaseRate: 145.0,
        initialStrips: 25,
        initialLoose: 10
      },
      {
        name: 'D-RISE 60K CAP *',
        packLabel: '1*4',
        unitsPerPack: 4,
        hsnCode: '3004',
        isScheduleH: 0,
        defaultGstRate: 5.0,
        reorderLevel: 5,
        batchNo: 'SDR0926',
        expDate: '3/28',
        mrp: 132.38,
        purchaseRate: 94.0,
        initialStrips: 60,
        initialLoose: 2
      },
      {
        name: 'TRYPTOMER 10MG TAB *',
        packLabel: "1*30'S",
        unitsPerPack: 30,
        hsnCode: '3004',
        isScheduleH: 1,
        defaultGstRate: 5.0,
        reorderLevel: 5,
        batchNo: 'D2600229',
        expDate: '5/28',
        mrp: 76.88,
        purchaseRate: 52.0,
        initialStrips: 30,
        initialLoose: 15
      }
    ]

    const productBatchMap: Array<{
      productId: number
      batchId: number
      item: (typeof sampleMedicines)[0]
    }> = []

    for (const m of sampleMedicines) {
      const pRes = insertProduct.run({
        name: m.name,
        hsn_code: m.hsnCode,
        pack_label: m.packLabel,
        units_per_pack: m.unitsPerPack,
        is_schedule_h: m.isScheduleH,
        default_gst_rate: m.defaultGstRate,
        reorder_level: m.reorderLevel
      })
      const productId = Number(pRes.lastInsertRowid)

      const totalLooseUnits = m.initialStrips * m.unitsPerPack + m.initialLoose
      const bRes = insertBatch.run({
        product_id: productId,
        batch_no: m.batchNo,
        exp_date: m.expDate,
        exp_sort_key: parseExpSortKey(m.expDate),
        mrp: m.mrp,
        purchase_rate: m.purchaseRate,
        stock_loose_units: totalLooseUnits
      })
      const batchId = Number(bRes.lastInsertRowid)

      productBatchMap.push({ productId, batchId, item: m })
    }

    // 2. Seed Patient from Client's Memo
    insertCustomer.run({
      name: 'SURAJMANI TUDU',
      age_gender: '30/F',
      phone: '9434220466',
      address: 'KARKHA',
      current_balance: 0
    })

    // 3. Seed Cash Memo A060879 exactly matching the photo
    const invRes = insertInvoice.run({
      invoice_no: 'A060879',
      invoice_date: '21-10-2026',
      patient_name: 'SURAJMANI TUDU',
      patient_meta: '30/F',
      patient_address: 'KARKHA',
      patient_phone: '',
      dr_name: 'P CHAKI',
      dr_reg_no: '',
      payment_mode: 'CASH',
      payment_status: 'PAID',
      mrp_total: 557.77,
      discount_total: 55.78,
      taxable_amount: 478.09,
      cgst_total: 11.95,
      sgst_total: 11.95,
      round_off: 0.01,
      grand_total: 502.0,
      notes: ''
    })
    const invoiceId = Number(invRes.lastInsertRowid)

    // Insert 5 line items from photo
    const memoLines = [
      { map: productBatchMap[0], qtyStrip: 1, qtyLoose: 0, amount: 142.45 },
      { map: productBatchMap[1], qtyStrip: 1, qtyLoose: 0, amount: 223.0 },
      { map: productBatchMap[2], qtyStrip: 0, qtyLoose: 10, amount: 133.59 },
      { map: productBatchMap[3], qtyStrip: 0, qtyLoose: 1, amount: 33.1 },
      { map: productBatchMap[4], qtyStrip: 0, qtyLoose: 10, amount: 25.63 }
    ]

    for (const line of memoLines) {
      insertInvoiceItem.run({
        invoice_id: invoiceId,
        product_id: line.map.productId,
        batch_id: line.map.batchId,
        product_name: line.map.item.name,
        pack: line.map.item.packLabel,
        hsn: line.map.item.hsnCode,
        exp: line.map.item.expDate,
        batch: line.map.item.batchNo,
        qty_strip: line.qtyStrip,
        qty_loose: line.qtyLoose,
        mrp: line.map.item.mrp,
        disc_percent: 10.0,
        gst_percent: 5.0,
        amount: line.amount
      })
    }
  })

  transaction()
  return true
}
