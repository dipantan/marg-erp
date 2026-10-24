import { getDatabase, parseExpSortKey } from '../database'
import type {
  ProductWithBatches,
  ProductBatch,
  CreateProductInput,
  CreateBatchInput,
  PurchaseImportItem
} from '@shared/types'

interface ProductRow {
  id: number
  name: string
  hsn_code: string
  pack_label: string
  units_per_pack: number
  is_schedule_h: number
  default_gst_rate: number
  reorder_level: number
  created_at: string
}

interface BatchRow {
  id: number
  product_id: number
  batch_no: string
  exp_date: string
  exp_sort_key: number
  mrp: number
  purchase_rate: number
  stock_loose_units: number
  is_active: number
}

function mapBatch(
  b: BatchRow,
  unitsPerPack: number,
  productName?: string,
  packLabel?: string
): ProductBatch {
  return {
    id: b.id,
    productId: b.product_id,
    productName,
    packLabel,
    unitsPerPack,
    batchNo: b.batch_no,
    expDate: b.exp_date,
    expSortKey: b.exp_sort_key,
    mrp: b.mrp,
    purchaseRate: b.purchase_rate,
    stockLooseUnits: b.stock_loose_units,
    stockStrips: Math.floor(b.stock_loose_units / unitsPerPack),
    stockLoose: b.stock_loose_units % unitsPerPack,
    isActive: b.is_active === 1
  }
}

function mapProductWithBatches(p: ProductRow, batchRows: BatchRow[]): ProductWithBatches {
  const batches = batchRows.map((b) => mapBatch(b, p.units_per_pack, p.name, p.pack_label))
  let totalLoose = 0
  batches.forEach((b) => {
    totalLoose += b.stockLooseUnits
  })

  return {
    id: p.id,
    name: p.name,
    hsnCode: p.hsn_code,
    packLabel: p.pack_label,
    unitsPerPack: p.units_per_pack,
    isScheduleH: p.is_schedule_h === 1,
    defaultGstRate: p.default_gst_rate,
    reorderLevel: p.reorder_level,
    createdAt: p.created_at,
    batches,
    totalStockStrips: Math.floor(totalLoose / p.units_per_pack),
    totalStockLoose: totalLoose % p.units_per_pack
  }
}

