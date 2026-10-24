import React, { useState } from 'react'
import { Search, Plus, Trash2, Users } from 'lucide-react'
import type { Customer, CreateCustomerInput } from '@shared/types'
import { Modal } from '../components/Modal'

interface CustomersViewProps {
  customers: Customer[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onAddCustomer: (input: CreateCustomerInput) => Promise<boolean>
  onDeleteCustomer: (id: number) => Promise<boolean>
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  isLoading,
  searchQuery,
  onSearchChange,
  onAddCustomer,
  onDeleteCustomer
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    ageGender: '30/F',
    phone: '',
    address: '',
    currentBalance: 0
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name) return

    setSubmitting(true)
    const success = await onAddCustomer(formData)
    setSubmitting(false)

    if (success) {
      setIsModalOpen(false)
      setFormData({
        name: '',
        ageGender: '30/F',
        phone: '',
        address: '',
        currentBalance: 0
      })
    }
  }

  return (
    <div className="app-content">
      <div className="card">
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div className="search-bar">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by patient name, phone, address..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Register Patient / Buyer</span>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading patients ledger from SQLite...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>No patients recorded yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Age / Gender</th>
                  <th>Contact Phone</th>
                  <th>Address / Locality</th>
                  <th>Due Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.ageGender || '-'}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.address || '-'}</td>
                    <td>
                      <span
                        className={`badge ${
                          c.currentBalance > 0 ? 'badge-warning' : 'badge-success'
                        }`}
                      >
                        ₹{c.currentBalance.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        title="Delete Patient"
                        onClick={() => {
                          if (confirm(`Remove patient ${c.name}?`)) {
                            onDeleteCustomer(c.id)
                          }
                        }}
                      >
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3 className="modal-title">Register Patient Account</h3>
                <button type="button" className="btn-icon" onClick={() => setIsModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Patient Full Name *</label>
                    <input
                      className="input-text"
                      required
                      placeholder="e.g. SURAJMANI TUDU"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Age / Gender</label>
                    <input
                      className="input-text"
                      placeholder="e.g. 30/F"
                      value={formData.ageGender}
                      onChange={(e) => setFormData({ ...formData, ageGender: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="input-group">
                    <label className="input-label">Phone Number</label>
                    <input
                      className="input-text"
                      placeholder="e.g. 9434220466"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Opening Due Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-text"
                      value={formData.currentBalance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentBalance: parseFloat(e.target.value) || 0
                        })
                      }
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Patient Address / Village / Locality</label>
                  <input
                    className="input-text"
                    placeholder="e.g. KARKHA, BUNIADPUR"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
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
                  {submitting ? 'Saving...' : 'Save Patient'}
                </button>
              </div>
            </form>
      </Modal>
    </div>
  )
}
