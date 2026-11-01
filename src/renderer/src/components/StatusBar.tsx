import React, { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import type { AppInfo, DatabaseStats } from '@shared/types'

interface StatusBarProps {
  appInfo?: AppInfo | null
  dbStats?: DatabaseStats | null
  storeName?: string
  storeCity?: string
  onBackup?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  appInfo,
  dbStats,
  storeName,
  storeCity,
  onBackup
}) => {
  const [timeStr, setTimeStr] = useState<string>('')

  useEffect(() => {
    const updateTime = (): void => {
      const now = new Date()
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer className="windows-statusbar">
      {/* Pane 1: Store / Licenced Entity */}
      <div className="statusbar-pane flex-1 min-w-0">
        <span className="text-slate-400">Store:</span>
        <span className="font-semibold text-slate-200 truncate">
          {storeName || 'M/S JANATA MEDICAL STORES'}
          {storeCity ? ` • ${storeCity}` : ''}
        </span>
      </div>

      {/* Pane 3: 1-Click Backup Data Action (Client Friendly) */}
      <div className="statusbar-pane">
        <button
          type="button"
          onClick={onBackup}
          className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 cursor-pointer bg-transparent border-0 p-0"
          title="F10: Click to create an instant offline data backup"
        >
          <Save size={12} className="text-emerald-400" />
          <span className="font-medium">Backup Data</span>
          <span className="text-amber-400 font-mono text-[10px]">[F10]</span>
        </button>
      </div>

      {/* Pane 4: Inventory & Billing Record Summary */}
      {dbStats && (
        <div className="statusbar-pane">
          <span className="text-slate-400">Stock Items:</span>
          <span className="font-mono text-indigo-400 font-semibold">{dbStats.totalProducts}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Bills:</span>
          <span className="font-mono text-slate-200 font-semibold">{dbStats.totalInvoices}</span>
        </div>
      )}

      {/* Pane 5: App Version & Help Shortcut */}
      <div className="statusbar-pane">
        <span className="text-slate-400">v{appInfo?.version || '0.1.0'}</span>
        <span className="text-slate-500">•</span>
        <span className="text-amber-400 font-mono text-[10px]">[F1: Help]</span>
      </div>

      {/* Pane 6: System Digital Clock */}
      <div className="statusbar-pane statusbar-pane-clock">
        <span className="font-mono font-semibold text-slate-200">{timeStr}</span>
      </div>
    </footer>
  )
}
