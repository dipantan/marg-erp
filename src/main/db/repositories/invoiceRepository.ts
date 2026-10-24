import { getDatabase } from '../database'
import type { Invoice, InvoiceLineItem, CreateInvoiceInput } from '@shared/types'

interface InvoiceRow {
  id: number
  invoice_no: string
  invoice_date: string
  patient_name: string
  patient_meta: string | null
  patient_address: string | null
  patient_phone: string | null
  dr_name: string | null
  dr_reg_no: string | null
  payment_mode: 'CASH' | 'UPI' | 'DUE/CREDIT'
  payment_status: 'PAID' | 'PENDING'
  mrp_total: number
  discount_total: number
  taxable_amount: number
  cgst_total: number
  sgst_total: number
  round_off: number
  grand_total: number
  notes: string | null
  created_at: string
}

interface InvoiceItemRow {
  id: number
  invoice_id: number
  product_id: number | null
  batch_id: number | null
  product_name: string
  pack: string
  hsn: string
  exp: string
  batch: string
  qty_strip: number
  qty_loose: number
  mrp: number
  disc_percent: number
  gst_percent: number
  amount: number
}

function mapInvoiceRow(row: InvoiceRow, items: InvoiceLineItem[] = []): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_no,
    invoiceDate: row.invoice_date,
    patientName: row.patient_name,
    patientAgeGender: row.patient_meta || '',
    patientAddress: row.patient_address || '',
    patientPhone: row.patient_phone || '',
    doctorName: row.dr_name || '',
    doctorRegNo: row.dr_reg_no || '',
    items,
    mrpTotal: row.mrp_total,
    discountTotal: row.discount_total,
    taxableAmount: row.taxable_amount,
    cgst: row.cgst_total,
    sgst: row.sgst_total,
    roundOff: row.round_off,
    grandTotal: row.grand_total,
    paymentMode: row.payment_mode,
    paymentStatus: row.payment_status,
    notes: row.notes || '',
    createdAt: row.created_at
  }
}

function mapItemRow(row: InvoiceItemRow): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id ?? undefined,
    batchId: row.batch_id ?? undefined,
    productName: row.product_name,
    pack: row.pack,
    hsnCode: row.hsn,
    batchNo: row.batch,
    expiryDate: row.exp,
    qtyPack: row.qty_strip,
    qtyLoose: row.qty_loose,
    mrp: row.mrp,
    discountPercent: row.disc_percent,
    gstPercent: row.gst_percent,
    amount: row.amount
  }
}

