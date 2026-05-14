import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Star } from '../components/v6Shared'

const RejectedPage = () => {
  const navigate = useNavigate()
  const { member, logout, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || member?.status !== 'rejected') {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, member?.status, navigate])

  if (!isAuthenticated || member?.status !== 'rejected') {
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(44px, 8vw, 80px)', paddingBottom: 'clamp(44px, 8vw, 80px)', maxWidth: 600, textAlign: 'center' }}>
      <Star size={100} color="#FF4D2E" style={{ margin: '0 auto 20px', display: 'block' }} />
      <h1 className="h-display" style={{ fontSize: 'clamp(40px, 7vw, 64px)', marginTop: 0, lineHeight: 0.95 }}>
        this one<br />didn't work out.
      </h1>
      <p style={{ fontSize: 18, marginTop: 16, color: 'var(--ink-2)', lineHeight: 1.6 }}>
        your application to join AquaTerra was not approved this time.
      </p>

      {(member as any)?.rejection_note && (
        <div className="card" style={{ padding: 20, marginTop: 24, textAlign: 'left', borderLeft: '4px solid #FF4D2E' }}>
          <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 8, color: '#FF4D2E' }}>reason</div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{(member as any).rejection_note}</p>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginTop: 24, textAlign: 'left' }}>
        <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 12 }}>★ WHAT NOW</div>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2, color: 'var(--ink-2)' }}>
          <li>re-apply after 30 days with a stronger application</li>
          <li>reach us on Instagram <strong>@ngo.aquaterra</strong> with questions</li>
          <li>volunteer at community drives without being a formal member</li>
        </ul>
      </div>

      <div className="row gap-2" style={{ marginTop: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="https://instagram.com/ngo.aquaterra" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          message us on instagram
        </a>
        <button className="btn" onClick={handleLogout}>log out</button>
      </div>
    </div>
  )
}

export default RejectedPage
