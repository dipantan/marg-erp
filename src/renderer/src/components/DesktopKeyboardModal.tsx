import React from 'react'
import { X, Keyboard } from 'lucide-react'

import { Modal } from './Modal'

interface DesktopKeyboardModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { key: 'F1', label: 'Help', desc: 'Open Marg ERP keyboard shortcuts cheatsheet' },
  { key: 'F2', label: 'Dashboard', desc: 'Jump to daily pharmacy overview & metrics' },
  { key: 'F3', label: 'New Cash Memo', desc: 'Instant 1-click patient sale invoice creation' },
  { key: 'F4', label: 'Add Medicine', desc: 'Register new pharmaceutical SKU with initial batch' },
  { key: 'F5', label: 'Stock Master', desc: 'View current medicine inventory with FEFO batches' },
  { key: 'F6', label: 'Bills Register', desc: 'Prescription & GST cash memo registry' },
  { key: 'F7', label: 'Patients', desc: 'Customer accounts ledger and due balances' },
  { key: 'F8', label: 'Store Compliance', desc: 'Drug licenses Form 20/21, GSTIN, FSSAI' },
  { key: 'F9', label: 'SQLite DB', desc: 'Database file statistics, WAL journal inspection' },
  { key: 'F10', label: 'Backup DB', desc: '1-click instant backup export to Desktop' },
  { key: 'Esc', label: 'Close / Cancel', desc: 'Close any active dialog or modal window' }
]

export const DesktopKeyboardModal: React.FC<DesktopKeyboardModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="640px">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-indigo-400" />
            <h3 className="modal-title">Marg ERP Desktop Keyboard Accelerators</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="modal-body">
          <p className="text-xs text-slate-400 mb-3">
            In standard Indian pharmacy enterprise ERPs, all operations can be performed using
            function keys for maximum billing speed without touching the mouse:
          </p>

          <div className="table-container border border-slate-700/60">
            <table className="erp-table text-xs">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Key</th>
                  <th style={{ width: '160px' }}>Command</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((sc) => (
                  <tr key={sc.key}>
                    <td>
                      <span className="fkey-badge fkey-badge-gold">{sc.key}</span>
                    </td>
                    <td className="font-semibold text-slate-200">{sc.label}</td>
                    <td className="text-slate-400">{sc.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close (Esc)
          </button>
        </div>
    </Modal>
  )
}
