import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Users,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Receipt,
  Eye,
  FileText
} from 'lucide-react'
import type {
  Supplier,
  SupplierPurchase,
  SupplierPayment,
  Customer,
  CustomerMedicineHistoryItem,
  BalanceSheetSummary,
  CreateSupplierInput,
  CreateSupplierPurchaseInput,
  RecordSupplierPaymentInput,
  RecordCustomerPaymentInput
} from '@shared/types'
import { Modal } from '../components/Modal'

interface BalanceSheetViewProps {
  customers: Customer[]
  onRefreshCustomers: () => void
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  customers,
  onRefreshCustomers
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'customers' | 'overview'>('suppliers')
  const [summary, setSummary] = useState<BalanceSheetSummary | null>(null)

  // Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Selected supplier details
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null)
  const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>([])
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([])

  // Selected customer medicine history
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null)
  const [customerMedicineHistory, setCustomerMedicineHistory] = useState<CustomerMedicineHistoryItem[]>([])
  const [loadingCustomerHistory, setLoadingCustomerHistory] = useState(false)

  // Modals state
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false)
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false)
  const [isSupplierPaymentModalOpen, setIsSupplierPaymentModalOpen] = useState(false)
  const [isCustomerPaymentModalOpen, setIsCustomerPaymentModalOpen] = useState(false)

  // Form states
  const [supplierFormData, setSupplierFormData] = useState<CreateSupplierInput>({
    name: '',
    phone: '',
    gstin: '',
    drugLicNo: '',
    address: '',
    openingBalance: 0
  })

  const [purchaseFormData, setPurchaseFormData] = useState<CreateSupplierPurchaseInput>({
    supplierId: 0,
    billNo: '',
    billDate: (() => {
      const d = new Date()
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    })(),
    totalAmount: 0,
    paidAmount: 0,
    notes: ''
  })

  const [suppPaymentFormData, setSuppPaymentFormData] = useState<RecordSupplierPaymentInput>({
    supplierId: 0,
    paymentDate: (() => {
      const d = new Date()
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    })(),
    amount: 0,
    paymentMode: 'CASH',
    notes: ''
  })

  const [custPaymentFormData, setCustPaymentFormData] = useState<RecordCustomerPaymentInput>({
    customerId: 0,
    paymentDate: (() => {
      const d = new Date()
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
    })(),
    amount: 0,
    paymentMode: 'CASH',
    notes: ''
  })

  // Load summary and suppliers
  const loadData = useCallback(async () => {
    if (!window.api?.balanceSheet || !window.api?.suppliers) return
    setLoading(true)
    const [sumRes, suppRes] = await Promise.all([
      window.api.balanceSheet.getSummary(),
      window.api.suppliers.list()
    ])
    if (sumRes.success && sumRes.data) {
      setSummary(sumRes.data)
    }
    if (suppRes.success && suppRes.data) {
      setSuppliers(suppRes.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open supplier ledger details
  const handleViewSupplierLedger = async (supp: Supplier): Promise<void> => {
    setSelectedSupplierForLedger(supp)
    if (!window.api?.suppliers) return
    const [purRes, payRes] = await Promise.all([
      window.api.suppliers.listPurchases(supp.id),
      window.api.suppliers.listPayments(supp.id)
    ])
    if (purRes.success && purRes.data) setSupplierPurchases(purRes.data)
    if (payRes.success && payRes.data) setSupplierPayments(payRes.data)
  }

  // Open customer medicine purchase history
  const handleViewCustomerHistory = async (cust: Customer): Promise<void> => {
    setSelectedCustomerForHistory(cust)
    if (!window.api?.customers) return
    setLoadingCustomerHistory(true)
    const res = await window.api.customers.getHistory(cust.id)
    if (res.success && res.data) {
      setCustomerMedicineHistory(res.data)
    }
    setLoadingCustomerHistory(false)
  }

  // Handle Add Supplier
  const handleCreateSupplier = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!supplierFormData.name.trim() || !window.api?.suppliers) return
    const res = await window.api.suppliers.create(supplierFormData)
    if (res.success) {
      setIsAddSupplierModalOpen(false)
      setSupplierFormData({ name: '', phone: '', gstin: '', drugLicNo: '', address: '', openingBalance: 0 })
      loadData()
    } else {
      alert(res.error || 'Failed to add supplier')
    }
  }

  // Handle Add Purchase Bill
  const handleCreatePurchase = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!purchaseFormData.supplierId || purchaseFormData.totalAmount <= 0 || !window.api?.suppliers) return
    const res = await window.api.suppliers.createPurchase(purchaseFormData)
    if (res.success) {
      setIsAddPurchaseModalOpen(false)
      setPurchaseFormData({
        supplierId: 0,
        billNo: '',
        billDate: (() => {
          const d = new Date()
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
        })(),
        totalAmount: 0,
        paidAmount: 0,
        notes: ''
      })
      loadData()
      if (selectedSupplierForLedger && selectedSupplierForLedger.id === purchaseFormData.supplierId) {
        handleViewSupplierLedger(selectedSupplierForLedger)
      }
    } else {
      alert(res.error || 'Failed to record purchase')
    }
  }

  // Handle Record Supplier Payment
  const handleRecordSupplierPayment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!suppPaymentFormData.supplierId || suppPaymentFormData.amount <= 0 || !window.api?.suppliers) return
    const res = await window.api.suppliers.recordPayment(suppPaymentFormData)
    if (res.success) {
      setIsSupplierPaymentModalOpen(false)
      setSuppPaymentFormData({
        supplierId: 0,
        paymentDate: (() => {
          const d = new Date()
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
        })(),
        amount: 0,
        paymentMode: 'CASH',
        notes: ''
      })
      loadData()
      if (selectedSupplierForLedger && selectedSupplierForLedger.id === suppPaymentFormData.supplierId) {
        handleViewSupplierLedger(selectedSupplierForLedger)
      }
    } else {
      alert(res.error || 'Failed to record payment')
    }
  }

  // Handle Record Customer Payment
  const handleRecordCustomerPayment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!custPaymentFormData.customerId || custPaymentFormData.amount <= 0 || !window.api?.customers) return
    const res = await window.api.customers.recordPayment(custPaymentFormData)
    if (res.success) {
      setIsCustomerPaymentModalOpen(false)
      setCustPaymentFormData({
        customerId: 0,
        paymentDate: (() => {
          const d = new Date()
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
        })(),
        amount: 0,
        paymentMode: 'CASH',
        notes: ''
      })
      onRefreshCustomers()
      loadData()
    } else {
      alert(res.error || 'Failed to record customer payment')
    }
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.phone.includes(supplierSearch) ||
      (s.gstin && s.gstin.toLowerCase().includes(supplierSearch.toLowerCase()))
  )

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      (c.address && c.address.toLowerCase().includes(customerSearch.toLowerCase()))
  )

  return (
    <div className="app-content">
      {/* 4 Financial Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              DOKAN / SUPPLIER DUE (দোকানের বাকি)
            </span>
            <Building2 size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
            ₹{summary?.totalPayables.toFixed(2) || '0.00'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Total money owed to medicine distributors
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              CUSTOMER DUE (কাস্টমারদের বাকি)
            </span>
            <Users size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
            ₹{summary?.totalReceivables.toFixed(2) || '0.00'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Outstanding due balance from credit patients
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL PURCHASES (মোট ওষুধ ক্রয়)
            </span>
            <ArrowDownLeft size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: '#38bdf8' }}>
            ₹{summary?.totalPurchaseExpense.toFixed(2) || '0.00'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Total value of medicines bought from shops
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL SALES REVENUE (মোট বিক্রি)
            </span>
            <ArrowUpRight size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
            ₹{summary?.totalSalesRevenue.toFixed(2) || '0.00'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Total billed sales turnover
          </span>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className={`btn btn-sm ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('suppliers')}
              style={{ padding: '6px 14px' }}
            >
              <Building2 size={15} />
              <span>Dokan / Suppliers Ledger (দোকানের হিসাব ও ডিউ)</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('customers')}
              style={{ padding: '6px 14px' }}
            >
              <Users size={15} />
              <span>Customer Medicine History & Due (মেডিসিন নেওয়ার লিস্ট ও বাকি)</span>
            </button>
          </div>

          <div>
            {activeTab === 'suppliers' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAddPurchaseModalOpen(true)}
                >
                  <Plus size={14} /> Record Inward Bill (মাল কেনা)
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsAddSupplierModalOpen(true)}
                >
                  <Plus size={14} /> Add Supplier (নতুন দোকান)
                </button>
              </div>
            )}
            {activeTab === 'customers' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsCustomerPaymentModalOpen(true)}
              >
                <DollarSign size={14} /> Settle Customer Due (ডিউ জমা নেওয়া)
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SUPPLIERS / DOKAN BALANCE SHEET */}
        {activeTab === 'suppliers' && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="search-bar" style={{ width: '280px' }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search shop name, phone, GSTIN..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {filteredSuppliers.length} supplier dokans
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading supplier accounts...
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Building2 size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p>No supplier shops registered yet. Click &quot;Add Supplier&quot; to add a distributor.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Dokan / Supplier Name</th>
                      <th>Phone</th>
                      <th>GSTIN / DL</th>
                      <th>Total Purchased (কত টাকার নিয়েছি)</th>
                      <th>Total Paid (পরিশোধ)</th>
                      <th>Current Due (কত ডিউ বাকি)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700 }}>
                          <div>{s.name}</div>
                          {s.address && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {s.address}
                            </div>
                          )}
                        </td>
                        <td>{s.phone || '-'}</td>
                        <td style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          <div>{s.gstin || '-'}</div>
                          {s.drugLicNo && <div style={{ color: 'var(--text-muted)' }}>DL: {s.drugLicNo}</div>}
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{s.totalPurchases.toFixed(2)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{s.totalPaid.toFixed(2)}</td>
                        <td>
                          <span
                            className={`badge ${s.currentBalance > 0 ? 'badge-danger' : 'badge-success'}`}
                            style={{ fontWeight: 700, fontSize: '0.85rem' }}
                          >
                            ₹{s.currentBalance.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              title="View Ledger Statement"
                              onClick={() => handleViewSupplierLedger(s)}
                            >
                              <FileText size={13} /> Statement
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSuppPaymentFormData((prev) => ({
                                  ...prev,
                                  supplierId: s.id,
                                  amount: s.currentBalance > 0 ? s.currentBalance : 0
                                }))
                                setIsSupplierPaymentModalOpen(true)
                              }}
                            >
                              Pay Due
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
        )}

        {/* TAB 2: CUSTOMERS DUE & MEDICINE HISTORY */}
        {activeTab === 'customers' && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="search-bar" style={{ width: '280px' }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search patient, phone, address..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {filteredCustomers.length} patients / buyers
              </span>
            </div>

            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Customer / Patient Name</th>
                    <th>Age/Gender</th>
                    <th>Contact Phone</th>
                    <th>Address</th>
                    <th>Outstanding Due (বাকি)</th>
                    <th>Medicine Purchase History (নেওয়ার লিস্ট)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.name}</td>
                      <td>{c.ageGender || '-'}</td>
                      <td>{c.phone || '-'}</td>
                      <td>{c.address || '-'}</td>
                      <td>
                        <span
                          className={`badge ${c.currentBalance > 0 ? 'badge-warning' : 'badge-success'}`}
                          style={{ fontWeight: 700 }}
                        >
                          ₹{c.currentBalance.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ gap: '6px', color: '#818cf8', fontWeight: 600 }}
                          onClick={() => handleViewCustomerHistory(c)}
                        >
                          <Eye size={14} />
                          <span>View Medicines List (ওষুধের তালিকা)</span>
                        </button>
                      </td>
                      <td>
                        {c.currentBalance > 0 ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setCustPaymentFormData((prev) => ({
                                ...prev,
                                customerId: c.id,
                                amount: c.currentBalance
                              }))
                              setIsCustomerPaymentModalOpen(true)
                            }}
                          >
                            Receive Payment
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Due</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Supplier Ledger Statement */}
      {selectedSupplierForLedger && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSupplierForLedger(null)}
          maxWidth="800px"
        >
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{selectedSupplierForLedger.name} - Ledger Statement</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Phone: {selectedSupplierForLedger.phone || '-'} • GSTIN: {selectedSupplierForLedger.gstin || '-'} • Current Due: ₹{selectedSupplierForLedger.currentBalance.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setSelectedSupplierForLedger(null)}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#38bdf8' }}>
              Purchases from this Dokan (ওষুধ কেনাকাটার বিল)
            </h4>
            {supplierPurchases.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No inward purchase bills recorded for this supplier.</p>
            ) : (
              <div className="table-container" style={{ marginBottom: '16px' }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Bill No</th>
                      <th>Date</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Due Balance</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPurchases.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.billNo}</td>
                        <td>{p.billDate}</td>
                        <td style={{ fontWeight: 600 }}>₹{p.totalAmount.toFixed(2)}</td>
                        <td style={{ color: 'var(--success)' }}>₹{p.paidAmount.toFixed(2)}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 700 }}>₹{p.dueAmount.toFixed(2)}</td>
                        <td>{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: '#10b981' }}>
              Payments & Expiry Return Adjustments Made (পরিশোধ ও ফেরত সমন্বয়)
            </h4>
            {supplierPayments.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No payment transactions recorded.</p>
            ) : (
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Payment Date</th>
                      <th>Amount Paid</th>
                      <th>Mode</th>
                      <th>Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierPayments.map((py) => (
                      <tr key={py.id}>
                        <td>{py.paymentDate}</td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{py.amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${py.paymentMode === 'RETURN_ADJUSTMENT' ? 'badge-warning' : 'badge-info'}`}>
                            {py.paymentMode === 'RETURN_ADJUSTMENT' ? 'DEBIT NOTE (EXPIRY)' : py.paymentMode}
                          </span>
                        </td>
                        <td>{py.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setSelectedSupplierForLedger(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Customer Medicine History ("Customer der medicine neowar list") */}
      {selectedCustomerForHistory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCustomerForHistory(null)}
          maxWidth="850px"
        >
          <div className="modal-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title">{selectedCustomerForHistory.name} - Medicine History</h3>
                <span className={`badge ${selectedCustomerForHistory.currentBalance > 0 ? 'badge-warning' : 'badge-success'}`}>
                  Due: ₹{selectedCustomerForHistory.currentBalance.toFixed(2)}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Phone: {selectedCustomerForHistory.phone || '-'} • Address: {selectedCustomerForHistory.address || '-'}
              </span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setSelectedCustomerForHistory(null)}
            >
              ✕
            </button>
          </div>

          <div className="modal-body">
            {loadingCustomerHistory ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading customer medicine list...
              </div>
            ) : customerMedicineHistory.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Receipt size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <p>No medicine purchase records found for this patient.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Medicine Name</th>
                      <th>Pack</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>Quantity</th>
                      <th>MRP</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerMedicineHistory.map((item) => (
                      <tr key={item.id}>
                        <td>{item.invoiceDate}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#818cf8' }}>
                          {item.invoiceNo}
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                        <td>{item.pack}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{item.batchNo}</td>
                        <td>{item.expiryDate}</td>
                        <td style={{ fontWeight: 700 }}>
                          {item.invoiceType === 'WHOLESALE'
                            ? `${item.qtyPack} Strips`
                            : `${item.qtyPack}:${item.qtyLoose}`}
                        </td>
                        <td>₹{item.mrp.toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>₹{item.amount.toFixed(2)}</td>
                        <td>
                          <span
                            className={`badge ${item.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setSelectedCustomerForHistory(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Add Supplier Dokan */}
      <Modal isOpen={isAddSupplierModalOpen} onClose={() => setIsAddSupplierModalOpen(false)}>
        <form onSubmit={handleCreateSupplier}>
          <div className="modal-header">
            <h3 className="modal-title">Register Supplier / Distributor Dokan</h3>
            <button type="button" className="btn-icon" onClick={() => setIsAddSupplierModalOpen(false)}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Shop / Agency Name *</label>
                <input
                  className="input-text"
                  required
                  placeholder="e.g. M/S BENGAL PHARMA DISTRIBUTORS"
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Contact Phone</label>
                <input
                  className="input-text"
                  placeholder="e.g. 9832011223"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">GSTIN Identification</label>
                <input
                  className="input-text font-mono"
                  placeholder="e.g. 19AAACB1234F1Z5"
                  value={supplierFormData.gstin}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, gstin: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Drug Lic No (Form 20B/21B)</label>
                <input
                  className="input-text font-mono"
                  placeholder="e.g. DL-20B-1082"
                  value={supplierFormData.drugLicNo}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, drugLicNo: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Shop Address / Market Location</label>
                <input
                  className="input-text"
                  placeholder="e.g. STATION ROAD, RAIGANJ"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Opening Due Balance (if existing)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-text"
                  placeholder="0.00"
                  value={supplierFormData.openingBalance || 0}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, openingBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Save Supplier Dokan
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddSupplierModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Record Inward Purchase Bill */}
      <Modal isOpen={isAddPurchaseModalOpen} onClose={() => setIsAddPurchaseModalOpen(false)}>
        <form onSubmit={handleCreatePurchase}>
          <div className="modal-header">
            <h3 className="modal-title">Record Purchase Bill from Dokan (ওষুধ কেনা)</h3>
            <button type="button" className="btn-icon" onClick={() => setIsAddPurchaseModalOpen(false)}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Select Dokan / Supplier *</label>
              <select
                className="input-select"
                required
                value={purchaseFormData.supplierId}
                onChange={(e) => setPurchaseFormData({ ...purchaseFormData, supplierId: parseInt(e.target.value, 10) })}
              >
                <option value={0}>-- Choose Supplier Dokan --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Current Due: ₹{s.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Distributor Bill / Memo No *</label>
                <input
                  className="input-text font-mono"
                  required
                  placeholder="e.g. BPD-INV-9901"
                  value={purchaseFormData.billNo}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, billNo: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Bill Date *</label>
                <input
                  className="input-text"
                  required
                  placeholder="DD-MM-YYYY"
                  value={purchaseFormData.billDate}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, billDate: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Total Bill Amount (কত টাকার মাল) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-text"
                  placeholder="0.00"
                  value={purchaseFormData.totalAmount || ''}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, totalAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Paid Immediately (তাত্ক্ষণিক পরিশোধ)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-text"
                  placeholder="0.00"
                  value={purchaseFormData.paidAmount || ''}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, paidAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Remarks / Description</label>
              <input
                className="input-text"
                placeholder="e.g. Monthly stock order"
                value={purchaseFormData.notes}
                onChange={(e) => setPurchaseFormData({ ...purchaseFormData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Save Inward Purchase
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddPurchaseModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: Record Payment to Supplier */}
      <Modal isOpen={isSupplierPaymentModalOpen} onClose={() => setIsSupplierPaymentModalOpen(false)}>
        <form onSubmit={handleRecordSupplierPayment}>
          <div className="modal-header">
            <h3 className="modal-title">Record Payment to Supplier Dokan</h3>
            <button type="button" className="btn-icon" onClick={() => setIsSupplierPaymentModalOpen(false)}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Select Dokan / Supplier *</label>
              <select
                className="input-select"
                required
                value={suppPaymentFormData.supplierId}
                onChange={(e) => {
                  const sId = parseInt(e.target.value, 10)
                  const target = suppliers.find((s) => s.id === sId)
                  setSuppPaymentFormData({
                    ...suppPaymentFormData,
                    supplierId: sId,
                    amount: target && target.currentBalance > 0 ? target.currentBalance : 0
                  })
                }}
              >
                <option value={0}>-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Due: ₹{s.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Payment Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-text"
                  value={suppPaymentFormData.amount || ''}
                  onChange={(e) => setSuppPaymentFormData({ ...suppPaymentFormData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Payment Mode</label>
                <select
                  className="input-select"
                  value={suppPaymentFormData.paymentMode}
                  onChange={(e) => setSuppPaymentFormData({ ...suppPaymentFormData, paymentMode: e.target.value as 'CASH' | 'BANK' | 'UPI' | 'CHEQUE' })}
                >
                  <option value="CASH">Cash (নগদ)</option>
                  <option value="BANK">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Payment Date *</label>
              <input
                className="input-text"
                required
                placeholder="DD-MM-YYYY"
                value={suppPaymentFormData.paymentDate}
                onChange={(e) => setSuppPaymentFormData({ ...suppPaymentFormData, paymentDate: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Notes / Reference No</label>
              <input
                className="input-text"
                placeholder="e.g. Paid via UPI Txn #9910"
                value={suppPaymentFormData.notes}
                onChange={(e) => setSuppPaymentFormData({ ...suppPaymentFormData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Record Dokan Payment
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSupplierPaymentModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: Record Payment from Customer */}
      <Modal isOpen={isCustomerPaymentModalOpen} onClose={() => setIsCustomerPaymentModalOpen(false)}>
        <form onSubmit={handleRecordCustomerPayment}>
          <div className="modal-header">
            <h3 className="modal-title">Settle Customer Outstanding Due</h3>
            <button type="button" className="btn-icon" onClick={() => setIsCustomerPaymentModalOpen(false)}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Select Customer / Patient *</label>
              <select
                className="input-select"
                required
                value={custPaymentFormData.customerId}
                onChange={(e) => {
                  const cId = parseInt(e.target.value, 10)
                  const target = customers.find((c) => c.id === cId)
                  setCustPaymentFormData({
                    ...custPaymentFormData,
                    customerId: cId,
                    amount: target && target.currentBalance > 0 ? target.currentBalance : 0
                  })
                }}
              >
                <option value={0}>-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Due: ₹{c.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Amount Received *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-text"
                  value={custPaymentFormData.amount || ''}
                  onChange={(e) => setCustPaymentFormData({ ...custPaymentFormData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Payment Mode</label>
                <select
                  className="input-select"
                  value={custPaymentFormData.paymentMode}
                  onChange={(e) => setCustPaymentFormData({ ...custPaymentFormData, paymentMode: e.target.value as 'CASH' | 'UPI' | 'BANK' })}
                >
                  <option value="CASH">Cash (নগদ)</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Payment Date</label>
              <input
                className="input-text"
                required
                placeholder="DD-MM-YYYY"
                value={custPaymentFormData.paymentDate}
                onChange={(e) => setCustPaymentFormData({ ...custPaymentFormData, paymentDate: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Notes</label>
              <input
                className="input-text"
                placeholder="e.g. Cleared pending dues"
                value={custPaymentFormData.notes}
                onChange={(e) => setCustPaymentFormData({ ...custPaymentFormData, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Save Received Due Payment
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerPaymentModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
