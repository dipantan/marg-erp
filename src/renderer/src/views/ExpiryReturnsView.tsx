import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, RotateCcw, Printer, Search, Building2, CheckCircle, FileText } from 'lucide-react'
import type { ProductBatch, ExpiryReturn, Supplier, CreateExpiryReturnInput, StoreSettings } from '@shared/types'
import { Modal } from '../components/Modal'

interface ExpiryReturnsViewProps {
  store: StoreSettings | null
  onStockUpdated: () => void
}

export const ExpiryReturnsView: React.FC<ExpiryReturnsViewProps> = ({ store, onStockUpdated }) => {
  const [activeTab, setActiveTab] = useState<'eligible' | 'history'>('eligible')
  const [eligibleBatches, setEligibleBatches] = useState<ProductBatch[]>([])
  const [returnHistory, setReturnHistory] = useState<ExpiryReturn[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Return modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [selectedBatchForReturn, setSelectedBatchForReturn] = useState<ProductBatch | null>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0)
  const [qtyStripsToReturn, setQtyStripsToReturn] = useState<number>(1)
  const [returnNotes, setReturnNotes] = useState<string>('Expired medicine return to distributor')
  const [submitting, setSubmitting] = useState(false)

  // Print Debit Note modal state
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<ExpiryReturn | null>(null)

  const loadData = useCallback(async () => {
    if (!window.api?.expiryReturns || !window.api?.suppliers) return
    setLoading(true)
    const [batchesRes, histRes, suppRes] = await Promise.all([
      window.api.expiryReturns.getEligibleBatches(),
      window.api.expiryReturns.list(),
      window.api.suppliers.list()
    ])
    if (batchesRes.success && batchesRes.data) setEligibleBatches(batchesRes.data)
    if (histRes.success && histRes.data) setReturnHistory(histRes.data)
    if (suppRes.success && suppRes.data) setSuppliers(suppRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openReturnModal = (b: ProductBatch): void => {
    setSelectedBatchForReturn(b)
    setSelectedSupplierId(b.supplierId || (suppliers[0]?.id || 0))
    setQtyStripsToReturn(Math.min(b.stockStrips || 1, 10))
    setReturnNotes(`Expiry stock return - Batch ${b.batchNo}`)
    setIsReturnModalOpen(true)
  }

  const handleConfirmReturn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedBatchForReturn || !selectedSupplierId || !window.api?.expiryReturns) return

    setSubmitting(true)
    const payload: CreateExpiryReturnInput = {
      supplierId: selectedSupplierId,
      batchId: selectedBatchForReturn.id,
      qtyStrips: qtyStripsToReturn,
      notes: returnNotes
    }

    const res = await window.api.expiryReturns.create(payload)
    setSubmitting(false)

    if (res.success && res.data) {
      setIsReturnModalOpen(false)
      loadData()
      onStockUpdated()
      // Automatically open print preview for the debit note
      setSelectedReturnForPrint(res.data)
    } else {
      alert(res.error || 'Failed to process expiry return')
    }
  }

  const currentYearMonth = new Date().getFullYear() * 100 + (new Date().getMonth() + 1)

  const filteredEligible = eligibleBatches.filter(
    (b) =>
      (b.productName && b.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      b.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.supplierName && b.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredHistory = returnHistory.filter(
    (r) =>
      r.returnNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.supplierName && r.supplierName.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="app-content">
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: '14px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(168, 85, 247, 0.08))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCcw size={18} color="#ef4444" />
              <span>Expiry Medicine Returns & Debit Notes (মেয়াদোত্তীর্ণ ওষুধ সাপ্লায়ারকে ফেরত)</span>
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Return expired/near-expiry medicines to the distributor dokan they were purchased from. Automatically deducts stock and adjusts the supplier due ledger!
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge badge-warning" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              {eligibleBatches.filter((b) => b.expSortKey <= currentYearMonth).length} Expired Batches
            </span>
            <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              {returnHistory.length} Returns Issued
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'eligible' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('eligible')}
              style={{ padding: '6px 14px' }}
            >
              <AlertTriangle size={15} />
              <span>Expired / Near-Expiry Stock to Return ({eligibleBatches.length})</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('history')}
              style={{ padding: '6px 14px' }}
            >
              <FileText size={15} />
              <span>Return History & Debit Notes ({returnHistory.length})</span>
            </button>
          </div>

          <div className="search-bar" style={{ width: '260px' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search medicine, batch, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* TAB 1: ELIGIBLE BATCHES */}
        {activeTab === 'eligible' && (
          <div style={{ marginTop: '14px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading expiry batches...
              </div>
            ) : filteredEligible.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle size={32} style={{ color: 'var(--success)', opacity: 0.6, marginBottom: '8px' }} />
                <p>No expired medicines in stock! All pharmacy batches are valid.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Medicine Name</th>
                      <th>Pack</th>
                      <th>Batch No</th>
                      <th>Expiry</th>
                      <th>In Stock (Strips)</th>
                      <th>Purchase Rate</th>
                      <th>Purchased From (কার থেকে নেওয়া)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEligible.map((b) => {
                      const isExpired = b.expSortKey <= currentYearMonth
                      const isNearExpiry = b.expSortKey <= currentYearMonth + 6
                      return (
                        <tr key={b.id} style={{ background: isExpired ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                          <td>
                            <span
                              className={`badge ${isExpired ? 'badge-danger' : isNearExpiry ? 'badge-warning' : 'badge-info'}`}
                              style={{ fontSize: '0.7rem' }}
                            >
                              {isExpired ? 'EXPIRED' : isNearExpiry ? 'NEAR EXPIRY' : 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{b.productName}</td>
                          <td>{b.packLabel}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.batchNo}</td>
                          <td style={{ fontWeight: 700, color: isExpired ? '#ef4444' : '#f59e0b' }}>
                            {b.expDate}
                          </td>
                          <td style={{ fontWeight: 700 }}>{b.stockStrips} Strips</td>
                          <td>₹{b.purchaseRate.toFixed(2)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={13} color="var(--text-muted)" />
                              <span style={{ fontWeight: 600 }}>{b.supplierName || 'Not linked'}</span>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ gap: '6px', padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => openReturnModal(b)}
                            >
                              <RotateCcw size={13} />
                              <span>Return to Supplier (ওকে ফেরত দিন)</span>
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
        )}

        {/* TAB 2: RETURN HISTORY */}
        {activeTab === 'history' && (
          <div style={{ marginTop: '14px' }}>
            {returnHistory.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FileText size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p>No expiry return debit notes created yet.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Debit Note #</th>
                      <th>Date</th>
                      <th>Supplier Dokan</th>
                      <th>Medicine Name</th>
                      <th>Batch No</th>
                      <th>Exp Date</th>
                      <th>Returned Qty</th>
                      <th>Rate</th>
                      <th>Debit Amount (বাকি থেকে বাদ)</th>
                      <th>Status</th>
                      <th>Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#818cf8' }}>
                          {r.returnNo}
                        </td>
                        <td>{r.returnDate}</td>
                        <td style={{ fontWeight: 600 }}>{r.supplierName}</td>
                        <td style={{ fontWeight: 600 }}>{r.productName}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{r.batchNo}</td>
                        <td>{r.expDate}</td>
                        <td style={{ fontWeight: 700 }}>{r.qtyStrips} Strips</td>
                        <td>₹{r.purchaseRate.toFixed(2)}</td>
                        <td style={{ fontWeight: 800, color: '#ef4444' }}>₹{r.totalAmount.toFixed(2)}</td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            title="Print Debit Note Voucher"
                            onClick={() => setSelectedReturnForPrint(r)}
                          >
                            <Printer size={15} color="#818cf8" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Confirm Return to Supplier */}
      {isReturnModalOpen && selectedBatchForReturn && (
        <Modal isOpen={true} onClose={() => setIsReturnModalOpen(false)} maxWidth="580px">
          <form onSubmit={handleConfirmReturn}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Return Expired Stock to Supplier (ওকে ফেরত দিন)</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Medicine: {selectedBatchForReturn.productName} • Batch: {selectedBatchForReturn.batchNo}
                </span>
              </div>
              <button type="button" className="btn-icon" onClick={() => setIsReturnModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Select Supplier Dokan (যার কাছে ফেরত দেওয়া হবে) *</label>
                <select
                  className="input-select"
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(parseInt(e.target.value, 10))}
                >
                  <option value={0}>-- Select Distributor Dokan --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Current Due: ₹{s.currentBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="input-group">
                  <label className="input-label">
                    Quantity to Return (Strips) * (Max: {selectedBatchForReturn.stockStrips})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedBatchForReturn.stockStrips}
                    required
                    className="input-text"
                    value={qtyStripsToReturn}
                    onChange={(e) => setQtyStripsToReturn(parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Purchase Rate / Strip</label>
                  <input
                    type="text"
                    disabled
                    className="input-text font-mono"
                    value={`₹${selectedBatchForReturn.purchaseRate.toFixed(2)}`}
                  />
                </div>
              </div>

              {/* Debit Note Amount Calculation Alert */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  margin: '12px 0'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>
                  Debit Note Value: ₹
                  {(
                    qtyStripsToReturn *
                    (selectedBatchForReturn.purchaseRate > 0
                      ? selectedBatchForReturn.purchaseRate
                      : selectedBatchForReturn.mrp)
                  ).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  ⚡ This amount will be automatically deducted from {suppliers.find((s) => s.id === selectedSupplierId)?.name || 'the supplier'}&apos;s outstanding due balance!
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Reason / Return Notes</label>
                <input
                  className="input-text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <RotateCcw size={15} />
                <span>{submitting ? 'Processing Return...' : 'Confirm Return & Deduct Due'}</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReturnModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Print Debit Note Voucher */}
      {selectedReturnForPrint && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReturnForPrint(null)}
          maxWidth="700px"
          dialogStyle={{ background: '#fff', color: '#000', padding: 0 }}
        >
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              background: '#0f172a',
              color: '#fff',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700 }}>Expiry Return Debit Note</span>
              <span className="badge badge-success">{selectedReturnForPrint.returnNo}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={15} /> Print Debit Note
              </button>
              <button className="btn-icon" onClick={() => setSelectedReturnForPrint(null)} style={{ color: '#fff' }}>
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif', color: '#000' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>{store?.storeName || 'M/S JANATA MEDICAL STORES'}</h2>
              <div style={{ fontSize: '0.85rem' }}>{store?.address} • MOB: {store?.phone}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '2px' }}>
                GSTIN: {store?.gstin} • DL: {store?.wholesaleDrugLicNo || store?.drugLicNo}
              </div>
              <div style={{ marginTop: '8px', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                DEBIT NOTE / EXPIRY MEDICINE RETURN MEMO
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem' }}>
              <div>
                <strong>TO DISTRIBUTOR / DOKAN:</strong>
                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '2px' }}>{selectedReturnForPrint.supplierName}</div>
                <div>Phone: {selectedReturnForPrint.supplierPhone || '-'}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div><strong>Return Voucher No:</strong> {selectedReturnForPrint.returnNo}</div>
                <div><strong>Date:</strong> {selectedReturnForPrint.returnDate}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #000', borderTop: '1.5px solid #000' }}>
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>SL</th>
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>MEDICINE NAME</th>
                  <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>PACK</th>
                  <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>BATCH</th>
                  <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>EXPIRY</th>
                  <th style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>QTY RETURNED</th>
                  <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>RATE</th>
                  <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>TOTAL AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>1.</td>
                  <td style={{ padding: '6px', fontWeight: 700, border: '1px solid #000' }}>{selectedReturnForPrint.productName}</td>
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>{selectedReturnForPrint.packLabel}</td>
                  <td style={{ padding: '6px', textAlign: 'center', fontFamily: 'monospace', border: '1px solid #000' }}>{selectedReturnForPrint.batchNo}</td>
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #000' }}>{selectedReturnForPrint.expDate}</td>
                  <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, border: '1px solid #000' }}>{selectedReturnForPrint.qtyStrips} Strips</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>₹{selectedReturnForPrint.purchaseRate.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800, border: '1px solid #000' }}>₹{selectedReturnForPrint.totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '16px' }}>
              <div style={{ fontSize: '0.82rem', width: '60%' }}>
                <div><strong>Reason:</strong> {selectedReturnForPrint.notes || 'Expired batch returned for credit note adjustment'}</div>
                <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#555' }}>
                  Please credit the above debit amount against our ledger account balance.
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>
                  TOTAL DEBIT: ₹{selectedReturnForPrint.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '10px', borderTop: '1px solid #ccc', fontSize: '0.85rem' }}>
              <div>Received By (Distributor Signature): ____________________</div>
              <div>Authorized Signatory ({store?.storeName || 'JANATA MEDICAL STORES'})</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
