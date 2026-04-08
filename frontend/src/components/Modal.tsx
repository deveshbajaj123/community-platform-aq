import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fullScreenMobile?: boolean
}

const Modal = ({ isOpen, onClose, title, children, size = 'md', fullScreenMobile = false }: ModalProps) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  const mobileClasses = fullScreenMobile
    ? 'sm:rounded-xl rounded-none sm:m-0 m-0 sm:max-h-[85vh] max-h-[100dvh] sm:h-auto h-full'
    : 'rounded-xl max-h-[85vh] sm:max-h-[90vh]'

  // Use portal to render modal at document body level, outside any parent containers
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container - centers modal and handles overflow */}
      <div className={`flex min-h-full items-center justify-center ${fullScreenMobile ? 'sm:p-4 p-0' : 'p-4'}`}>
        <div
          className={`${sizes[size]} w-full bg-white shadow-xl relative animate-slide-up flex flex-col ${mobileClasses}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header - fixed at top */}
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body - scrollable */}
          <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

Modal.Footer = ({ children, className = '' }: ModalFooterProps) => (
  <div className={`flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 mt-4 ${className}`}>
    {children}
  </div>
)

export default Modal
