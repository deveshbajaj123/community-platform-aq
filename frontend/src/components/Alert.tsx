import { ReactNode } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface AlertProps {
  children: ReactNode
  variant?: 'success' | 'error' | 'warning' | 'info'
  onClose?: () => void
  className?: string
}

const Alert = ({ children, variant = 'info', onClose, className = '' }: AlertProps) => {
  const variants = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: CheckCircleIcon
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: ExclamationTriangleIcon
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: ExclamationTriangleIcon
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: InformationCircleIcon
    }
  }

  const { bg, text, icon: Icon } = variants[variant]

  return (
    <div className={`${bg} ${text} border rounded-lg p-4 flex items-start ${className}`}>
      <Icon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="-my-2 -mr-2 ml-2 flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-md hover:opacity-70 [transition:opacity_120ms,transform_120ms] active:scale-[0.96]"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default Alert
