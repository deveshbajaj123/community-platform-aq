import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import AuthFeaturePanel from '../components/AuthFeaturePanel'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }} aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { member, isLoading: authLoading, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'

  useEffect(() => {
    if (!authLoading && isAuthenticated && member) {
      if (!member.class_grade || !member.join_reason) navigate('/register', { replace: true })
      else if (member.status === 'active') navigate(from, { replace: true })
      else if (member.status === 'pending_approval') navigate('/pending', { replace: true })
      else if (member.status === 'rejected') navigate('/rejected', { replace: true })
    }
  }, [authLoading, isAuthenticated, member, navigate, from])

  if (authLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', background: 'var(--bg)' }}>
        <div className="login-spinner" aria-label="Loading" />
      </div>
    )
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true); setError(null)
    try {
      const { error: e } = await supabaseCommunity.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (e) throw e
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!password.trim()) { setError('Please enter your password.'); return }
    setIsLoading(true); setError(null)
    try {
      const { error: e } = await supabaseCommunity.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (e) throw e
      // Auth state change handled by useEffect above — no manual navigate needed
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password. If you joined with Google, use "Continue with Google" instead.')
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email address before logging in.')
      } else if (msg.toLowerCase().includes('too many requests')) {
        setError('Too many login attempts. Please wait a moment and try again.')
      } else {
        setError(msg || 'Failed to sign in. Please try again.')
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="login-root route-enter">

      {/* ── LEFT PANEL — desktop only ── */}
      <div className="login-left" aria-hidden="true">
        <AuthFeaturePanel mode="login" />
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="login-right">

        {/* Mobile-only logo */}
        <div className="login-mobile-logo" aria-hidden="true">
          <img src="/logo.png" alt="AquaTerra" style={{ height: 32, width: 'auto', mixBlendMode: 'multiply' }} />
        </div>

        <h2 className="h-display login-heading">let's go.</h2>

        {/* Error */}
        {error && (
          <div className="login-error" role="alert">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 900, fontSize: 16, lineHeight: 1, padding: '0 0 0 8px' }}
            >
              ×
            </button>
          </div>
        )}

        {/* Google — primary CTA */}
        <button
          className="btn login-google-btn"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <div className="login-spinner login-spinner-sm" />
              signing in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <span className="mono xs muted">OR</span>
          <div className="login-divider-line" />
        </div>

        {/* Email / password form */}
        <div className="login-form">
          <div>
            <label htmlFor="login-email" className="login-label">email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !isLoading) {
                  if (password.trim()) handleEmailLogin()
                  else document.getElementById('login-password')?.focus()
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="login-label">password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              placeholder="your password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleEmailLogin()}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleEmailLogin}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'logging in…' : 'LOG IN →'}
          </button>
        </div>

        {/* Footer link */}
        <p className="login-footer-text">
          new here?{' '}
          <button
            onClick={() => navigate('/volunteer/apply')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mint)', fontWeight: 700, fontSize: 'inherit', padding: 0 }}
          >
            apply to join
          </button>
        </p>
      </div>

      <style>{`
        /* ── Login page layout ── */
        .login-root {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: stretch;
        }

        /* ── Left panel ── */
        .login-left {
          display: flex;
          flex-direction: column;
          justify-content: stretch;
          border-right: 2px solid var(--ink);
          position: relative;
          overflow: hidden;
          padding: 0;
        }

        /* ── Right panel ── */
        .login-right {
          padding: clamp(40px, 6vw, 72px) clamp(24px, 5vw, 56px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          gap: 0;
          /* Safe area for notch devices */
          padding-bottom: max(clamp(40px, 6vw, 72px), env(safe-area-inset-bottom));
        }

        .login-heading {
          font-size: clamp(32px, 5vw, 44px);
          margin: 0 0 24px;
          line-height: 1;
        }

        /* ── Mobile logo — hidden desktop ── */
        .login-mobile-logo {
          display: none;
          margin-bottom: 28px;
        }

        /* ── Google button ── */
        .login-google-btn {
          width: 100%;
          justify-content: center;
          gap: 10px;
          height: 52px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 999px;
          transition-property: background, transform, box-shadow;
          transition-duration: 0.15s;
        }
        .login-google-btn:hover { transform: translateY(-1px); }
        .login-google-btn:active { transform: scale(0.97); }

        /* ── Divider ── */
        .login-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .login-divider-line {
          flex: 1;
          height: 1.5px;
          background: var(--line);
          border-radius: 1px;
        }

        /* ── Form fields ── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .login-label {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-3);
          display: block;
          margin-bottom: 5px;
        }
        /* Comfortable touch height for inputs */
        .login-root .input {
          height: 50px;
          font-size: 15px;
        }

        /* ── Error banner ── */
        .login-error {
          background: rgba(224, 92, 92, 0.1);
          border: 1.5px solid rgba(224, 92, 92, 0.3);
          border-radius: var(--r);
          padding: 12px 14px;
          margin-bottom: 20px;
          color: #e05c5c;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* ── Footer text ── */
        .login-footer-text {
          margin-top: 20px;
          text-align: center;
          font-size: 13.5px;
          color: var(--ink-3);
        }

        /* ── Spinner ── */
        @keyframes login-spin { to { transform: rotate(360deg); } }
        .login-spinner {
          width: 32px; height: 32px;
          border: 2.5px solid var(--line-2);
          border-top-color: var(--mint);
          border-radius: 50%;
          animation: login-spin 0.8s linear infinite;
        }
        .login-spinner-sm {
          width: 16px; height: 16px;
          border-width: 2px;
          flex-shrink: 0;
        }

        /* ── MOBILE — single column, form-first ── */
        @media (max-width: 640px) {
          .login-root {
            grid-template-columns: 1fr;
            min-height: 100dvh;
          }

          /* Hide decorative left panel completely */
          .login-left { display: none; }

          /* Show AQ logo at top of form */
          .login-mobile-logo { display: block; }

          .login-right {
            /* Full height, comfortable padding */
            min-height: 100dvh;
            padding: 48px 24px max(32px, env(safe-area-inset-bottom));
            justify-content: flex-start;
            max-width: 100%;
          }

          .login-heading { font-size: 36px; margin-bottom: 20px; }

          /* Google button even bigger on mobile — it's the primary action */
          .login-google-btn { height: 56px; font-size: 16px; }

          /* Full-width LOG IN button already handled above */
        }
      `}</style>
    </div>
  )
}

export default LoginPage
