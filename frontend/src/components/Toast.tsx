import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  detail?: string
}

interface ToastCtx {
  toast: (message: string, opts?: { type?: ToastType; detail?: string }) => void
  success: (message: string, detail?: string) => void
  error: (message: string, detail?: string) => void
  info: (message: string, detail?: string) => void
}

const ToastContext = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
})

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
}

const COLORS: Record<ToastType, string> = {
  success: 'var(--mint)',
  error: '#e05c5c',
  info: 'var(--sky)',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [out, setOut] = useState(false)
  const accent = COLORS[toast.type]

  useEffect(() => {
    const dismiss = setTimeout(() => setOut(true), 3200)
    const remove  = setTimeout(() => onDismiss(toast.id), 3600)
    return () => { clearTimeout(dismiss); clearTimeout(remove) }
  }, [toast.id, onDismiss])

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: 'var(--card)',
        border: `2px solid var(--ink)`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        boxShadow: '3px 3px 0 0 var(--ink)',
        maxWidth: 340, minWidth: 220, width: '100%',
        transform: out ? 'translateX(110%)' : 'translateX(0)',
        opacity: out ? 0 : 1,
        transition: 'transform 0.28s cubic-bezier(0.2,0,0,1), opacity 0.28s',
        cursor: 'pointer',
      }}
      onClick={() => { setOut(true); setTimeout(() => onDismiss(toast.id), 300) }}
    >
      {/* Icon */}
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: accent, color: toast.type === 'success' ? '#0A0A0A' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--display)', fontWeight: 900, fontSize: 12,
        flexShrink: 0, marginTop: 1,
      }}>
        {ICONS[toast.type]}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>
          {toast.message}
        </div>
        {toast.detail && (
          <div style={{ fontFamily: 'var(--eina)', fontSize: 11, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>
            {toast.detail}
          </div>
        )}
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, opts?: { type?: ToastType; detail?: string }) => {
    const id = Date.now().toString() + Math.random()
    setToasts(prev => [...prev.slice(-2), { id, type: opts?.type || 'info', message, detail: opts?.detail }])
  }, [])

  const ctx = useMemo<ToastCtx>(() => ({
    toast: show,
    success: (msg, detail) => show(msg, { type: 'success', detail }),
    error:   (msg, detail) => show(msg, { type: 'error',   detail }),
    info:    (msg, detail) => show(msg, { type: 'info',    detail }),
  }), [show])

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          bottom: 'max(80px, env(safe-area-inset-bottom, 0px) + 80px)',
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export default ToastProvider