export const itemRepository = {
  list(searchQuery?: string): ProductWithBatches[] {
    const db = getDatabase()
    let products: ProductRow[]

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`
      const stmt = db.prepare(`
        SELECT DISTINCT p.* FROM products p
        LEFT JOIN product_batches b ON p.id = b.product_id
        WHERE p.name LIKE ? OR b.batch_no LIKE ? OR p.hsn_code LIKE ?
        ORDER BY p.name ASC
      `)
      products = stmt.all(q, q, q) as ProductRow[]
    } else {
      const stmt = db.prepare('SELECT * FROM products ORDER BY name ASC')
      products = stmt.all() as ProductRow[]
    }

    const batchStmt = db.prepare(`
      SELECT * FROM product_batches
      WHERE product_id = ? AND is_active = 1
      ORDER BY exp_sort_key ASC
    `)

    return products.map((p) => {
      const bRows = batchStmt.all(p.id) as BatchRow[]
      return mapProductWithBatches(p, bRows)
    })
  },

  ftsSearch(query: string): ProductWithBatches[] {
    const db = getDatabase()
    if (!query || !query.trim()) return this.list()

    const cleanQuery = query.trim().replace(/[*^"']/g, '') + '*'
    try {
      const stmt = db.prepare(`
        SELECT p.* FROM products p
        JOIN products_fts fts ON p.id = fts.rowid
        WHERE products_fts MATCH ?
        ORDER BY p.name ASC
        LIMIT 25
      `)
      const products = stmt.all(cleanQuery) as ProductRow[]

      const batchStmt = db.prepare(`
        SELECT * FROM product_batches
        WHERE product_id = ? AND is_active = 1
        ORDER BY exp_sort_key ASC
      `)

      return products.map((p) => {
        const bRows = batchStmt.all(p.id) as BatchRow[]
        return mapProductWithBatches(p, bRows)
      })
    } catch {
      // Fallback to standard LIKE search if FTS syntax fails
      return this.list(query)
    }
  },

  getById(id: number): ProductWithBatches | null {
    const db = getDatabase()
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
    if (!p) return null

    const bRows = db
      .prepare(
        `
      SELECT * FROM product_batches
      WHERE product_id = ? AND is_active = 1
      ORDER BY exp_sort_key ASC
    `
      )
      .all(id) as BatchRow[]

    return mapProductWithBatches(p, bRows)
  },

  getBatches(productId: number): ProductBatch[] {
    const db = getDatabase()
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as
      ProductRow | undefined
    if (!p) return []

    const bRows = db
      .prepare(
        `
      SELECT * FROM product_batches
      WHERE product_id = ? AND is_active = 1
      ORDER BY exp_sort_key ASC
    `
      )
      .all(productId) as BatchRow[]

    return bRows.map((b) => mapBatch(b, p.units_per_pack, p.name, p.pack_label))
  },

  getExpiringSoon(): ProductBatch[] {
    const db = getDatabase()
    const currentYearMonth = new Date().getFullYear() * 100 + (new Date().getMonth() + 1)
    const alertYearMonth = currentYearMonth + 100 // 1 year ahead

    const stmt = db.prepare(`
      SELECT pb.*, p.name as product_name, p.pack_label, p.units_per_pack
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE pb.is_active = 1 AND pb.exp_sort_key <= ?
      ORDER BY pb.exp_sort_key ASC
    `)

    const rows = stmt.all(alertYearMonth) as Array<
      BatchRow & { product_name: string; pack_label: string; units_per_pack: number }
    >
    return rows.map((r) => mapBatch(r, r.units_per_pack, r.product_name, r.pack_label))
  },

  create(input: CreateProductInput): ProductWithBatches {
    const db = getDatabase()
    const unitsPerPack = Number(input.unitsPerPack) || 10

    let createdProductId = 0

    const executeTx = db.transaction(() => {
      const pRes = db
        .prepare(
          `
        INSERT INTO products (name, hsn_code, pack_label, units_per_pack, is_schedule_h, default_gst_rate, reorder_level)
        VALUES (@name, @hsn_code, @pack_label, @units_per_pack, @is_schedule_h, @default_gst_rate, @reorder_level)
      `
        )
        .run({
          name: input.name.trim(),
          hsn_code: input.hsnCode || '3004',
          pack_label: input.packLabel.trim(),
          units_per_pack: unitsPerPack,
          is_schedule_h: input.isScheduleH ? 1 : 0,
          default_gst_rate: Number(input.defaultGstRate) || 5.0,
          reorder_level: Number(input.reorderLevel) || 10
        })

      createdProductId = Number(pRes.lastInsertRowid)

      if (input.initialBatch && input.initialBatch.batchNo) {
        const totalLoose =
          Number(input.initialBatch.stockStrips || 0) * unitsPerPack +
          Number(input.initialBatch.stockLoose || 0)

        db.prepare(
          `
          INSERT INTO product_batches (product_id, batch_no, exp_date, exp_sort_key, mrp, purchase_rate, stock_loose_units, is_active)
          VALUES (@product_id, @batch_no, @exp_date, @exp_sort_key, @mrp, @purchase_rate, @stock_loose_units, 1)
        `
        ).run({
          product_id: createdProductId,
          batch_no: input.initialBatch.batchNo.trim().toUpperCase(),
          exp_date: input.initialBatch.expDate.trim(),
          exp_sort_key: parseExpSortKey(input.initialBatch.expDate),
          mrp: Number(input.initialBatch.mrp) || 0,
          purchase_rate: Number(input.initialBatch.purchaseRate) || 0,
          stock_loose_units: totalLoose
        })
      }
    })

    executeTx()
    return this.getById(createdProductId)!
  },

  createBatch(input: CreateBatchInput): ProductBatch {
    const db = getDatabase()
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(input.productId) as ProductRow
    if (!p) throw new Error('Product not found')

    const totalLoose =
      Number(input.stockStrips || 0) * p.units_per_pack + Number(input.stockLoose || 0)
    const bRes = db
      .prepare(
        `
      INSERT INTO product_batches (product_id, batch_no, exp_date, exp_sort_key, mrp, purchase_rate, stock_loose_units, is_active)
      VALUES (@product_id, @batch_no, @exp_date, @exp_sort_key, @mrp, @purchase_rate, @stock_loose_units, 1)
    `
      )
      .run({
        product_id: input.productId,
        batch_no: input.batchNo.trim().toUpperCase(),
        exp_date: input.expDate.trim(),
        exp_sort_key: parseExpSortKey(input.expDate),
        mrp: Number(input.mrp) || 0,
        purchase_rate: Number(input.purchaseRate) || 0,
        stock_loose_units: totalLoose
      })

    const bRow = db
      .prepare('SELECT * FROM product_batches WHERE id = ?')
      .get(bRes.lastInsertRowid) as BatchRow
    return mapBatch(bRow, p.units_per_pack, p.name, p.pack_label)
  },

  delete(id: number): boolean {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM products WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  importPurchase(items: PurchaseImportItem[]): { importedCount: number } {
    const db = getDatabase()
    let count = 0

    const executeTx = db.transaction(() => {
      const findProduct = db.prepare('SELECT * FROM products WHERE name = ? COLLATE NOCASE')
      const insertProduct = db.prepare(`
        INSERT INTO products (name, hsn_code, pack_label, units_per_pack, default_gst_rate, reorder_level)
        VALUES (@name, @hsn_code, @pack_label, @units_per_pack, 5.0, 10)
      `)
      const insertBatch = db.prepare(`
        INSERT INTO product_batches (product_id, batch_no, exp_date, exp_sort_key, mrp, purchase_rate, stock_loose_units, is_active)
        VALUES (@product_id, @batch_no, @exp_date, @exp_sort_key, @mrp, @purchase_rate, @stock_loose_units, 1)
      `)
      const updateBatchStock = db.prepare(`
        UPDATE product_batches
        SET stock_loose_units = stock_loose_units + ?,
            mrp = ?,
            purchase_rate = ?
        WHERE id = ?
      `)
      const findBatch = db.prepare(`
        SELECT * FROM product_batches
        WHERE product_id = ? AND batch_no = ? COLLATE NOCASE
      `)

      for (const item of items) {
        let p = findProduct.get(item.name.trim()) as ProductRow | undefined
        if (!p) {
          const res = insertProduct.run({
            name: item.name.trim(),
            hsn_code: item.hsnCode || '3004',
            pack_label: item.pack || '10S',
            units_per_pack: item.unitsPerPack || 10
          })
          p = db
            .prepare('SELECT * FROM products WHERE id = ?')
            .get(res.lastInsertRowid) as ProductRow
        }

        const unitsPerPack = p.units_per_pack
        const looseToAdd = item.qtyStrips * unitsPerPack

        const existingBatch = findBatch.get(p.id, item.batchNo.trim().toUpperCase()) as
          BatchRow | undefined
        if (existingBatch) {
          updateBatchStock.run(looseToAdd, item.mrp, item.purchaseRate, existingBatch.id)
        } else {
          insertBatch.run({
            product_id: p.id,
            batch_no: item.batchNo.trim().toUpperCase(),
            exp_date: item.expDate.trim(),
            exp_sort_key: parseExpSortKey(item.expDate),
            mrp: item.mrp,
            purchase_rate: item.purchaseRate,
            stock_loose_units: looseToAdd
          })
        }
        count++
      }
    })

    executeTx()
    return { importedCount: count }
  }
}
