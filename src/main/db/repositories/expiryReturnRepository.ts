import { getDatabase } from '../database'
import type { ExpiryReturn, CreateExpiryReturnInput, ProductBatch } from '@shared/types'

interface ExpiryReturnRow {
  id: number
  return_no: string
  return_date: string
  supplier_id: number
  supplier_name?: string
  supplier_phone?: string
  product_id: number
  product_name: string
  batch_id: number
  batch_no: string
  exp_date: string
  pack_label: string
  qty_strips: number
  purchase_rate: number
  total_amount: number
  status: 'RETURNED' | 'CREDIT_NOTE_RECEIVED'
  notes: string | null
  created_at: string
}

function mapExpiryReturnRow(row: ExpiryReturnRow): ExpiryReturn {
  return {
    id: row.id,
    returnNo: row.return_no,
    returnDate: row.return_date,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierPhone: row.supplier_phone,
    productId: row.product_id,
    productName: row.product_name,
    batchId: row.batch_id,
    batchNo: row.batch_no,
    expDate: row.exp_date,
    packLabel: row.pack_label,
    qtyStrips: row.qty_strips,
    purchaseRate: row.purchase_rate,
    totalAmount: row.total_amount,
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at
  }
}

export const expiryReturnRepository = {
  list(): ExpiryReturn[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT er.*, s.name as supplier_name, s.phone as supplier_phone
      FROM expiry_returns er
      JOIN suppliers s ON er.supplier_id = s.id
      ORDER BY er.id DESC
    `)
    return (stmt.all() as ExpiryReturnRow[]).map(mapExpiryReturnRow)
  },

  getEligibleBatches(): ProductBatch[] {
    const db = getDatabase()
    // Return all active batches with stock > 0, joining products and suppliers
    const stmt = db.prepare(`
      SELECT pb.*, p.name as product_name, p.pack_label, p.units_per_pack, s.name as supplier_name
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      LEFT JOIN suppliers s ON pb.supplier_id = s.id
      WHERE pb.is_active = 1 AND pb.stock_loose_units > 0
      ORDER BY pb.exp_sort_key ASC
    `)

    interface BatchJoinRow {
      id: number
      product_id: number
      product_name: string
      pack_label: string
      units_per_pack: number
      batch_no: string
      exp_date: string
      exp_sort_key: number
      mrp: number
      purchase_rate: number
      stock_loose_units: number
      supplier_id: number | null
      supplier_name: string | null
      is_active: number
    }

    const rows = stmt.all() as BatchJoinRow[]
    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      packLabel: r.pack_label,
      unitsPerPack: r.units_per_pack,
      batchNo: r.batch_no,
      expDate: r.exp_date,
      expSortKey: r.exp_sort_key,
      mrp: r.mrp,
      purchaseRate: r.purchase_rate,
      stockLooseUnits: r.stock_loose_units,
      stockStrips: Math.floor(r.stock_loose_units / r.units_per_pack),
      stockLoose: r.stock_loose_units % r.units_per_pack,
      supplierId: r.supplier_id ?? undefined,
      supplierName: r.supplier_name ?? undefined,
      isActive: r.is_active === 1
    }))
  },

  generateNextReturnNumber(): string {
    const db = getDatabase()
    const lastRow = db
      .prepare('SELECT return_no FROM expiry_returns ORDER BY id DESC LIMIT 1')
      .get() as { return_no?: string } | undefined

    if (!lastRow || !lastRow.return_no) {
      return 'RET-0001'
    }

    const clean = lastRow.return_no.replace(/\D/g, '')
    const num = parseInt(clean, 10)
    if (isNaN(num)) {
      return 'RET-0001'
    }

    const next = (num + 1).toString().padStart(4, '0')
    return `RET-${next}`
  },

  create(input: CreateExpiryReturnInput): ExpiryReturn {
    const db = getDatabase()
    const qtyStrips = Math.max(1, Number(input.qtyStrips) || 1)

    const batch = db
      .prepare(`
      SELECT pb.*, p.name as product_name, p.pack_label, p.units_per_pack
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE pb.id = ?
    `)
      .get(input.batchId) as
      | {
          id: number
          product_id: number
          product_name: string
          pack_label: string
          units_per_pack: number
          batch_no: string
          exp_date: string
          mrp: number
          purchase_rate: number
          stock_loose_units: number
          supplier_id: number | null
        }
      | undefined

    if (!batch) throw new Error('Batch not found')

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(input.supplierId) as {
      id: number
      name: string
    }
    if (!supplier) throw new Error('Supplier / Dokan not found')

    const unitsToDeduct = qtyStrips * batch.units_per_pack
    if (batch.stock_loose_units < unitsToDeduct) {
      throw new Error(
        `Insufficient stock to return ${qtyStrips} strips. Available: ${Math.floor(
          batch.stock_loose_units / batch.units_per_pack
        )} strips`
      )
    }

    const rate = batch.purchase_rate > 0 ? batch.purchase_rate : batch.mrp
    const totalAmount = Number((qtyStrips * rate).toFixed(2))
    const returnNumber = this.generateNextReturnNumber()

    const d = new Date()
    const today = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`

    let createdId = 0

    const tx = db.transaction(() => {
      // 1. Deduct stock from product_batches
      db.prepare(`
        UPDATE product_batches
        SET stock_loose_units = stock_loose_units - ?
        WHERE id = ?
      `).run(unitsToDeduct, batch.id)

      // 2. Insert into expiry_returns
      const stmt = db.prepare(`
        INSERT INTO expiry_returns (
          return_no, return_date, supplier_id, product_id, batch_id, product_name,
          batch_no, exp_date, pack_label, qty_strips, purchase_rate, total_amount, status, notes
        ) VALUES (
          @return_no, @return_date, @supplier_id, @product_id, @batch_id, @product_name,
          @batch_no, @exp_date, @pack_label, @qty_strips, @purchase_rate, @total_amount, 'RETURNED', @notes
        )
      `)

      const res = stmt.run({
        return_no: returnNumber,
        return_date: today,
        supplier_id: input.supplierId,
        product_id: batch.product_id,
        batch_id: batch.id,
        product_name: batch.product_name,
        batch_no: batch.batch_no,
        exp_date: batch.exp_date,
        pack_label: batch.pack_label,
        qty_strips: qtyStrips,
        purchase_rate: rate,
        total_amount: totalAmount,
        notes: input.notes || 'Expiry return / debit note to supplier'
      })
      createdId = Number(res.lastInsertRowid)

      // 3. Record Return Adjustment in supplier_payments (Debit Note)
      db.prepare(`
        INSERT INTO supplier_payments (
          supplier_id, payment_date, amount, payment_mode, notes
        ) VALUES (
          @supplier_id, @payment_date, @amount, 'RETURN_ADJUSTMENT', @notes
        )
      `).run({
        supplier_id: input.supplierId,
        payment_date: today,
        amount: totalAmount,
        notes: `Debit Note for Expiry Return ${returnNumber} (${batch.product_name} B:${batch.batch_no})`
      })

      // 4. Deduct return amount from supplier's outstanding due balance
      db.prepare(`
        UPDATE suppliers SET
          current_balance = current_balance - @amount,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        amount: totalAmount,
        id: input.supplierId
      })
    })

    tx()

    const created = db
      .prepare(`
      SELECT er.*, s.name as supplier_name, s.phone as supplier_phone
      FROM expiry_returns er
      JOIN suppliers s ON er.supplier_id = s.id
      WHERE er.id = ?
    `)
      .get(createdId) as ExpiryReturnRow

    return mapExpiryReturnRow(created)
  }
}
