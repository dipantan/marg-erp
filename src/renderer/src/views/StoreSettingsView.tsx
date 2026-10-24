import React, { useState } from 'react'
import { Building2, Save, CheckCircle } from 'lucide-react'
import type { StoreSettings } from '@shared/types'

interface StoreSettingsViewProps {
  store: StoreSettings | null
  onUpdateStore: (settings: Partial<StoreSettings>) => Promise<boolean>
}

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({ store, onUpdateStore }) => {
  const [formData, setFormData] = useState<Partial<StoreSettings>>(store || {})
  const [prevStore, setPrevStore] = useState<StoreSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  if (store && store !== prevStore) {
    setPrevStore(store)
    setFormData(store)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)

    const success = await onUpdateStore(formData)
    setSaving(false)
    if (success) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  return (
    <div className="app-content w-full">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {/* Top Header Card */}
        <div className="card" style={{ width: '100%' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <div>
              <h2 className="card-title">Pharmacy License & Store Profile</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Configures Drug License Form 20/21, GSTIN, FSSAI, and Cash Memo header
              </span>
            </div>

            {saveSuccess && (
              <span className="badge badge-success" style={{ gap: '6px', padding: '6px 12px' }}>
                <CheckCircle size={14} /> Saved to Local SQLite
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Grid for Store Profile & Statutory Compliance */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '10px', width: '100%' }}>
          {/* Column 1: Store Identity & Premises */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <Building2 size={16} color="#38bdf8" />
              <span>Pharmacy Identity & Premises</span>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Medical Store / Pharmacy Name *</label>
                <input
                  className="input-text"
                  required
                  value={formData.storeName || ''}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Shop Tagline</label>
                <input
                  className="input-text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Holding / Premises Address (from Drug License)</label>
              <input
                className="input-text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="input-group">
                <label className="input-label">Town / City</label>
                <input
                  className="input-text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">District</label>
                <input
                  className="input-text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">PIN Code</label>
                <input
                  className="input-text font-mono"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Primary Mobile Number (for bills)</label>
                <input
                  className="input-text font-mono"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Delivery Order Helpline</label>
                <input
                  className="input-text font-mono"
                  value={formData.alternatePhone || ''}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Statutory Compliance & Drug Licenses */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <Building2 size={16} color="#818cf8" />
              <span>Statutory Compliance & Drug Licenses (Form 20 / 21)</span>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Drug Licence No (Form 20 & 21)</label>
                <input
                  className="input-text font-mono"
                  value={formData.drugLicNo || ''}
                  onChange={(e) => setFormData({ ...formData, drugLicNo: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">GSTIN Identification No.</label>
                <input
                  className="input-text font-mono"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">FSSAI Licence Number</label>
                <input
                  className="input-text font-mono"
                  value={formData.fssaiNo || ''}
                  onChange={(e) => setFormData({ ...formData, fssaiNo: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Store UPI ID (for QR Code Payment)</label>
                <input
                  className="input-text font-mono"
                  value={formData.upiId || ''}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label className="input-label">Registered Pharmacist in-charge</label>
                <input
                  className="input-text"
                  value={formData.registeredPharmacist || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, registeredPharmacist: e.target.value })
                  }
                />
              </div>

              <div className="input-group">
                <label className="input-label">Pharmacist Registration No</label>
                <input
                  className="input-text font-mono"
                  value={formData.pharmacistRegNo || ''}
                  onChange={(e) => setFormData({ ...formData, pharmacistRegNo: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Card: Terms & Conditions and Actions */}
        <div className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="input-group">
            <label className="input-label">Terms & Conditions (Printed on Cash Memo)</label>
            <textarea
              className="input-text font-mono"
              rows={4}
              value={formData.termsAndConditions || ''}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Updating SQLite...' : 'Save Store Profile'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
