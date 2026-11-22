import { getDatabase } from '../database'
import type {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierPurchase,
  CreateSupplierPurchaseInput,
  SupplierPayment,
  RecordSupplierPaymentInput,
  BalanceSheetSummary
} from '@shared/types'

interface SupplierRow {
  id: number
  name: string
  phone: string | null
  gstin: string | null
  drug_lic_no: string | null
  address: string | null
  total_purchases: number
  total_paid: number
  current_balance: number
  created_at: string
  updated_at: string
}

interface PurchaseRow {
  id: number
  supplier_id: number
  supplier_name?: string
  bill_no: string
  bill_date: string
  total_amount: number
  paid_amount: number
  due_amount: number
  notes: string | null
  created_at: string
}

interface PaymentRow {
  id: number
  supplier_id: number
  supplier_name?: string
  purchase_id: number | null
  payment_date: string
  amount: number
  payment_mode: 'CASH' | 'BANK' | 'UPI' | 'CHEQUE' | 'RETURN_ADJUSTMENT'
  notes: string | null
  created_at: string
}

function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    gstin: row.gstin || '',
    drugLicNo: row.drug_lic_no || '',
    address: row.address || '',
    totalPurchases: Number(row.total_purchases || 0),
    totalPaid: Number(row.total_paid || 0),
    currentBalance: Number(row.current_balance || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const supplierRepository = {
  list(searchQuery?: string): Supplier[] {
    const db = getDatabase()
    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`
      const stmt = db.prepare(`
        SELECT * FROM suppliers
        WHERE name LIKE ? OR phone LIKE ? OR gstin LIKE ?
        ORDER BY name ASC
      `)
      return (stmt.all(q, q, q) as SupplierRow[]).map(mapSupplierRow)
    }

    const stmt = db.prepare('SELECT * FROM suppliers ORDER BY name ASC')
    return (stmt.all() as SupplierRow[]).map(mapSupplierRow)
  },

  getById(id: number): Supplier | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM suppliers WHERE id = ?')
    const row = stmt.get(id) as SupplierRow | undefined
    return row ? mapSupplierRow(row) : null
  },

  create(input: CreateSupplierInput): Supplier {
    const db = getDatabase()
    const openingBalance = Number(input.openingBalance) || 0

    const stmt = db.prepare(`
      INSERT INTO suppliers (
        name, phone, gstin, drug_lic_no, address, total_purchases, total_paid, current_balance
      ) VALUES (
        @name, @phone, @gstin, @drug_lic_no, @address, @total_purchases, 0, @current_balance
      )
    `)

    const info = stmt.run({
      name: input.name.trim(),
      phone: input.phone?.trim() || '',
      gstin: input.gstin?.trim() || '',
      drug_lic_no: input.drugLicNo?.trim() || '',
      address: input.address?.trim() || '',
      total_purchases: openingBalance,
      current_balance: openingBalance
    })

    return this.getById(Number(info.lastInsertRowid))!
  },

  update(input: UpdateSupplierInput): Supplier {
    const db = getDatabase()
    const current = this.getById(input.id)
    if (!current) throw new Error(`Supplier ${input.id} not found`)

    const stmt = db.prepare(`
      UPDATE suppliers SET
        name = @name,
        phone = @phone,
        gstin = @gstin,
        drug_lic_no = @drug_lic_no,
        address = @address,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)

    stmt.run({
      id: input.id,
      name: (input.name ?? current.name).trim(),
      phone: input.phone ?? current.phone,
      gstin: input.gstin ?? current.gstin,
      drug_lic_no: input.drugLicNo ?? current.drugLicNo,
      address: input.address ?? current.address
    })

    return this.getById(input.id)!
  },

  delete(id: number): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM suppliers WHERE id = ?')
    const res = stmt.run(id)
    return res.changes > 0
  },

  listPurchases(supplierId?: number): SupplierPurchase[] {
    const db = getDatabase()
    let rows: PurchaseRow[]

    if (supplierId) {
      const stmt = db.prepare(`
        SELECT sp.*, s.name as supplier_name
        FROM supplier_purchases sp
        JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.supplier_id = ?
        ORDER BY sp.id DESC
      `)
      rows = stmt.all(supplierId) as PurchaseRow[]
    } else {
      const stmt = db.prepare(`
        SELECT sp.*, s.name as supplier_name
        FROM supplier_purchases sp
        JOIN suppliers s ON sp.supplier_id = s.id
        ORDER BY sp.id DESC
      `)
      rows = stmt.all() as PurchaseRow[]
    }

    return rows.map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      billNo: r.bill_no,
      billDate: r.bill_date,
      totalAmount: r.total_amount,
      paidAmount: r.paid_amount,
      dueAmount: r.due_amount,
      notes: r.notes || '',
      createdAt: r.created_at
    }))
  },

  createPurchase(input: CreateSupplierPurchaseInput): SupplierPurchase {
    const db = getDatabase()
    const supplier = this.getById(input.supplierId)
    if (!supplier) throw new Error('Supplier not found')

    const totalAmount = Number(input.totalAmount) || 0
    const paidAmount = Number(input.paidAmount) || 0
    const dueAmount = Number((totalAmount - paidAmount).toFixed(2))

    let createdId = 0

    const tx = db.transaction(() => {
      const pStmt = db.prepare(`
        INSERT INTO supplier_purchases (
          supplier_id, bill_no, bill_date, total_amount, paid_amount, due_amount, notes
        ) VALUES (
          @supplier_id, @bill_no, @bill_date, @total_amount, @paid_amount, @due_amount, @notes
        )
      `)

      const pRes = pStmt.run({
        supplier_id: input.supplierId,
        bill_no: input.billNo.trim(),
        bill_date: input.billDate,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_amount: dueAmount,
        notes: input.notes || ''
      })
      createdId = Number(pRes.lastInsertRowid)

      // If initial payment was made at time of purchase, log payment
      if (paidAmount > 0) {
        db.prepare(`
          INSERT INTO supplier_payments (
            supplier_id, purchase_id, payment_date, amount, payment_mode, notes
          ) VALUES (
            @supplier_id, @purchase_id, @payment_date, @amount, 'CASH', 'Initial payment on purchase bill'
          )
        `).run({
          supplier_id: input.supplierId,
          purchase_id: createdId,
          payment_date: input.billDate,
          amount: paidAmount
        })
      }

      // Update supplier balance
      db.prepare(`
        UPDATE suppliers SET
          total_purchases = total_purchases + @total,
          total_paid = total_paid + @paid,
          current_balance = current_balance + @due,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        total: totalAmount,
        paid: paidAmount,
        due: dueAmount,
        id: input.supplierId
      })
    })

    tx()

    const created = db.prepare(`
      SELECT sp.*, s.name as supplier_name
      FROM supplier_purchases sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE sp.id = ?
    `).get(createdId) as PurchaseRow

    return {
      id: created.id,
      supplierId: created.supplier_id,
      supplierName: created.supplier_name,
      billNo: created.bill_no,
      billDate: created.bill_date,
      totalAmount: created.total_amount,
      paidAmount: created.paid_amount,
      dueAmount: created.due_amount,
      notes: created.notes || '',
      createdAt: created.created_at
    }
  },

  listPayments(supplierId?: number): SupplierPayment[] {
    const db = getDatabase()
    let rows: PaymentRow[]

    if (supplierId) {
      const stmt = db.prepare(`
        SELECT sp.*, s.name as supplier_name
        FROM supplier_payments sp
        JOIN suppliers s ON sp.supplier_id = s.id
        WHERE sp.supplier_id = ?
        ORDER BY sp.id DESC
      `)
      rows = stmt.all(supplierId) as PaymentRow[]
    } else {
      const stmt = db.prepare(`
        SELECT sp.*, s.name as supplier_name
        FROM supplier_payments sp
        JOIN suppliers s ON sp.supplier_id = s.id
        ORDER BY sp.id DESC
      `)
      rows = stmt.all() as PaymentRow[]
    }

    return rows.map((r) => ({
      id: r.id,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      purchaseId: r.purchase_id ?? undefined,
      paymentDate: r.payment_date,
      amount: r.amount,
      paymentMode: r.payment_mode,
      notes: r.notes || '',
      createdAt: r.created_at
    }))
  },

  recordPayment(input: RecordSupplierPaymentInput): SupplierPayment {
    const db = getDatabase()
    const supplier = this.getById(input.supplierId)
    if (!supplier) throw new Error('Supplier not found')

    const amount = Number(input.amount) || 0
    if (amount <= 0) throw new Error('Payment amount must be greater than zero')

    let createdId = 0

    const tx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO supplier_payments (
          supplier_id, purchase_id, payment_date, amount, payment_mode, notes
        ) VALUES (
          @supplier_id, @purchase_id, @payment_date, @amount, @payment_mode, @notes
        )
      `)

      const res = stmt.run({
        supplier_id: input.supplierId,
        purchase_id: input.purchaseId ?? null,
        payment_date: input.paymentDate,
        amount,
        payment_mode: input.paymentMode,
        notes: input.notes || ''
      })
      createdId = Number(res.lastInsertRowid)

      // Deduct from supplier due balance
      db.prepare(`
        UPDATE suppliers SET
          total_paid = total_paid + @amount,
          current_balance = current_balance - @amount,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        amount,
        id: input.supplierId
      })
    })

    tx()

    const created = db.prepare(`
      SELECT sp.*, s.name as supplier_name
      FROM supplier_payments sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE sp.id = ?
    `).get(createdId) as PaymentRow

    return {
      id: created.id,
      supplierId: created.supplier_id,
      supplierName: created.supplier_name,
      purchaseId: created.purchase_id ?? undefined,
      paymentDate: created.payment_date,
      amount: created.amount,
      paymentMode: created.payment_mode,
      notes: created.notes || '',
      createdAt: created.created_at
    }
  },

  getBalanceSheetSummary(): BalanceSheetSummary {
    const db = getDatabase()

    const custDueRow = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as totalDue,
             COUNT(CASE WHEN current_balance > 0 THEN 1 END) as dueCount
      FROM customers
    `).get() as { totalDue: number; dueCount: number }

    const suppDueRow = db.prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as totalDue,
             COUNT(*) as suppCount
      FROM suppliers
    `).get() as { totalDue: number; suppCount: number }

    const salesRow = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as totalSales
      FROM invoices
    `).get() as { totalSales: number }

    const purchasesRow = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalPurchases
      FROM supplier_purchases
    `).get() as { totalPurchases: number }

    const returnsRow = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalReturns
      FROM expiry_returns
    `).get() as { totalReturns: number }

    return {
      totalReceivables: Number((custDueRow.totalDue || 0).toFixed(2)),
      totalPayables: Number((suppDueRow.totalDue || 0).toFixed(2)),
      totalSalesRevenue: Number((salesRow.totalSales || 0).toFixed(2)),
      totalPurchaseExpense: Number((purchasesRow.totalPurchases || 0).toFixed(2)),
      totalExpiryReturnedAmount: Number((returnsRow.totalReturns || 0).toFixed(2)),
      suppliersCount: suppDueRow.suppCount || 0,
      customersWithDueCount: custDueRow.dueCount || 0
    }
  }
}
