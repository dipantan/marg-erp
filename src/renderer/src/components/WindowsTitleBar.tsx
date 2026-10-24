import React from 'react'
import { Minus, Square, X } from 'lucide-react'

interface WindowsTitleBarProps {
  storeName?: string
}

export const WindowsTitleBar: React.FC<WindowsTitleBarProps> = ({ storeName }) => {
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent)

  const handleMinimize = (): void => {
    window.api?.window?.minimize?.()
  }

  const handleMaximize = (): void => {
    window.api?.window?.maximize?.()
  }

  const handleClose = (): void => {
    window.api?.window?.close?.()
  }

  return (
    <div className="windows-titlebar">
      {/* On macOS, traffic light clearance space */}
      {isMac ? (
        <div className="w-[78px] shrink-0" />
      ) : (
        <div className="flex items-center gap-2 pl-3">
          <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white">
            M
          </div>
        </div>
      )}

      {/* Main Title - Enterprise ERP style */}
      <div className="titlebar-text">
        <span className="font-semibold text-slate-200">Marg ERP 9+ Enterprise</span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-400 font-medium">
          {storeName || 'M/S JANATA MEDICAL STORES'}
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400 text-xs">Offline SQLite 3 (WAL Engine)</span>
      </div>

      {/* Non-Mac Window Controls */}
      {!isMac && (
        <div
          className="flex items-center shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            className="win-control-btn hover:bg-slate-700"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            className="win-control-btn hover:bg-slate-700"
            onClick={handleMaximize}
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            className="win-control-btn hover:bg-red-600 text-slate-400 hover:text-white"
            onClick={handleClose}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
