export const CREATE_TABLES_SQL = `
-- 1. Store Master (Single Record)
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'M/S JANATA MEDICAL STORES',
  sub_title TEXT DEFAULT '(Chemist & druggist)',
  address_line1 TEXT NOT NULL DEFAULT 'TOWN- BUNIADPUR, P.O-BUNIADPUR',
  address_line2 TEXT DEFAULT 'DIST -DAKSHIN DINAJPUR',
  district_state TEXT DEFAULT 'DAKSHIN DINAJPUR, WEST BENGAL',
  mobile TEXT NOT NULL DEFAULT '9434220466',
  delivery_phone TEXT DEFAULT '9732101206',
  gstin TEXT NOT NULL DEFAULT '19ALGPS1320N1ZT',
  drug_lic_no TEXT NOT NULL DEFAULT 'WD-6172-S/WD-6173-SB / WB/DDP/NBOR/R/791800',
  drug_lic_no_wholesale TEXT DEFAULT 'WD-6172-W/WD-6173-WB / WB/DDP/NBOR/W/892100',
  fssai_no TEXT DEFAULT '22817005000401',
  registered_pharmacist TEXT DEFAULT 'SUJIT BHOWMIK (D.Pharm)',
  pharmacist_reg_no TEXT DEFAULT 'A-29233',
  upi_id TEXT DEFAULT '9434220466@upi',
  jurisdiction TEXT DEFAULT 'BUNIADPUR',
  terms_and_conditions TEXT DEFAULT '(1) Medicines are sold exchanged by looking at the expiry date including the bill within 15 days\n(2) All disputes subject to BUNIADPUR jurisdiction only.\n(3) cold storage/Refrigerated/Surgical Rehabilitation product cannot be returned.\n(4) PLEASE CONSULT DR. BEFORE USING THE MEDICINES\nE. & O.E. (ERRORS AND OMMITIONS SHALL BE REEMBERSED)',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Master
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '3004',
  pack_label TEXT NOT NULL DEFAULT '10S',
  units_per_pack INTEGER NOT NULL DEFAULT 10,
  is_schedule_h INTEGER DEFAULT 0,
  default_gst_rate REAL DEFAULT 5.0,
  reorder_level INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);

-- 3. Product Batches (Pharma MRP & Expiry are batch-tracked)
CREATE TABLE IF NOT EXISTS product_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  exp_date TEXT NOT NULL,
  exp_sort_key INTEGER NOT NULL,
  mrp REAL NOT NULL,
  purchase_rate REAL DEFAULT 0,
  stock_loose_units INTEGER NOT NULL DEFAULT 0,
  supplier_id INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_exp ON product_batches(exp_sort_key ASC);
CREATE INDEX IF NOT EXISTS idx_batches_no ON product_batches(batch_no);

-- 4. Patients / Customers Ledger
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age_gender TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  current_balance REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name COLLATE NOCASE);

-- 5. Invoices (Retail Cash Memo & Wholesale Tax Invoice)
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE NOT NULL,
  invoice_date TEXT NOT NULL,
  invoice_type TEXT DEFAULT 'RETAIL', -- 'RETAIL' or 'WHOLESALE'
  customer_id INTEGER,
  customer_dl_no TEXT DEFAULT '',
  customer_gstin TEXT DEFAULT '',
  patient_name TEXT NOT NULL,
  patient_meta TEXT DEFAULT '',
  patient_address TEXT DEFAULT '',
  patient_phone TEXT DEFAULT '',
  dr_name TEXT DEFAULT '',
  dr_reg_no TEXT DEFAULT '',
  payment_mode TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PAID',
  mrp_total REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  taxable_amount REAL NOT NULL DEFAULT 0,
  cgst_total REAL NOT NULL DEFAULT 0,
  sgst_total REAL NOT NULL DEFAULT 0,
  round_off REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_no ON invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_cust ON invoices(customer_id);

-- 6. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER,
  batch_id INTEGER,
  product_name TEXT NOT NULL,
  pack TEXT NOT NULL,
  hsn TEXT NOT NULL,
  exp TEXT NOT NULL,
  batch TEXT NOT NULL,
  qty_strip INTEGER NOT NULL DEFAULT 0,
  qty_loose INTEGER NOT NULL DEFAULT 0,
  mrp REAL NOT NULL,
  disc_percent REAL DEFAULT 10.0,
  gst_percent REAL DEFAULT 5.0,
  amount REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inv_items_inv ON invoice_items(invoice_id);

-- 7. Draft Bills Parking (F6 Hold / F7 Recall)
CREATE TABLE IF NOT EXISTS draft_invoices (
  id TEXT PRIMARY KEY,
  parked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  patient_name TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL
);

-- 8. Suppliers / Dokans Master
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  drug_lic_no TEXT DEFAULT '',
  address TEXT DEFAULT '',
  total_purchases REAL NOT NULL DEFAULT 0,
  total_paid REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name COLLATE NOCASE);

-- 9. Supplier Inward Purchases (Bills from Dokan)
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  bill_date TEXT NOT NULL,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  due_amount REAL NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON supplier_purchases(supplier_id);

-- 10. Supplier Payments (Payment towards Dokan Due)
CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_id INTEGER REFERENCES supplier_purchases(id) ON DELETE SET NULL,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT DEFAULT 'CASH',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_supplier ON supplier_payments(supplier_id);

-- 11. Customer Payments (Payment towards Customer Due)
CREATE TABLE IF NOT EXISTS customer_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT DEFAULT 'CASH',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_cust ON customer_payments(customer_id);

-- 12. Expiry Returns to Supplier (Debit Note)
CREATE TABLE IF NOT EXISTS expiry_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no TEXT UNIQUE NOT NULL,
  return_date TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER NOT NULL REFERENCES product_batches(id),
  product_name TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  exp_date TEXT NOT NULL,
  pack_label TEXT NOT NULL,
  qty_strips INTEGER NOT NULL,
  purchase_rate REAL NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'RETURNED',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expiry_supplier ON expiry_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expiry_batch ON expiry_returns(batch_id);

-- 13. Full-Text Search Virtual Table for instant auto-complete
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name,
  hsn_code,
  content='products',
  content_rowid='id'
);

-- Triggers to synchronize FTS5 with products table
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, hsn_code) VALUES (new.id, new.name, new.hsn_code);
END;

CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, hsn_code) VALUES ('delete', old.id, old.name, old.hsn_code);
END;

CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, name, hsn_code) VALUES ('delete', old.id, old.name, old.hsn_code);
  INSERT INTO products_fts(rowid, name, hsn_code) VALUES (new.id, new.name, new.hsn_code);
END;
`
