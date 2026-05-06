import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import { useAuth } from './AuthContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { member, isLoading: authLoading, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!authLoading && isAuthenticated && member) {
      if (!member.class_grade || !member.join_reason) {
        navigate('/register', { replace: true })
      } else if (member.status === 'active') {
        navigate(from, { replace: true })
      } else if (member.status === 'pending_approval') {
        navigate('/pending', { replace: true })
      } else if (member.status === 'rejected') {
        navigate('/rejected', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, member, navigate, from])

  // Only block on auth initialisation
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabaseCommunity.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to process Google login')
      setIsLoading(false)
    }
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
            <button
              onClick={handleGoogleSignIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 32px',
                background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)',
                cursor: 'pointer', fontSize: 14, fontFamily: 'var(--f-display)', fontWeight: 600,
                color: 'var(--txt)', letterSpacing: '0.02em',
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
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
