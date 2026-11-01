import React, { useState } from 'react'
import { Search, Plus, Trash2, Pill, AlertTriangle, Clock, Layers } from 'lucide-react'
import type { ProductWithBatches, CreateProductInput, CreateBatchInput } from '@shared/types'
import { Modal } from '../components/Modal'

function formatMonthToPharmaExp(ym: string): string {
  if (!ym) return ''
  const parts = ym.split('-')
  if (parts.length === 2) {
    const [year, month] = parts
    return `${month}/${year.slice(-2)}`
  }
  return ym
}

function pharmaExpToMonthInput(exp: string): string {
  if (!exp) return ''
  if (exp.includes('-') && exp.length === 7) return exp
  const parts = exp.split(/[-/]/)
  if (parts.length === 2) {
    const m = parts[0].padStart(2, '0')
    let y = parts[1]
    if (y.length === 2) y = `20${y}`
    return `${y}-${m}`
  }
  return ''
}

interface ItemsViewProps {
  items: ProductWithBatches[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddItem: (input: CreateProductInput) => Promise<boolean>
  onAddBatch?: (input: CreateBatchInput) => Promise<boolean>
  onDeleteItem: (id: number) => Promise<boolean>
  isModalOpen?: boolean
  setIsModalOpen?: (open: boolean) => void
}

export const ItemsView: React.FC<ItemsViewProps> = ({
  items,
  isLoading,
  searchQuery,
  onSearchChange,
  onAddItem,
  onAddBatch,
  onDeleteItem,
  isModalOpen: controlledModalOpen,
  setIsModalOpen: controlledSetModalOpen
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isModalOpen = controlledModalOpen !== undefined ? controlledModalOpen : internalModalOpen
  const setIsModalOpen = controlledSetModalOpen || setInternalModalOpen

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LOW_STOCK' | 'NEAR_EXPIRY'>('ALL')
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)

  // Add Batch Modal State
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<ProductWithBatches | null>(
    null
  )
  const [batchFormData, setBatchFormData] = useState<CreateBatchInput>({
    productId: 0,
    batchNo: '',
    expDate: '12/28',
    mrp: 150.0,
    purchaseRate: 105.0,
    stockStrips: 20,
    stockLoose: 0
  })

  // Add Medicine Form State
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    hsnCode: '3004',
    packLabel: '10S',
    unitsPerPack: 10,
    isScheduleH: false,
    defaultGstRate: 5.0,
    reorderLevel: 10,
    initialBatch: {
      batchNo: '',
      expDate: '12/28',
      mrp: 150.0,
      purchaseRate: 105.0,
      stockStrips: 50,
      stockLoose: 0
    }
  })

  const [submitting, setSubmitting] = useState(false)
  const [submittingBatch, setSubmittingBatch] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrorMessage('Medicine name is mandatory.')
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    const success = await onAddItem(formData)
    setSubmitting(false)

    if (success) {
      setIsModalOpen(false)
      setFormData({
        name: '',
        hsnCode: '3004',
        packLabel: '10S',
        unitsPerPack: 10,
        isScheduleH: false,
        defaultGstRate: 5.0,
        reorderLevel: 10,
        initialBatch: {
          batchNo: '',
          expDate: '12/28',
          mrp: 150.0,
          purchaseRate: 105.0,
          stockStrips: 50,
          stockLoose: 0
        }
      })
    } else {
      setErrorMessage('Failed saving medicine. Please check input values.')
    }
  }

  const handleBatchSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!selectedProductForBatch || !batchFormData.batchNo.trim()) return

    setSubmittingBatch(true)
    if (onAddBatch) {
      const success = await onAddBatch({
        ...batchFormData,
        productId: selectedProductForBatch.id
      })
      if (success) {
        setSelectedProductForBatch(null)
      }
    }
    setSubmittingBatch(false)
  }

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'LOW_STOCK') {
      return item.totalStockStrips <= (item.reorderLevel || 10)
    }
    if (activeFilter === 'NEAR_EXPIRY') {
      return item.batches?.some((b) => b.expDate.includes('26') || b.expDate.includes('27'))
    }
    return true
  })

  return (
    <div className="app-content">
      <div className="card">
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="search-bar" style={{ width: '320px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search medicine, HSN, batch, pack..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>

            {/* Quick filter tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`btn btn-sm ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveFilter('ALL')}
              >
                All ({items.length})
              </button>
              <button
                className={`btn btn-sm ${activeFilter === 'LOW_STOCK' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setActiveFilter('LOW_STOCK')}
              >
                <AlertTriangle size={12} /> Low Stock (
                {items.filter((i) => i.totalStockStrips <= (i.reorderLevel || 10)).length})
              </button>
              <button
                className={`btn btn-sm ${activeFilter === 'NEAR_EXPIRY' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveFilter('NEAR_EXPIRY')}
              >
                <Clock size={12} /> Near Expiry
              </button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Medicine</span>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading medicine stock from SQLite...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Pill size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No medicines match the selected filter.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>HSN Code</th>
                  <th>Medicine Name</th>
                  <th>Pack (Units)</th>
                  <th>Batch No</th>
                  <th>Expiry</th>
                  <th>GST %</th>
                  <th>Stock (P:L)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isExpanded = expandedItemId === item.id
                  const isLow = item.totalStockStrips <= (item.reorderLevel || 10)
                  return (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            color: '#818cf8'
                          }}
                        >
                          {item.hsnCode}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                            {item.isScheduleH && (
                              <span
                                className="badge badge-warning"
                                title="Prescription Required (Schedule H)"
                                style={{ fontSize: '0.68rem', padding: '1px 5px' }}
                              >
                                Sch H
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Min Reorder Level: {item.reorderLevel} strips
                          </div>
                        </td>
                        <td>
                          {item.packLabel} ({item.unitsPerPack} units)
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {item.batches && item.batches.length > 0 ? (
                              item.batches.map((b) => (
                                <div
                                  key={b.id}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <span
                                    className="badge"
                                    style={{
                                      fontSize: '0.72rem',
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 600,
                                      background: '#1e293b',
                                      color: '#38bdf8',
                                      border: '1px solid #334155',
                                      padding: '2px 6px'
                                    }}
                                    title={`Stock: ${b.stockStrips}p:${b.stockLoose}l`}
                                  >
                                    {b.batchNo}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    ₹{b.mrp.toFixed(2)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {item.batches && item.batches.length > 0 ? (
                              item.batches.map((b) => {
                                const isNear =
                                  b.expDate.includes('26') || b.expDate.includes('27')
                                return (
                                  <span
                                    key={b.id}
                                    className={`badge ${isNear ? 'badge-danger' : 'badge-info'}`}
                                    style={{
                                      fontSize: '0.72rem',
                                      fontFamily: 'var(--font-mono)',
                                      width: 'fit-content',
                                      padding: '2px 6px'
                                    }}
                                  >
                                    {b.expDate}
                                  </span>
                                )
                              })
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                            )}
                          </div>
                        </td>
                        <td>{item.defaultGstRate}%</td>
                        <td>
                          <span
                            className={`badge ${isLow ? 'badge-warning' : 'badge-success'}`}
                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                          >
                            {item.totalStockStrips}p : {item.totalStockLoose}l
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {onAddBatch && (
                              <button
                                className="btn btn-secondary btn-sm"
                                title="Add New Batch / GRN"
                                onClick={() => {
                                  setSelectedProductForBatch(item)
                                  setBatchFormData({
                                    productId: item.id,
                                    batchNo: '',
                                    expDate: '12/28',
                                    mrp: item.batches?.[0]?.mrp || 150.0,
                                    purchaseRate: item.batches?.[0]?.purchaseRate || 105.0,
                                    stockStrips: 20,
                                    stockLoose: 0
                                  })
                                }}
                              >
                                <Plus size={12} /> Batch
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Toggle batch details"
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            >
                              <Layers size={12} /> {item.batches?.length || 0}
                            </button>
                            <button
                              className="btn-icon"
                              title="Delete Medicine"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                                  onDeleteItem(item.id)
                                }
                              }}
                            >
                              <Trash2 size={14} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Batches breakdown row */}
                      {isExpanded && item.batches && item.batches.length > 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              background: 'var(--bg-subtle, rgba(255,255,255,0.02))',
                              padding: '12px 24px'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginBottom: '6px',
                                color: 'var(--text-muted)'
                              }}
                            >
                              Batch Inventory Details for {item.name}:
                            </div>
                            <table className="erp-table" style={{ background: 'transparent' }}>
                              <thead>
                                <tr style={{ fontSize: '0.75rem' }}>
                                  <th>Batch No</th>
                                  <th>Expiry</th>
                                  <th>MRP (₹)</th>
                                  <th>Purchase Rate (₹)</th>
                                  <th>Stock Strips</th>
                                  <th>Loose Units</th>
                                  <th>Total Loose</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.batches.map((b) => (
                                  <tr key={b.id} style={{ fontSize: '0.78rem' }}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                      {b.batchNo}
                                    </td>
                                    <td>
                                      <span
                                        className={
                                          b.expDate.includes('26')
                                            ? 'badge badge-danger'
                                            : 'badge badge-info'
                                        }
                                      >
                                        {b.expDate}
                                      </span>
                                    </td>
                                    <td>₹{b.mrp.toFixed(2)}</td>
                                    <td>₹{b.purchaseRate.toFixed(2)}</td>
                                    <td>{b.stockStrips} strips</td>
                                    <td>{b.stockLoose} loose</td>
                                    <td>{b.stockLooseUnits} units</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medicine Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="680px">
        <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Add Medicine to Store Inventory</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pharmaceutical SKU with batch, expiry date, loose pack units & Schedule H
                  </span>
                </div>
                <button type="button" className="btn-icon" onClick={() => setIsModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {errorMessage && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--danger)',
                      fontSize: '0.84rem'
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Medicine Name *</label>
                    <input
                      className="input-text"
                      placeholder="e.g. PAN-D CAP"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">HSN Code</label>
                    <input
                      className="input-text"
                      placeholder="3004"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Pack (e.g. 10S, 1*15, 1*4)</label>
                    <input
                      className="input-text"
                      placeholder="10S"
                      value={formData.packLabel}
                      onChange={(e) => setFormData({ ...formData, packLabel: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Units Per Pack (e.g. 10 tabs)</label>
                    <input
                      type="number"
                      className="input-text"
                      value={formData.unitsPerPack}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unitsPerPack: parseInt(e.target.value, 10) || 10
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">GST %</label>
                    <select
                      className="input-select"
                      value={formData.defaultGstRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultGstRate: parseFloat(e.target.value) || 5
                        })
                      }
                    >
                      <option value="0">0%</option>
                      <option value="5">5% (Standard Pharma)</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Reorder Alert Level (Strips)</label>
                    <input
                      type="number"
                      className="input-text"
                      value={formData.reorderLevel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorderLevel: parseInt(e.target.value, 10) || 10
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '6px 0 14px'
                  }}
                >
                  <input
                    type="checkbox"
                    id="scheduleH"
                    checked={formData.isScheduleH}
                    onChange={(e) => setFormData({ ...formData, isScheduleH: e.target.checked })}
                  />
                  <label htmlFor="scheduleH" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    Schedule H / Prescription Drug (Requires Dr & Patient Record)
                  </label>
                </div>

                {/* Initial Batch Information */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <h4
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      marginBottom: '10px',
                      color: '#818cf8'
                    }}
                  >
                    Initial Batch Details
                  </h4>
                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Batch Number *</label>
                      <input
                        className="input-text"
                        placeholder="e.g. B260012"
                        required
                        value={formData.initialBatch?.batchNo || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              batchNo: e.target.value
                            }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Expiry Date (Native Month Picker) *</label>
                      <input
                        type="month"
                        className="input-text"
                        style={{ colorScheme: 'dark' }}
                        required
                        value={pharmaExpToMonthInput(formData.initialBatch?.expDate || '12/28')}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              expDate: formatMonthToPharmaExp(e.target.value)
                            }
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">MRP (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-text"
                        required
                        value={formData.initialBatch?.mrp || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              mrp: parseFloat(e.target.value) || 0
                            }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Purchase Rate (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input-text"
                        value={formData.initialBatch?.purchaseRate || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              purchaseRate: parseFloat(e.target.value) || 0
                            }
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="input-group">
                      <label className="input-label">Opening Stock (Full Packs/Strips)</label>
                      <input
                        type="number"
                        className="input-text"
                        value={formData.initialBatch?.stockStrips || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              stockStrips: parseInt(e.target.value, 10) || 0
                            }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Opening Loose Units</label>
                      <input
                        type="number"
                        className="input-text"
                        value={formData.initialBatch?.stockLoose || 0}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialBatch: {
                              ...formData.initialBatch!,
                              stockLoose: parseInt(e.target.value, 10) || 0
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding to Store...' : 'Save Medicine to Store'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Add Batch to Existing Medicine Modal */}
      {selectedProductForBatch && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProductForBatch(null)}
          maxWidth="520px"
        >
          <form onSubmit={handleBatchSubmit}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Add Batch: {selectedProductForBatch.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Add another consignment / batch to inventory
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setSelectedProductForBatch(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Batch Number *</label>
                    <input
                      className="input-text"
                      placeholder="e.g. B260088"
                      required
                      value={batchFormData.batchNo}
                      onChange={(e) =>
                        setBatchFormData({ ...batchFormData, batchNo: e.target.value })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Expiry Date (Native Month Picker) *</label>
                    <input
                      type="month"
                      className="input-text"
                      style={{ colorScheme: 'dark' }}
                      required
                      value={pharmaExpToMonthInput(batchFormData.expDate || '12/28')}
                      onChange={(e) =>
                        setBatchFormData({
                          ...batchFormData,
                          expDate: formatMonthToPharmaExp(e.target.value)
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">MRP (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-text"
                      required
                      value={batchFormData.mrp}
                      onChange={(e) =>
                        setBatchFormData({ ...batchFormData, mrp: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-text"
                      value={batchFormData.purchaseRate}
                      onChange={(e) =>
                        setBatchFormData({
                          ...batchFormData,
                          purchaseRate: parseFloat(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Strips Quantity</label>
                    <input
                      type="number"
                      className="input-text"
                      value={batchFormData.stockStrips}
                      onChange={(e) =>
                        setBatchFormData({
                          ...batchFormData,
                          stockStrips: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Loose Units</label>
                    <input
                      type="number"
                      className="input-text"
                      value={batchFormData.stockLoose}
                      onChange={(e) =>
                        setBatchFormData({
                          ...batchFormData,
                          stockLoose: parseInt(e.target.value, 10) || 0
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedProductForBatch(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingBatch}>
                  {submittingBatch ? 'Adding Batch...' : 'Add Batch'}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  )
}
