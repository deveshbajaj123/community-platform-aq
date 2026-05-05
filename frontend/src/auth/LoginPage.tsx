import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from './AuthContext'

interface GoogleJwtPayload {
  sub: string
  email: string
  name: string
  picture?: string
  email_verified: boolean
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, member, isLoading: authLoading, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'

  useEffect(() => {
    if (!authLoading && isAuthenticated && member) {
      if (member.status === 'active') navigate(from, { replace: true })
      else if (member.status === 'pending_approval') navigate('/pending', { replace: true })
      else if (member.status === 'rejected') navigate('/rejected', { replace: true })
    }
  }, [authLoading, isAuthenticated, member, navigate, from])

  if (authLoading || (isAuthenticated && member)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="aq-spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) { setError('Failed to get credentials from Google'); return }
    setIsLoading(true); setError(null)
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential)
      const result = await login({
        googleId: decoded.sub, email: decoded.email, name: decoded.name,
        picture: decoded.picture, credential: credentialResponse.credential,
      })
      if (result.success) {
        if (result.status === 'active') navigate(from, { replace: true })
        else if (result.status === 'needs_registration') navigate('/register', { state: { googleProfile: { googleId: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture } } })
        else if (result.status === 'pending_approval') navigate('/pending')
        else if (result.status === 'rejected') navigate('/rejected')
      } else {
        setError(result.message || 'Login failed')
      }
    } catch { setError('Failed to process Google login') }
    finally { setIsLoading(false) }
  }

  return (
    <div className="aq-auth-page">
      <div className="aq-auth-card">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 28, letterSpacing: '-0.03em', textTransform: 'uppercase', marginBottom: 12 }}>
            <span style={{ color: 'var(--accent)' }}>AQ</span><span style={{ color: 'var(--txt)' }}>uaTerra</span>
          </div>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--txt-2)', lineHeight: 1.5 }}>
            The internal activity wall.<br />Sign in to post and contribute.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, letterSpacing: '0.04em' }}>
            {error}
            <button onClick={() => setError(null)} style={{ float: 'right', color: 'var(--txt-3)' }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="aq-spinner" style={{ width: 28, height: 28 }} />
              <p style={{ fontFamily: 'var(--f-display)', fontSize: 11, color: 'var(--txt-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Signing in…</p>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap
              theme="outline"
              size="large"
              width="300"
              text="signin_with"
              shape="rectangular"
            />
          )}
        </div>

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            FOR AQUATERRA MEMBERS ONLY
          </p>
          <Link to="/volunteer/apply" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Not a member? Apply to volunteer →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
