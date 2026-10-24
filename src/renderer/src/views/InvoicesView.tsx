import React, { useState } from 'react'
import { Plus, Trash2, Receipt, Printer, Eye, Search } from 'lucide-react'
import type { Invoice, ProductWithBatches, CreateInvoiceInput, StoreSettings } from '@shared/types'
import { CashMemoPrint } from '../components/CashMemoPrint'
import { Modal } from '../components/Modal'

interface InvoicesViewProps {
  invoices: Invoice[]
  items: ProductWithBatches[]
  store: StoreSettings | null
  isLoading: boolean
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  onCreateInvoice: (input: CreateInvoiceInput) => Promise<boolean>
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  items,
  store,
  isLoading,
  isCreateModalOpen,
  setIsCreateModalOpen,
  onCreateInvoice
}) => {
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null)
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')

  // Invoice creation form state (Native Date format YYYY-MM-DD)
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [patientName, setPatientName] = useState<string>('')
  const [patientAgeGender, setPatientAgeGender] = useState<string>('30/F')
  const [patientAddress, setPatientAddress] = useState<string>('')
  const [patientPhone, setPatientPhone] = useState<string>('')
  const [doctorName, setDoctorName] = useState<string>('Dr. P CHAKI')
  const [doctorRegNo, setDoctorRegNo] = useState<string>('')
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'DUE/CREDIT'>('CASH')
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING'>('PAID')
  const [notes, setNotes] = useState<string>('')

  // Line items state
  const [lineItems, setLineItems] = useState<
    Array<{
      productId: number
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
  >([])

  // Medicine selector state
  const [selectedProductId, setSelectedProductId] = useState<number>(items[0]?.id || 0)
  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(undefined)
  const [qtyPack, setQtyPack] = useState<number>(1)
  const [qtyLoose, setQtyLoose] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(10)
  const [submitting, setSubmitting] = useState(false)

  const currentSelectedProduct = items.find((i) => i.id === selectedProductId) || items[0]
  const currentSelectedBatch =
    currentSelectedProduct?.batches?.find((b) => b.id === selectedBatchId) ||
    currentSelectedProduct?.batches?.[0]

  // Add line item
  const handleAddLineItem = (): void => {
    const product = currentSelectedProduct
    if (!product) return
    const batch = currentSelectedBatch

    setLineItems((prev) => [
      ...prev,
      {
        productId: product.id,
        batchId: batch?.id,
        productName: product.name,
        pack: product.packLabel,
        hsnCode: product.hsnCode,
        batchNo: batch?.batchNo || 'GEN',
        expiryDate: batch?.expDate || '12/28',
        qtyPack,
        qtyLoose,
        unitsPerPack: product.unitsPerPack,
        mrp: batch?.mrp || 0,
        discountPercent: discountPercent,
        gstPercent: product.defaultGstRate || 5.0
      }
    ])

    setQtyPack(1)
    setQtyLoose(0)
  }

  const handleRemoveLineItem = (index: number): void => {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Live calculations
  let calculatedMrpTotal = 0
  let calculatedDiscountTotal = 0
  lineItems.forEach((it) => {
    const units = it.unitsPerPack || 10
    const totalPacks = it.qtyPack + it.qtyLoose / units
    const lineMrp = totalPacks * it.mrp
    const lineDisc = (lineMrp * it.discountPercent) / 100
    calculatedMrpTotal += lineMrp
    calculatedDiscountTotal += lineDisc
  })

  const netPayable = Math.round(calculatedMrpTotal - calculatedDiscountTotal)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!patientName.trim()) {
      alert('Please enter patient name.')
      return
    }
    if (lineItems.length === 0) {
      alert('Please add at least one medicine to the bill.')
      return
    }

    setSubmitting(true)

    const [y, m, d] = invoiceDate.split('-')
    const formattedInvoiceDate = y && m && d ? `${d}-${m}-${y}` : invoiceDate

    const success = await onCreateInvoice({
      invoiceDate: formattedInvoiceDate,
      patientName: patientName.trim(),
      patientAgeGender,
      patientAddress,
      patientPhone,
      doctorName,
      doctorRegNo,
      items: lineItems,
      paymentMode,
      paymentStatus,
      notes
    })

    setSubmitting(false)

    if (success) {
      setIsCreateModalOpen(false)
      setLineItems([])
      setPatientName('')
      setPatientAddress('')
      setPatientPhone('')
      // Automatically open the cash memo print preview for the newly generated invoice
      setTimeout(() => {
        if (invoices[0]) {
          setSelectedInvoiceForPrint(invoices[0])
        }
      }, 300)
    }
  }

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.doctorName.toLowerCase().includes(invoiceSearch.toLowerCase())
  )

  return (
    <div className="app-content">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <h2 className="card-title">Marg GST Cash Memos & Prescription Register</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Doctor prescription registry, batch/expiry tracking, and 1-click memo printing
              </span>
            </div>
            <div className="search-bar" style={{ width: '240px' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search memo #, patient, Dr..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>+ New Cash Memo</span>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading bills from SQLite...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No cash memos found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Memo No</th>
                  <th>Date</th>
                  <th>Patient Name</th>
                  <th>Doctor</th>
                  <th>MRP Total</th>
                  <th>Discount</th>
                  <th>Grand Total</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#818cf8' }}
                    >
                      {inv.invoiceNumber}
                    </td>
                    <td>{inv.invoiceDate}</td>
                    <td style={{ fontWeight: 600 }}>
                      {inv.patientName} {inv.patientAgeGender && `(${inv.patientAgeGender})`}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.doctorName || '-'}</td>
                    <td>₹{inv.mrpTotal.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)' }}>-₹{inv.discountTotal.toFixed(2)}</td>
                    <td style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>
                    <td>
                      <span className="badge badge-info">{inv.paymentMode}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${inv.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn-icon"
                          title="Print Marg Cash Memo"
                          onClick={() => setSelectedInvoiceForPrint(inv)}
                        >
                          <Printer size={15} color="#818cf8" />
                        </button>
                        <button
                          className="btn-icon"
                          title="View Details"
                          onClick={() => setSelectedInvoiceForView(inv)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Memo Print Modal (Replicating User's Picture) */}
      {selectedInvoiceForPrint && (
        <CashMemoPrint
          invoice={selectedInvoiceForPrint}
          store={store}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}

      {/* View Details Modal */}
      {selectedInvoiceForView && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoiceForView(null)}
          maxWidth="700px"
        >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Cash Memo #{selectedInvoiceForView.invoiceNumber}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Patient: {selectedInvoiceForView.patientName} • Dr:{' '}
                  {selectedInvoiceForView.doctorName}
                </span>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSelectedInvoiceForView(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Pack</th>
                      <th>Exp</th>
                      <th>Batch</th>
                      <th>Qty (P:L)</th>
                      <th>MRP</th>
                      <th>Disc%</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceForView.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{it.productName}</td>
                        <td>{it.pack}</td>
                        <td>{it.expiryDate}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{it.batchNo}</td>
                        <td>
                          {it.qtyPack}:{it.qtyLoose}
                        </td>
                        <td>₹{it.mrp.toFixed(2)}</td>
                        <td>{it.discountPercent}%</td>
                        <td style={{ fontWeight: 600 }}>₹{it.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const inv = selectedInvoiceForView
                  setSelectedInvoiceForView(null)
                  setSelectedInvoiceForPrint(inv)
                }}
              >
                <Printer size={15} /> Print Marg Memo
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoiceForView(null)}>
                Close
              </button>
            </div>
        </Modal>
      )}

      {/* Fast POS Billing Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="820px"
      >
        <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Generate GST Cash Memo (Prescription Register)</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Doctor prescription sale with loose tablet support & batch/expiry tracking
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Patient & Doctor Header Details */}
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Patient Name *</label>
                    <input
                      className="input-text"
                      placeholder="e.g. SURAJMANI TUDU"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Age/Gender</label>
                      <input
                        className="input-text"
                        placeholder="e.g. 30/F"
                        value={patientAgeGender}
                        onChange={(e) => setPatientAgeGender(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Invoice Date *</label>
                      <input
                        type="date"
                        className="input-text"
                        style={{ colorScheme: 'dark' }}
                        required
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Patient Address</label>
                    <input
                      className="input-text"
                      placeholder="e.g. KARKHA, BUNIADPUR"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Prescribing Doctor</label>
                      <input
                        className="input-text"
                        placeholder="e.g. Dr. P CHAKI"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Doctor Reg No.</label>
                      <input
                        className="input-text"
                        placeholder="e.g. WB-MC-4120"
                        value={doctorRegNo}
                        onChange={(e) => setDoctorRegNo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Patient Phone</label>
                    <input
                      className="input-text"
                      placeholder="e.g. 9434220466"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Prescription / Bill Notes</label>
                    <input
                      className="input-text"
                      placeholder="e.g. Consult Dr. before repeating"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Medicine Selector Box */}
                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      Select Medicine SKU
                    </span>
                    {currentSelectedProduct && (
                      <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                        Pack: {currentSelectedProduct.packLabel} • Batch:{' '}
                        {currentSelectedBatch?.batchNo || '-'} • Exp:{' '}
                        {currentSelectedBatch?.expDate || '-'} • Stock:{' '}
                        {currentSelectedProduct.totalStockStrips}p:
                        {currentSelectedProduct.totalStockLoose}l
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        currentSelectedProduct?.batches && currentSelectedProduct.batches.length > 1
                          ? '1.8fr 1.2fr 75px 75px 75px auto'
                          : '2fr 80px 80px 80px auto',
                      gap: '10px',
                      alignItems: 'flex-end'
                    }}
                  >
                    <div className="input-group">
                      <label className="input-label">Medicine Name</label>
                      <select
                        className="input-select"
                        value={selectedProductId || items[0]?.id}
                        onChange={(e) => {
                          const pId = parseInt(e.target.value, 10)
                          setSelectedProductId(pId)
                          const prod = items.find((i) => i.id === pId)
                          setSelectedBatchId(prod?.batches?.[0]?.id)
                        }}
                      >
                        {items.map((i) => {
                          const b = i.batches?.[0]
                          return (
                            <option key={i.id} value={i.id}>
                              {i.name} (₹{b?.mrp?.toFixed(2) || '0.00'} | {i.packLabel})
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {currentSelectedProduct?.batches &&
                      currentSelectedProduct.batches.length > 1 && (
                        <div className="input-group">
                          <label className="input-label">Batch (FEFO)</label>
                          <select
                            className="input-select"
                            value={currentSelectedBatch?.id}
                            onChange={(e) => setSelectedBatchId(parseInt(e.target.value, 10))}
                          >
                            {currentSelectedProduct.batches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.batchNo} ({b.expDate}) ₹{b.mrp.toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                    <div className="input-group">
                      <label className="input-label">Qty (Strip)</label>
                      <input
                        type="number"
                        min="0"
                        className="input-text"
                        value={qtyPack}
                        onChange={(e) => setQtyPack(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Qty (Loose)</label>
                      <input
                        type="number"
                        min="0"
                        className="input-text"
                        value={qtyLoose}
                        onChange={(e) => setQtyLoose(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Disc %</label>
                      <input
                        type="number"
                        className="input-text"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddLineItem}
                      style={{ height: '38px' }}
                    >
                      <Plus size={14} /> Add Line
                    </button>
                  </div>
                </div>

                {/* Added Line Items Table */}
                {lineItems.length > 0 && (
                  <div className="table-container">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Pack</th>
                          <th>Batch</th>
                          <th>Exp</th>
                          <th>Qty (P:L)</th>
                          <th>MRP</th>
                          <th>Disc%</th>
                          <th>Line Net</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => {
                          const units = item.unitsPerPack || 10
                          const totalPacks = item.qtyPack + item.qtyLoose / units
                          const gross = totalPacks * item.mrp
                          const net = gross * (1 - item.discountPercent / 100)
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{item.productName}</td>
                              <td>{item.pack}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{item.batchNo}</td>
                              <td>{item.expiryDate}</td>
                              <td style={{ fontWeight: 700 }}>
                                {item.qtyPack}:{item.qtyLoose}
                              </td>
                              <td>₹{item.mrp.toFixed(2)}</td>
                              <td>{item.discountPercent}%</td>
                              <td style={{ fontWeight: 700 }}>₹{net.toFixed(2)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => handleRemoveLineItem(idx)}
                                >
                                  <Trash2 size={12} color="var(--danger)" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Marg Summary & Payment Options */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-accent)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <div className="input-group">
                      <label className="input-label">Payment Mode</label>
                      <select
                        className="input-select"
                        value={paymentMode}
                        onChange={(e) =>
                          setPaymentMode(e.target.value as 'CASH' | 'UPI' | 'DUE/CREDIT')
                        }
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI (Scan & Pay)</option>
                        <option value="DUE/CREDIT">DUE / CREDIT</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Payment Status</label>
                      <select
                        className="input-select"
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as 'PAID' | 'PENDING')}
                      >
                        <option value="PAID">PAID</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      MRP Total: ₹{calculatedMrpTotal.toFixed(2)} | Less Disc: -₹
                      {calculatedDiscountTotal.toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: '#818cf8',
                        marginTop: '2px'
                      }}
                    >
                      Grand Total: ₹{netPayable.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || lineItems.length === 0}
                >
                  {submitting ? 'Saving Cash Memo...' : 'Issue Cash Memo & Print'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  )
}
