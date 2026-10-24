import React from 'react'
import { LayoutDashboard, Boxes, Receipt, Users, Database, Building2 } from 'lucide-react'

export type NavTab = 'dashboard' | 'items' | 'invoices' | 'customers' | 'database' | 'settings'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  dbConnected: boolean
  storeName?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, dbConnected }) => {
  return (
    <aside className="desktop-nav-sidebar">
      <div className="nav-tree-section">
        <div className="nav-tree-header">PHARMACY MODULES</div>

        <button
          className={`desktop-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectTab('dashboard')}
          title="Alt+1: Daily Overview & Sales"
        >
          <LayoutDashboard size={14} />
          <span className="nav-item-title">Overview</span>
          <span className="nav-shortcut-tag">Alt+1</span>
        </button>

        <button
          className={`desktop-nav-item ${currentTab === 'invoices' ? 'active' : ''}`}
          onClick={() => onSelectTab('invoices')}
          title="Alt+2 / F6: Cash Memos & Billing"
        >
          <Receipt size={14} />
          <span className="nav-item-title">Cash Memos</span>
          <span className="nav-shortcut-tag">Alt+2</span>
        </button>

        <button
          className={`desktop-nav-item ${currentTab === 'items' ? 'active' : ''}`}
          onClick={() => onSelectTab('items')}
          title="Alt+3 / F5: Medicine Stock & Batches"
        >
          <Boxes size={14} />
          <span className="nav-item-title">Medicine Stock</span>
          <span className="nav-shortcut-tag">Alt+3</span>
        </button>

        <button
          className={`desktop-nav-item ${currentTab === 'customers' ? 'active' : ''}`}
          onClick={() => onSelectTab('customers')}
          title="Alt+4 / F7: Patients & Debtors Ledger"
        >
          <Users size={14} />
          <span className="nav-item-title">Patient Ledger</span>
          <span className="nav-shortcut-tag">Alt+4</span>
        </button>
      </div>

      <div className="nav-tree-section">
        <div className="nav-tree-header">SYSTEM & MASTERS</div>

        <button
          className={`desktop-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onSelectTab('settings')}
          title="Alt+5 / F8: Store Licenses & Form 20/21"
        >
          <Building2 size={14} />
          <span className="nav-item-title">Store Licences</span>
          <span className="nav-shortcut-tag">Alt+5</span>
        </button>

        <button
          className={`desktop-nav-item ${currentTab === 'database' ? 'active' : ''}`}
          onClick={() => onSelectTab('database')}
          title="Alt+6 / F9: SQLite Offline Engine"
        >
          <Database size={14} />
          <span className="nav-item-title">SQLite Engine</span>
          <span className="nav-shortcut-tag">Alt+6</span>
        </button>
      </div>

      <div className="desktop-nav-footer">
        <div className="desktop-engine-status">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            />
            <span className="font-semibold text-[11px] text-slate-200">100% Offline DB</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">SQLite 3 (WAL Engine)</span>
        </div>
      </div>
    </aside>
  )
}
