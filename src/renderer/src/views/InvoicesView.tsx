import React, { useState } from 'react'
import { Plus, Trash2, Receipt, Printer, Eye, Search, Building2, User } from 'lucide-react'
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
  const [filterType, setFilterType] = useState<'ALL' | 'RETAIL' | 'WHOLESALE'>('ALL')

  // Invoice Mode: Retail vs Wholesale
  const [invoiceType, setInvoiceType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')

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
  const [customerDlNo, setCustomerDlNo] = useState<string>('')
  const [customerGstin, setCustomerGstin] = useState<string>('')
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

    // Requirement 1: In wholesale mode, loose quantity is strictly 0
    const safeQtyLoose = invoiceType === 'WHOLESALE' ? 0 : qtyLoose

    if (qtyPack <= 0 && safeQtyLoose <= 0) {
      alert('Please enter a valid quantity.')
      return
    }

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
        qtyLoose: safeQtyLoose,
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
    const totalPacks = it.qtyPack + (invoiceType === 'WHOLESALE' ? 0 : it.qtyLoose / units)
    const lineMrp = totalPacks * it.mrp
    const lineDisc = (lineMrp * it.discountPercent) / 100
    calculatedMrpTotal += lineMrp
    calculatedDiscountTotal += lineDisc
  })

  const netPayable = Math.round(calculatedMrpTotal - calculatedDiscountTotal)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!patientName.trim()) {
      alert(invoiceType === 'WHOLESALE' ? 'Please enter buyer shop / firm name.' : 'Please enter patient name.')
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
      invoiceType,
      patientName: patientName.trim(),
      patientAgeGender: invoiceType === 'RETAIL' ? patientAgeGender : '',
      patientAddress,
      patientPhone,
      doctorName: invoiceType === 'RETAIL' ? doctorName : '',
      doctorRegNo: invoiceType === 'RETAIL' ? doctorRegNo : '',
      customerDlNo: invoiceType === 'WHOLESALE' ? customerDlNo.trim() : '',
      customerGstin: invoiceType === 'WHOLESALE' ? customerGstin.trim() : '',
      items: lineItems.map((it) => ({
        ...it,
        qtyLoose: invoiceType === 'WHOLESALE' ? 0 : it.qtyLoose
      })),
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
      setCustomerDlNo('')
      setCustomerGstin('')
      // Automatically open the invoice print preview
      setTimeout(() => {
        if (invoices[0]) {
          setSelectedInvoiceForPrint(invoices[0])
        }
      }, 300)
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.patientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.doctorName.toLowerCase().includes(invoiceSearch.toLowerCase())

    if (!matchesSearch) return false
    if (filterType === 'RETAIL') return inv.invoiceType === 'RETAIL' || !inv.invoiceType
    if (filterType === 'WHOLESALE') return inv.invoiceType === 'WHOLESALE'
    return true
  })

  return (
    <div className="app-content">
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <h2 className="card-title">Billing & Invoices (বিল ও ক্যাশ মেমো)</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Retail Cash Memo (খুচরা) & Wholesale Tax Invoice (পাইকারি) with separate Drug Licenses
              </span>
            </div>
            <div className="search-bar" style={{ width: '220px' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search memo #, patient/shop..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter Buttons */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setFilterType('ALL')}
              >
                All ({invoices.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'RETAIL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setFilterType('RETAIL')}
              >
                Retail (খুচরা)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filterType === 'WHOLESALE' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => setFilterType('WHOLESALE')}
              >
                Wholesale (পাইকারি)
              </button>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setInvoiceType('RETAIL')
                setIsCreateModalOpen(true)
              }}
            >
              <Plus size={16} />
              <span>+ New Invoice</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading invoices from SQLite...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No invoices found matching current filter.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Buyer / Patient</th>
                  <th>Doctor / DL</th>
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
                    <td>
                      <span
                        className={`badge ${
                          inv.invoiceType === 'WHOLESALE' ? 'badge-primary' : 'badge-info'
                        }`}
                        style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                      >
                        {inv.invoiceType === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL'}
                      </span>
                    </td>
                    <td>{inv.invoiceDate}</td>
                    <td style={{ fontWeight: 600 }}>
                      {inv.patientName} {inv.patientAgeGender && `(${inv.patientAgeGender})`}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {inv.invoiceType === 'WHOLESALE'
                        ? inv.customerDlNo ? `DL: ${inv.customerDlNo}` : '-'
                        : inv.doctorName || '-'}
                    </td>
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
                          title="Print Invoice / Cash Memo"
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

      {/* Invoice Print Modal */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title">Invoice #{selectedInvoiceForView.invoiceNumber}</h3>
                <span className={`badge ${selectedInvoiceForView.invoiceType === 'WHOLESALE' ? 'badge-primary' : 'badge-info'}`}>
                  {selectedInvoiceForView.invoiceType === 'WHOLESALE' ? 'WHOLESALE (Form 20B/21B)' : 'RETAIL (Form 20/21)'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedInvoiceForView.invoiceType === 'WHOLESALE'
                  ? `Buyer: ${selectedInvoiceForView.patientName} • DL: ${selectedInvoiceForView.customerDlNo || '-'}`
                  : `Patient: ${selectedInvoiceForView.patientName} • Dr: ${selectedInvoiceForView.doctorName || '-'}`}
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
                    <th>Qty</th>
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
                        {selectedInvoiceForView.invoiceType === 'WHOLESALE'
                          ? `${it.qtyPack} Strips`
                          : `${it.qtyPack}:${it.qtyLoose}`}
                      </td>
                      <td>₹{it.mrp.toFixed(2)}</td>
                      <td>{it.discountPercent}%</td>
                      <td style={{ fontWeight: 700 }}>₹{it.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', fontSize: '0.88rem' }}>
                <div>Total MRP: ₹{selectedInvoiceForView.mrpTotal.toFixed(2)}</div>
                <div>Discount: -₹{selectedInvoiceForView.discountTotal.toFixed(2)}</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  Grand Total: ₹{selectedInvoiceForView.grandTotal.toFixed(2)} ({selectedInvoiceForView.paymentMode})
                </div>
              </div>
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
              <Printer size={15} /> Print Invoice
            </button>
            <button className="btn btn-secondary" onClick={() => setSelectedInvoiceForView(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* POS Billing Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidth="840px"
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 className="modal-title">
                  {invoiceType === 'WHOLESALE' ? 'Generate Wholesale Tax Invoice' : 'Generate Retail Cash Memo'}
                </h3>
                {/* Mode Selector Pill */}
                <div style={{ display: 'inline-flex', background: 'var(--bg-input)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    style={{
                      padding: '3px 12px',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: invoiceType === 'RETAIL' ? '#38bdf8' : 'transparent',
                      color: invoiceType === 'RETAIL' ? '#0f172a' : 'var(--text-muted)'
                    }}
                    onClick={() => setInvoiceType('RETAIL')}
                  >
                    <User size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Retail (খুচরা)
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '3px 12px',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: invoiceType === 'WHOLESALE' ? '#a855f7' : 'transparent',
                      color: invoiceType === 'WHOLESALE' ? '#fff' : 'var(--text-muted)'
                    }}
                    onClick={() => {
                      setInvoiceType('WHOLESALE')
                      setQtyLoose(0)
                    }}
                  >
                    <Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Wholesale (পাইকারি)
                  </button>
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {invoiceType === 'WHOLESALE'
                  ? 'Form 20B/21B Tax Invoice for Chemist/Shop • Khuchra/loose sale strictly prohibited (শুধু ফুল পাতা/বক্স বিক্রি)'
                  : 'Form 20/21 Prescription Cash Memo • Loose tablet division allowed'}
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
            {invoiceType === 'WHOLESALE' ? (
              /* Wholesale Buyer Fields */
              <>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Buyer Shop / Pharmacy Firm Name *</label>
                    <input
                      className="input-text"
                      placeholder="e.g. M/S TUDU MEDICAL AGENCY"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Buyer Drug Lic No (DL)</label>
                      <input
                        className="input-text font-mono"
                        placeholder="e.g. WB/DDP/20B/9921"
                        value={customerDlNo}
                        onChange={(e) => setCustomerDlNo(e.target.value)}
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
                    <label className="input-label">Buyer GSTIN Number</label>
                    <input
                      className="input-text font-mono"
                      placeholder="e.g. 19AABCT1234F1Z8"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Shop Address</label>
                      <input
                        className="input-text"
                        placeholder="e.g. BUNIADPUR MARKET"
                        value={patientAddress}
                        onChange={(e) => setPatientAddress(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Contact Phone</label>
                      <input
                        className="input-text"
                        placeholder="e.g. 9434220466"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Retail Patient & Doctor Header Details */
              <>
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
              </>
            )}

            {/* Medicine Selector Box */}
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '10px'
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
                  Add Medicine to Bill
                </span>
                {currentSelectedProduct && (
                  <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>
                    Pack: {currentSelectedProduct.packLabel} • Batch:{' '}
                    {currentSelectedBatch?.batchNo || '-'} • Exp:{' '}
                    {currentSelectedBatch?.expDate || '-'} • Available:{' '}
                    {currentSelectedProduct.totalStockStrips} Strips
                    {invoiceType === 'RETAIL' && ` : ${currentSelectedProduct.totalStockLoose} Loose`}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    invoiceType === 'WHOLESALE'
                      ? '2fr 1fr 90px 80px auto'
                      : '2fr 1fr 70px 70px 70px auto',
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

                <div className="input-group">
                  <label className="input-label">Batch (FEFO)</label>
                  <select
                    className="input-select"
                    value={currentSelectedBatch?.id}
                    onChange={(e) => setSelectedBatchId(parseInt(e.target.value, 10))}
                  >
                    {currentSelectedProduct?.batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNo} ({b.expDate}) ₹{b.mrp.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Qty (Strips/Packs)</label>
                  <input
                    type="number"
                    min="1"
                    className="input-text"
                    value={qtyPack}
                    onChange={(e) => setQtyPack(parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                {/* Loose Quantity - Only in Retail Mode */}
                {invoiceType === 'RETAIL' ? (
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
                ) : null}

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
                  style={{ height: '38px', padding: '0 16px', fontWeight: 600 }}
                  onClick={handleAddLineItem}
                >
                  Add Line
                </button>
              </div>

              {invoiceType === 'WHOLESALE' && (
                <div style={{ fontSize: '0.73rem', color: '#c084fc', fontStyle: 'italic' }}>
                  ℹ️ Wholesale Notice: Khuchra medicine bikri (loose pills) is disabled in wholesale mode. Only full packs/strips are billed.
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div style={{ marginTop: '12px' }}>
              {lineItems.length === 0 ? (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  No medicines added to this invoice yet. Select above and click &quot;Add Line&quot;.
                </div>
              ) : (
                <div className="table-container">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Medicine</th>
                        <th>Pack</th>
                        <th>Batch</th>
                        <th>Exp</th>
                        <th>Qty</th>
                        <th>MRP</th>
                        <th>Disc%</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => {
                        const units = item.unitsPerPack || 10
                        const totalPacks = item.qtyPack + (invoiceType === 'WHOLESALE' ? 0 : item.qtyLoose / units)
                        const lineGross = totalPacks * item.mrp
                        return (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{item.productName}</td>
                            <td>{item.pack}</td>
                            <td>{item.batchNo}</td>
                            <td>{item.expiryDate}</td>
                            <td style={{ fontWeight: 700 }}>
                              {invoiceType === 'WHOLESALE'
                                ? `${item.qtyPack} Strips`
                                : `${item.qtyPack}:${item.qtyLoose}`}
                            </td>
                            <td>₹{item.mrp.toFixed(2)}</td>
                            <td>{item.discountPercent}%</td>
                            <td style={{ fontWeight: 700 }}>₹{lineGross.toFixed(2)}</td>
                            <td>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => handleRemoveLineItem(idx)}
                              >
                                <Trash2 size={14} color="var(--danger)" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Billing Footer: Payment Mode & Totals */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div className="input-group">
                  <label className="input-label">Payment Mode</label>
                  <select
                    className="input-select"
                    value={paymentMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'CASH' | 'UPI' | 'DUE/CREDIT'
                      setPaymentMode(mode)
                      setPaymentStatus(mode === 'DUE/CREDIT' ? 'PENDING' : 'PAID')
                    }}
                  >
                    <option value="CASH">Cash (নগদ)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="DUE/CREDIT">Due / Credit (বাকি)</option>
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
                    <option value="PENDING">PENDING / DUE</option>
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total MRP: ₹{calculatedMrpTotal.toFixed(2)} • Discount: -₹
                  {calculatedDiscountTotal.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: '#38bdf8',
                    letterSpacing: '-0.5px'
                  }}
                >
                  Net Payable: ₹{netPayable.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Printer size={15} />
              <span>
                {submitting
                  ? 'Saving Invoice...'
                  : invoiceType === 'WHOLESALE'
                    ? 'Save & Print Wholesale Invoice'
                    : 'Save & Print Cash Memo'}
              </span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