export const invoiceRepository = {
  list(): Invoice[] {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM invoices ORDER BY id DESC LIMIT 100')
    const invoices = stmt.all() as InvoiceRow[]

    const itemStmt = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
    return invoices.map((inv: InvoiceRow) => {
      const items = (itemStmt.all(inv.id) as InvoiceItemRow[]).map(mapItemRow)
      return mapInvoiceRow(inv, items)
    })
  },

  getById(id: number): Invoice | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM invoices WHERE id = ?')
    const row = stmt.get(id) as InvoiceRow | undefined
    if (!row) return null

    const itemStmt = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?')
    const items = (itemStmt.all(id) as InvoiceItemRow[]).map(mapItemRow)
    return mapInvoiceRow(row, items)
  },

  generateNextInvoiceNumber(): string {
    const db = getDatabase()
    const lastRow = db.prepare('SELECT invoice_no FROM invoices ORDER BY id DESC LIMIT 1').get() as
      { invoice_no?: string } | undefined

    if (!lastRow || !lastRow.invoice_no) {
      return 'A060880'
    }

    const clean = lastRow.invoice_no.replace(/\D/g, '')
    const num = parseInt(clean, 10)
    if (isNaN(num)) {
      return 'A060880'
    }

    const next = (num + 1).toString().padStart(6, '0')
    return `A${next}`
  },

  create(input: CreateInvoiceInput): Invoice {
    const db = getDatabase()

    if (!input.items || input.items.length === 0) {
      throw new Error('An invoice must contain at least one medicine item')
    }

    const invoiceNumber = this.generateNextInvoiceNumber()

    let mrpTotal = 0
    let discountTotal = 0
    let totalTax = 0

    // Compute line amounts matching Page 21-22 of the PDF
    const computedItems = input.items.map((item) => {
      const unitsPerPack = item.unitsPerPack || 10
      const unitPrice = item.mrp / unitsPerPack
      const grossAmount = Number((item.qtyPack * item.mrp + item.qtyLoose * unitPrice).toFixed(2))
      const discAmount = Number(((grossAmount * item.discountPercent) / 100).toFixed(2))
      const netAmount = grossAmount - discAmount

      // Retail MRP is inclusive of GST
      const taxableVal = netAmount / (1 + (item.gstPercent || 5) / 100)
      const lineGst = netAmount - taxableVal

      mrpTotal += grossAmount
      discountTotal += discAmount
      totalTax += lineGst

      return {
        ...item,
        grossAmount,
        amount: grossAmount // The sample bill displays line gross MRP value in the AMOUNT column
      }
    })

    const netBeforeRound = mrpTotal - discountTotal
    const grandTotal = Math.round(netBeforeRound)
    const roundOff = Number((grandTotal - netBeforeRound).toFixed(2))
    const halfTax = Number((totalTax / 2).toFixed(2))
    const taxableAmount = Number((netBeforeRound - totalTax).toFixed(2))

    const insertInvoiceStmt = db.prepare(`
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

    const insertItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, batch_id, product_name, pack, hsn, exp, batch,
        qty_strip, qty_loose, mrp, disc_percent, gst_percent, amount
      ) VALUES (
        @invoice_id, @product_id, @batch_id, @product_name, @pack, @hsn, @exp, @batch,
        @qty_strip, @qty_loose, @mrp, @disc_percent, @gst_percent, @amount
      )
    `)

    const deductBatchStockStmt = db.prepare(`
      UPDATE product_batches
      SET stock_loose_units = stock_loose_units - ?
      WHERE id = ?
    `)

    let createdInvoiceId = 0

    const executeTransaction = db.transaction(() => {
      // 1. Insert invoice header
      const invInfo = insertInvoiceStmt.run({
        invoice_no: invoiceNumber,
        invoice_date: input.invoiceDate,
        patient_name: input.patientName.trim().toUpperCase(),
        patient_meta: input.patientAgeGender || '',
        patient_address: input.patientAddress || '',
        patient_phone: input.patientPhone || '',
        dr_name: input.doctorName || '',
        dr_reg_no: input.doctorRegNo || '',
        payment_mode: input.paymentMode,
        payment_status: input.paymentStatus,
        mrp_total: Number(mrpTotal.toFixed(2)),
        discount_total: Number(discountTotal.toFixed(2)),
        taxable_amount: taxableAmount,
        cgst_total: halfTax,
        sgst_total: halfTax,
        round_off: roundOff,
        grand_total: grandTotal,
        notes: input.notes || ''
      })

      createdInvoiceId = Number(invInfo.lastInsertRowid)

      // 2. Insert line items & deduct stock units atomically
      for (const item of computedItems) {
        insertItemStmt.run({
          invoice_id: createdInvoiceId,
          product_id: item.productId ?? null,
          batch_id: item.batchId ?? null,
          product_name: item.productName,
          pack: item.pack,
          hsn: item.hsnCode || '3004',
          exp: item.expiryDate || '',
          batch: item.batchNo || '',
          qty_strip: item.qtyPack,
          qty_loose: item.qtyLoose,
          mrp: item.mrp,
          disc_percent: item.discountPercent,
          gst_percent: item.gstPercent,
          amount: item.amount
        })

        if (item.batchId) {
          const looseUnitsToDeduct = item.qtyPack * item.unitsPerPack + item.qtyLoose
          deductBatchStockStmt.run(looseUnitsToDeduct, item.batchId)
        }
      }
    })

    executeTransaction()
    return this.getById(createdInvoiceId)!
  }
}
