import { getDatabase } from '../database'
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@shared/types'

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
  }
}
