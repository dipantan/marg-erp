import React from 'react'
import type { NavTab } from './Sidebar'

interface HeaderProps {
  currentTab: NavTab
}

const tabMeta: Record<NavTab, { section: string; title: string; hint: string }> = {
  dashboard: {
    section: 'OPERATIONS',
    title: 'Daily Pharmacy Overview & Cash Memo Summary',
    hint: 'F2'
  },
  items: {
    section: 'INVENTORY MASTER',
    title: 'Medicine Store, FEFO Batch Stock & Expiries',
    hint: 'F5'
  },
  invoices: {
    section: 'TRANSACTIONS',
    title: 'GST Cash Memo & Prescription Register',
    hint: 'F6'
  },
  customers: {
    section: 'ACCOUNTS',
    title: 'Patient Accounts Ledger & Outstanding Dues',
    hint: 'F7'
  },
  settings: {
    section: 'MASTERS',
    title: 'Store Configuration, Form 20/21 & Compliance',
    hint: 'F8'
  },
  database: {
    section: 'TOOLS',
    title: 'Database Engine & Data Storage',
    hint: 'F9'
  }
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { section, title, hint } = tabMeta[currentTab]

  return (
    <div className="desktop-module-header">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-bold text-indigo-400 font-mono tracking-wider">
          {section}
        </span>
        <span className="text-slate-600 font-bold">›</span>
        <span className="text-[12px] font-semibold text-slate-200 truncate">{title}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 border border-slate-700/60 rounded">
          KEY: <strong className="text-amber-400">{hint}</strong>
        </span>
      </div>
    </div>
  )
}
