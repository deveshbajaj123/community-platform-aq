import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const RejectedPage = () => {
  const navigate = useNavigate()
  const { member, logout, isAuthenticated } = useAuth()

  if (!isAuthenticated || member?.status !== 'rejected') {
    navigate('/login')
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="aq-auth-page">
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 52, marginBottom: 24, color: '#e05c5c' }}>✕</div>
        <h1 className="aq-title" style={{ marginBottom: 16 }}>This one didn't work out.</h1>
        <p className="aq-serif" style={{ color: 'var(--txt-2)', marginBottom: 24, fontSize: 18 }}>
          Your application to join AquaTerra wasn't approved this time.
        </p>

        {member?.rejectionNote && (
          <div style={{ background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r)', padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, color: '#e05c5c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Reason</p>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.6 }}>{member.rejectionNote}</p>
          </div>
        )}

        <p style={{ fontFamily: 'var(--f-display)', fontSize: 12, color: 'var(--txt-3)', marginBottom: 32, letterSpacing: '0.04em' }}>
          Questions? Reach us on WhatsApp or Instagram @ngo.aquaterra
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/volunteer/apply" className="aq-btn aq-btn-ink">Re-apply →</Link>
          <button onClick={handleLogout} className="aq-btn aq-btn-outline">Sign Out</button>
        </div>
      </div>
    </div>
  )
}

export default RejectedPage
