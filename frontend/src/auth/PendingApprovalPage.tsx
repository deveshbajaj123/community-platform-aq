import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const PendingApprovalPage = () => {
  const navigate = useNavigate()
  const { member, isAuthenticated, refreshMember, logout } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => { refreshMember() }, 30000)
    return () => clearInterval(interval)
  }, [refreshMember, isAuthenticated])

  useEffect(() => {
    if (member?.status === 'active') navigate('/feed', { replace: true })
    else if (member?.status === 'rejected') navigate('/rejected', { replace: true })
  }, [member, navigate])

  const handleBackToLogin = () => {
    if (isAuthenticated) logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="aq-auth-page">
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 52, marginBottom: 24 }}>⏳</div>
        <h1 className="aq-title" style={{ marginBottom: 16 }}>You're in the queue.</h1>
        <p className="aq-serif" style={{ color: 'var(--txt-2)', marginBottom: 12, fontSize: 18 }}>
          A director is reviewing your profile. Usually takes a day or two.
        </p>
        {isAuthenticated && (
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>
            ● Checking status...
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32 }}>
          <Link to="/" className="aq-btn aq-btn-outline">Browse the feed →</Link>
          <button onClick={handleBackToLogin} className="aq-btn aq-btn-sm" style={{ color: 'var(--txt-3)', background: 'var(--surface)' }}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage
