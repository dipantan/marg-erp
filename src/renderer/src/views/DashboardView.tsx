import React from 'react'
import {
  DollarSign,
  FileText,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Plus,
  Printer
} from 'lucide-react'
import type { DatabaseStats, Invoice, ProductWithBatches, ProductBatch } from '@shared/types'
import type { NavTab } from '../components/Sidebar'

interface DashboardViewProps {
  stats: DatabaseStats | null
  recentInvoices: Invoice[]
  lowStockItems: ProductWithBatches[]
  expiringSoonItems: ProductBatch[]
  onNavigate: (tab: NavTab) => void
  onNewInvoice: () => void
  onPrintInvoice: (inv: Invoice) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentInvoices,
  lowStockItems,
  expiringSoonItems,
  onNavigate,
  onNewInvoice,
  onPrintInvoice
}) => {
  return (
    <div className="app-content">
      {/* Pharmacy Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': '#6366f1' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Total Sales Revenue</span>
            <DollarSign size={16} color="#6366f1" />
          </div>
          <div className="metric-value">
            ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">Offline SQLite Cash Memos</div>
        </div>

        <div className="metric-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Cash Memos Billed</span>
            <FileText size={16} color="#10b981" />
          </div>
          <div className="metric-value">{stats?.totalInvoices || 0}</div>
          <div className="metric-sub">Doctor prescription registers</div>
        </div>

        <div className="metric-card" style={{ '--card-accent': '#f59e0b' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Stock Alerts (Low)</span>
            <AlertTriangle size={16} color="#f59e0b" />
          </div>
          <div className="metric-value" style={{ color: 'var(--warning)' }}>
            {lowStockItems.length}
          </div>
          <div className="metric-sub">Medicines below min strip threshold</div>
        </div>

        <div className="metric-card" style={{ '--card-accent': '#ef4444' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Near Expiry Attention</span>
            <Clock size={16} color="#ef4444" />
          </div>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>
            {expiringSoonItems.length}
          </div>
          <div className="metric-sub">Items expiring within 12 months</div>
        </div>
      </div>

      {/* Main Grid: Recent Cash Memos & Stock/Expiry Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr', gap: '20px' }}>
        {/* Recent Cash Memos */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Cash Memos</h2>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Recent Marg-style GST bills issued
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('invoices')}>
              <span>All Memos</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>No cash memos generated yet.</p>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '12px' }}
                onClick={onNewInvoice}
              >
                <Plus size={14} /> Issue First Memo
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Memo No</th>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 700, color: '#818cf8', fontFamily: 'monospace' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td>{inv.invoiceDate}</td>
                      <td style={{ fontWeight: 600 }}>{inv.patientName}</td>
                      <td style={{ fontWeight: 700 }}>₹{inv.grandTotal.toFixed(2)}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onPrintInvoice(inv)}
                          title="Print Marg Cash Memo"
                        >
                          <Printer size={13} /> Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stock & Expiry Alerts Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Low Stock Alert */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={17} color="var(--warning)" />
                <h3 className="card-title" style={{ fontSize: '0.98rem' }}>
                  Low Stock Medicines
                </h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('items')}>
                Manage
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--success)' }}>
                ✓ All medicine stocks are well replenished
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Pack: {item.packLabel} • Min Alert: {item.reorderLevel}
                      </div>
                    </div>
                    <span className="badge badge-warning">
                      {item.totalStockStrips}p : {item.totalStockLoose}l
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Alerts */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={17} color="var(--danger)" />
                <h3 className="card-title" style={{ fontSize: '0.98rem' }}>
                  Near Expiry Attention
                </h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('items')}>
                View
              </button>
            </div>

            {expiringSoonItems.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--success)' }}>
                ✓ No medicines expiring in near future
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {expiringSoonItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                        {item.productName || 'Medicine'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Batch: {item.batchNo} • Pack: {item.packLabel || '10S'}
                      </div>
                    </div>
                    <span className="badge badge-danger">Exp: {item.expDate}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
