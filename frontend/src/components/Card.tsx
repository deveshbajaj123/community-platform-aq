import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

const Card = ({ children, className = '', hover = false }: CardProps) => {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden
        ${hover ? 'card-hover' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface CardSectionProps {
  children: ReactNode
  className?: string
}

Card.Header = ({ children, className = '' }: CardSectionProps) => (
  <div className={`px-5 py-4 border-b border-cream-200 ${className}`}>
    {children}
  </div>
)

Card.Body = ({ children, className = '' }: CardSectionProps) => (
  <div className={`px-5 py-4 ${className}`}>
    {children}
  </div>
)

Card.Footer = ({ children, className = '' }: CardSectionProps) => (
  <div className={`px-5 py-4 border-t border-cream-200 bg-cream-50 ${className}`}>
    {children}
  </div>
)

export default Card
