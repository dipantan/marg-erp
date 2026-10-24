import React, { useState } from 'react'
import { HardDrive, RefreshCw, Cpu, Layers, Download, CheckCircle, FolderOpen } from 'lucide-react'
import type { DatabaseStats, AppInfo } from '@shared/types'

interface DatabaseViewProps {
  stats: DatabaseStats | null
  appInfo: AppInfo | null
  onRefresh: () => Promise<void>
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ stats, appInfo, onRefresh }) => {
  const [vacuuming, setVacuuming] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [backupPath, setBackupPath] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const handleVacuum = async (): Promise<void> => {
    setVacuuming(true)
    setActionMessage('')
    try {
      const res = await window.api.db.vacuum()
      if (res.success) {
        setActionMessage('SQLite VACUUM complete. Unused database pages reclaimed.')
        await onRefresh()
      } else {
        setActionMessage('Error: ' + res.error)
      }
    } finally {
      setVacuuming(false)
    }
  }

  const handleOpenFolder = async (): Promise<void> => {
    await window.api.app.openUserData()
  }

  const handleExportBackup = async (): Promise<void> => {
    setExporting(true)
    setBackupPath('')
    setActionMessage('')
    try {
      const res = await window.api.db.exportBackup()
      if (res.success && res.data) {
        setBackupPath(res.data.savedPath)
        setActionMessage(`Backup saved successfully to Desktop: ${res.data.savedPath}`)
      } else {
        setActionMessage('Export failed: ' + res.error)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="app-content">
      {/* 100% Offline Promise Banner */}
      <div
        style={{
          padding: '16px 20px',
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)' }}>
            ✓ 100% Offline Medical Store Database
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Zero internet connection required. All medicines, patient histories, and GST invoices
            are stored locally on this PC with instant read/write access.
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleExportBackup} disabled={exporting}>
          <Download size={16} />
          <span>{exporting ? 'Creating Backup...' : 'Backup Database to Desktop'}</span>
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            background: backupPath ? 'var(--success-bg)' : 'var(--info-bg)',
            border: `1px solid ${backupPath ? 'var(--success-border)' : 'var(--info-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: backupPath ? 'var(--success)' : 'var(--info)',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Database Performance Stats */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--card-accent': '#6366f1' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Primary DB File</span>
            <HardDrive size={16} color="#6366f1" />
          </div>
          <div className="metric-value">{stats?.fileSizeKb || 0} KB</div>
          <div className="metric-sub">SQLite 3 single-file binary</div>
        </div>

        <div className="metric-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
          <div className="metric-label">
            <span>WAL Journal File</span>
            <Layers size={16} color="#10b981" />
          </div>
          <div className="metric-value">{stats?.walSizeKb || 0} KB</div>
          <div className="metric-sub">Zero-lock concurrency log</div>
        </div>

        <div className="metric-card" style={{ '--card-accent': '#38bdf8' } as React.CSSProperties}>
          <div className="metric-label">
            <span>Runtime Host</span>
            <Cpu size={16} color="#38bdf8" />
          </div>
          <div className="metric-value" style={{ fontSize: '1.2rem', marginTop: '6px' }}>
            Electron {appInfo?.electronVersion || '44.x'}
          </div>
          <div className="metric-sub">
            Node.js {appInfo?.nodeVersion || '24.x'} ({appInfo?.platform})
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        {/* Storage Configuration */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Local File Storage</h2>
            <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
              <RefreshCw size={13} />
              <span>Refresh Stats</span>
            </button>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.86rem' }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                DATABASE ABSOLUTE PATH ON THIS PC
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-input)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  wordBreak: 'break-all',
                  color: '#818cf8'
                }}
              >
                {stats?.databasePath || appInfo?.dbPath || 'Loading...'}
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
                APP DATA USER FOLDER
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-input)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  wordBreak: 'break-all'
                }}
              >
                {appInfo?.userDataPath || 'Loading...'}
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={handleOpenFolder}>
                <FolderOpen size={16} />
                <span>Open Data Folder in OS</span>
              </button>

              <button className="btn btn-secondary" onClick={handleVacuum} disabled={vacuuming}>
                <RefreshCw size={16} className={vacuuming ? 'spinning' : ''} />
                <span>{vacuuming ? 'Defragmenting...' : 'Vacuum DB'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRAGMA Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">SQLite PRAGMA Settings</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem'
              }}
            >
              <span>journal_mode</span>
              <span className="badge badge-success">WAL (Zero-Lock Write Ahead)</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem'
              }}
            >
              <span>synchronous</span>
              <span className="badge badge-info">NORMAL (Fast Flush)</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem'
              }}
            >
              <span>foreign_keys</span>
              <span className="badge badge-success">ON (Integrity Enforced)</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem'
              }}
            >
              <span>temp_store</span>
              <span className="badge badge-info">MEMORY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
