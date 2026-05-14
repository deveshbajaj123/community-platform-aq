import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // Prevent body scroll while open
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="aq-lightbox-overlay" onClick={onClose}>
      <img
        src={src}
        alt={alt || ''}
        className="aq-lightbox-img"
        onClick={e => e.stopPropagation()}
        draggable={false}
      />
      <button
        className="aq-lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
    </div>,
    document.body
  )
}
