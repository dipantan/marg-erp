import { getDatabase } from '../database'
import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerPayment,
  RecordCustomerPaymentInput,
  CustomerMedicineHistoryItem
} from '@shared/types'

interface CustomerRow {
  id: number
  name: string
  age_gender: string | null
  phone: string
  address: string | null
  current_balance: number
  created_at: string
  updated_at: string
}

interface CustomerHistoryRow {
  id: number
  invoice_id: number
  invoice_no: string
  invoice_date: string
  invoice_type: 'RETAIL' | 'WHOLESALE'
  grand_total: number
  payment_mode: string
  payment_status: string
  product_name: string
  pack: string
  batch: string
  exp: string
  qty_strip: number
  qty_loose: number
  mrp: number
  amount: number
}

function mapRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    ageGender: row.age_gender || '',
    phone: row.phone,
    address: row.address || '',
    currentBalance: row.current_balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const customerRepository = {
  list(searchQuery?: string): Customer[] {
    const db = getDatabase()
    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`
      const stmt = db.prepare(`
        SELECT * FROM customers
        WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?
        ORDER BY name ASC
      `)
      return (stmt.all(q, q, q) as CustomerRow[]).map(mapRow)
    }

    const stmt = db.prepare('SELECT * FROM customers ORDER BY name ASC')
    return (stmt.all() as CustomerRow[]).map(mapRow)
  },

  getById(id: number): Customer | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?')
    const row = stmt.get(id) as CustomerRow | undefined
    return row ? mapRow(row) : null
  },

  create(input: CreateCustomerInput): Customer {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO customers (
        name, age_gender, phone, address, current_balance
      ) VALUES (
        @name, @age_gender, @phone, @address, @current_balance
      )
    `)

    const info = stmt.run({
      name: input.name.trim(),
      age_gender: input.ageGender?.trim() || '',
      phone: input.phone?.trim() || '',
      address: input.address?.trim() || '',
      current_balance: Number(input.currentBalance) || 0
    })

    return this.getById(Number(info.lastInsertRowid))!
  },

  update(input: UpdateCustomerInput): Customer {
    const db = getDatabase()
    const current = this.getById(input.id)
    if (!current) {
      throw new Error(`Customer with ID ${input.id} not found`)
    }

    const merged = {
      id: input.id,
      name: (input.name ?? current.name).trim(),
      age_gender: input.ageGender ?? current.ageGender,
      phone: input.phone ?? current.phone,
      address: input.address ?? current.address,
      current_balance:
        input.currentBalance !== undefined ? Number(input.currentBalance) : current.currentBalance
    }

    const stmt = db.prepare(`
      UPDATE customers SET
        name = @name,
        age_gender = @age_gender,
        phone = @phone,
        address = @address,
        current_balance = @current_balance,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)

    stmt.run(merged)
    return this.getById(input.id)!
  },

  delete(id: number): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM customers WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  getHistory(customerId: number): CustomerMedicineHistoryItem[] {
    const db = getDatabase()
    const customer = this.getById(customerId)
    if (!customer) return []

    // Match by customer_id or customer name (case-insensitive)
    const stmt = db.prepare(`
      SELECT
        ii.id,
        inv.id as invoice_id,
        inv.invoice_no,
        inv.invoice_date,
        COALESCE(inv.invoice_type, 'RETAIL') as invoice_type,
        inv.grand_total,
        inv.payment_mode,
        inv.payment_status,
        ii.product_name,
        ii.pack,
        ii.batch,
        ii.exp,
        ii.qty_strip,
        ii.qty_loose,
        ii.mrp,
        ii.amount
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      WHERE inv.customer_id = ? OR inv.patient_name = ? COLLATE NOCASE
      ORDER BY inv.id DESC, ii.id ASC
    `)

    const rows = stmt.all(customerId, customer.name) as CustomerHistoryRow[]
    return rows.map((r) => ({
      id: r.id,
      invoiceId: r.invoice_id,
      invoiceNo: r.invoice_no,
      invoiceDate: r.invoice_date,
      invoiceType: r.invoice_type,
      grandTotal: r.grand_total,
      paymentMode: r.payment_mode,
      paymentStatus: r.payment_status,
      productName: r.product_name,
      pack: r.pack,
      batchNo: r.batch,
      expiryDate: r.exp,
      qtyPack: r.qty_strip,
      qtyLoose: r.qty_loose,
      mrp: r.mrp,
      amount: r.amount
    }))
  },

  recordPayment(input: RecordCustomerPaymentInput): CustomerPayment {
    const db = getDatabase()
    const customer = this.getById(input.customerId)
    if (!customer) throw new Error('Customer not found')

    const amount = Number(input.amount) || 0
    if (amount <= 0) throw new Error('Payment amount must be greater than zero')

    let createdId = 0

    const tx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO customer_payments (
          customer_id, payment_date, amount, payment_mode, notes
        ) VALUES (
          @customer_id, @payment_date, @amount, @payment_mode, @notes
        )
      `)

      const res = stmt.run({
        customer_id: input.customerId,
        payment_date: input.paymentDate,
        amount,
        payment_mode: input.paymentMode,
        notes: input.notes || ''
      })
      createdId = Number(res.lastInsertRowid)

      // Deduct from customer due balance
      db.prepare(`
        UPDATE customers SET
          current_balance = current_balance - @amount,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `).run({
        amount,
        id: input.customerId
      })
    })

    tx()

    return {
      id: createdId,
      customerId: input.customerId,
      customerName: customer.name,
      paymentDate: input.paymentDate,
      amount,
      paymentMode: input.paymentMode,
      notes: input.notes || '',
      createdAt: new Date().toISOString()
    }
  }
}
