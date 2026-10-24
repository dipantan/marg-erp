import React from 'react'
import { createPortal } from 'react-dom'
import { useModalEscape } from '../hooks/useModalEscape'

export interface ModalProps {
  isOpen?: boolean
  onClose: () => void
  maxWidth?: string | number
  className?: string
  dialogStyle?: React.CSSProperties
  overlayStyle?: React.CSSProperties
  children: React.ReactNode
}

/**
 * Standard enterprise desktop Modal component with built-in Esc key dismissal.
 * Renders via React Portal directly into document.body so that dialogs are not
 * trapped in inner scroll containers and can be printed cleanly without app shell bleed.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen = true,
  onClose,
  maxWidth,
  className = '',
  dialogStyle,
  overlayStyle,
  children
}) => {
  useModalEscape(onClose, isOpen)

  if (!isOpen) return null

  const modalNode = (
    <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
      <div
        className={`modal-dialog ${className}`.trim()}
        style={{ ...(maxWidth ? { maxWidth } : {}), ...dialogStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body)
  }

  return modalNode
}

export default Modal
