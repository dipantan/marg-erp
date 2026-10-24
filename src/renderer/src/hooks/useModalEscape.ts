import { useEffect, useRef } from 'react'

type DismissCallback = () => void

// Global modal stack to track all opened modals in LIFO order
const modalStack: DismissCallback[] = []

// Global capture-phase listener to guarantee Esc dismissal across the entire app
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalStack.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          // Dismiss the top-most modal
          const topDismiss = modalStack[modalStack.length - 1]
          topDismiss()
        } else {
          // Fallback: check if any .modal-overlay exists in the DOM
          const overlays = document.querySelectorAll<HTMLElement>('.modal-overlay')
          if (overlays.length > 0) {
            e.preventDefault()
            e.stopPropagation()
            const topOverlay = overlays[overlays.length - 1]
            topOverlay.click()
          }
        }
      }
    },
    true // Capture phase ensures Esc is caught even inside focused inputs / elements
  )
}

/**
 * Hook to register an Esc key dismissal callback to the global modal stack
 */
export function useModalEscape(onClose: () => void, isOpen: boolean = true): void {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    const dismiss = (): void => {
      onCloseRef.current()
    }

    modalStack.push(dismiss)
    return () => {
      const idx = modalStack.lastIndexOf(dismiss)
      if (idx !== -1) {
        modalStack.splice(idx, 1)
      }
    }
  }, [isOpen])
}

export default useModalEscape
