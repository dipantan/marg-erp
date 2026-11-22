import React, { useEffect } from 'react'
import {
  FileText,
  PackagePlus,
  Boxes,
  Receipt,
  Users,
  Settings,
  Database,
  Save,
  HelpCircle,
  Calendar,
  Wallet,
  RotateCcw
} from 'lucide-react'
import type { NavTab } from './Sidebar'

interface FunctionKeyToolbarProps {
  currentTab: NavTab
  onNavigate: (tab: NavTab) => void
  onNewInvoice: () => void
  onNewItem: () => void
  onBackup: () => void
  onOpenHelp: () => void
}

export const FunctionKeyToolbar: React.FC<FunctionKeyToolbarProps> = ({
  currentTab,
  onNavigate,
  onNewInvoice,
  onNewItem,
  onBackup,
  onOpenHelp
}) => {
  // Global Function Key Listener for true Windows ERP muscle memory
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'F1') {
        e.preventDefault()
        onOpenHelp()
      } else if (e.key === 'F2') {
        e.preventDefault()
        onNavigate('dashboard')
      } else if (e.key === 'F3') {
        e.preventDefault()
        onNewInvoice()
      } else if (e.key === 'F4') {
        e.preventDefault()
        onNewItem()
      } else if (e.key === 'F5') {
        e.preventDefault()
        onNavigate('items')
      } else if (e.key === 'F6') {
        e.preventDefault()
        onNavigate('invoices')
      } else if (e.key === 'F7') {
        e.preventDefault()
        onNavigate('customers')
      } else if (e.key === 'F8') {
        e.preventDefault()
        onNavigate('balanceSheet')
      } else if (e.key === 'F9') {
        e.preventDefault()
        onNavigate('expiryReturns')
      } else if (e.key === 'F10') {
        e.preventDefault()
        onBackup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigate, onNewInvoice, onNewItem, onBackup, onOpenHelp])

  return (
    <div className="desktop-toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onOpenHelp}
          title="F1: Keyboard Shortcuts Cheatsheet"
        >
          <span className="fkey-badge">F1</span>
          <HelpCircle size={14} />
          <span>Help</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          title="F2: Daily Pharmacy Dashboard"
        >
          <span className="fkey-badge">F2</span>
          <Calendar size={14} />
          <span>Overview</span>
        </button>

        <button
          className="toolbar-btn toolbar-btn-highlight"
          onClick={onNewInvoice}
          title="F3: Issue New Retail / Wholesale Invoice"
        >
          <span className="fkey-badge fkey-badge-gold">F3</span>
          <FileText size={14} />
          <span>New Bill</span>
        </button>

        <button className="toolbar-btn" onClick={onNewItem} title="F4: Register New Medicine SKU">
          <span className="fkey-badge">F4</span>
          <PackagePlus size={14} />
          <span>Add SKU</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${currentTab === 'items' ? 'active' : ''}`}
          onClick={() => onNavigate('items')}
          title="F5: Medicine Inventory & Batch Stock"
        >
          <span className="fkey-badge">F5</span>
          <Boxes size={14} />
          <span>Stock</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'invoices' ? 'active' : ''}`}
          onClick={() => onNavigate('invoices')}
          title="F6: Retail & Wholesale Billing Register"
        >
          <span className="fkey-badge">F6</span>
          <Receipt size={14} />
          <span>Bills</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'customers' ? 'active' : ''}`}
          onClick={() => onNavigate('customers')}
          title="F7: Patient & Customer Accounts Ledger"
        >
          <span className="fkey-badge">F7</span>
          <Users size={14} />
          <span>Patients</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'balanceSheet' ? 'active' : ''}`}
          onClick={() => onNavigate('balanceSheet')}
          title="F8: Balance Sheet & Ledgers (দোকান ও কাস্টমার বাকি)"
        >
          <span className="fkey-badge">F8</span>
          <Wallet size={14} color="#f59e0b" />
          <span>Balance Sheet</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'expiryReturns' ? 'active' : ''}`}
          onClick={() => onNavigate('expiryReturns')}
          title="F9: Expiry Medicine Return to Supplier"
        >
          <span className="fkey-badge">F9</span>
          <RotateCcw size={14} color="#ef4444" />
          <span>Expiry Return</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
          title="Store Drug Licenses & Profile"
        >
          <Settings size={14} />
          <span>Licenses</span>
        </button>

        <button
          className={`toolbar-btn ${currentTab === 'database' ? 'active' : ''}`}
          onClick={() => onNavigate('database')}
          title="Local Data Health & Statistics"
        >
          <Database size={14} />
          <span>Data</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onBackup}
          title="F10: Instant Local Database Backup"
        >
          <span className="fkey-badge">F10</span>
          <Save size={14} />
          <span>Backup</span>
        </button>
      </div>
    </div>
  )
}
