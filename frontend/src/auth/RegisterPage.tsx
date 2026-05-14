import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { I } from '../components/v6Shared'
import { useAuth } from './AuthContext'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import AuthFeaturePanel from '../components/AuthFeaturePanel'

const CLASS_OPTIONS = [
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
  'College 1st Year', 'College 2nd Year', 'College 3rd Year', 'College 4th Year', 'Other',
]

const RegisterPage = () => {
  const navigate = useNavigate()
  const { member, refreshMember, isLoading: authLoading, isAuthenticated } = useAuth()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: member?.full_name || '',
    classGrade: member?.class_grade || '',
    phone: member?.phone || '',
    joinReason: member?.join_reason || '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (member?.class_grade && member?.join_reason) {
      if (member.status === 'active') {
        navigate('/feed', { replace: true })
      } else if (member.status === 'pending_approval') {
        navigate('/pending', { replace: true })
      } else if (member.status === 'rejected') {
        navigate('/rejected', { replace: true })
      }
    }
  }, [member, navigate])

  if (authLoading || !member) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.fullName.trim() || !formData.classGrade) {
        setError('Please fill in your name and class before continuing.')
        return
      }
      setError(null)
      setStep(2)
    } else if (step === 2) {
      if (!formData.joinReason.trim()) {
        setError('Please tell us about a project you\'ve made.')
        return
      }
      setError(null)
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabaseCommunity
        .from('members')
        .update({
          full_name: formData.fullName,
          class_grade: formData.classGrade,
          phone: formData.phone,
          join_reason: formData.joinReason,
        })
        .eq('member_id', member.member_id)

      if (updateError) throw updateError

      await refreshMember()
      setStep(3)
    } catch (err: any) {
      console.error('Registration update error:', err)
      setError(err.message || 'Failed to submit registration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="route-enter" style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>

      {/* ── LEFT PANEL — desktop only ── */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '2px solid var(--ink)', overflow: 'hidden' }} className="reg-left-panel">
        <AuthFeaturePanel mode="register" />
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div style={{
        padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 56px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        maxWidth: 480, width: '100%', margin: '0 auto',
        paddingBottom: 'max(clamp(40px,6vw,64px), env(safe-area-inset-bottom))',
      }}>

      {/* Mobile-only logo */}
      <div className="reg-mobile-logo" style={{ display: 'none', marginBottom: 28 }}>
        <img src="/logo.png" alt="AquaTerra" style={{ height: 32, width: 'auto', mixBlendMode: 'multiply' }} />
      </div>

      <button className="btn btn-sm" style={{ alignSelf: 'flex-start', marginBottom: 20 }} onClick={() => navigate('/')}><I.back /> back</button>
      {step < 3 && <span className="sticker wobble" style={{ marginBottom: 12, display: 'inline-flex' }}>★ STEP {step} OF 2</span>}
      {step === 3 && <span className="sticker wobble" style={{ marginBottom: 12, display: 'inline-flex', background: 'var(--mint)', color: '#0A0A0A' }}>★ SUBMITTED</span>}
      <h1 className="h-display" style={{ fontSize: 'clamp(36px, 5vw, 56px)', margin: '0 0 28px', lineHeight: 0.95 }}>
        {step === 1 && <>tell us<br />about you<span style={{ color: 'var(--mint)' }}>.</span></>}
        {step === 2 && <>what have<br />you built<span style={{ color: 'var(--pink)' }}>.</span></>}
        {step === 3 && <>you're<br /><span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>in the queue</span>.</>}
      </h1>

      {error && (
        <div style={{
          background: 'rgba(224,92,92,0.12)',
          border: '1px solid rgba(224,92,92,0.3)',
          borderRadius: 'var(--r)',
          padding: '12px 16px',
          marginBottom: 20,
          color: '#e05c5c',
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 900 }}>×</button>
        </div>
      )}

      <div className="card" style={{ padding: 32 }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label htmlFor="reg-name" className="mono xs upper muted" style={{ fontWeight: 700 }}>your name</label>
              <input
                id="reg-name"
                className="input"
                name="fullName"
                placeholder="full name"
                autoComplete="name"
                value={formData.fullName}
                onChange={handleChange}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label className="mono xs upper muted" style={{ fontWeight: 700 }}>school / class</label>
              <select
                className="input"
                name="classGrade"
                value={formData.classGrade}
                onChange={handleChange}
                style={{ marginTop: 4 }}
              >
                <option value="">where do you study?</option>
                {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mono xs upper muted" style={{ fontWeight: 700 }}>email</label>
              <input
                className="input"
                placeholder="your@email.com"
                value={member?.email || ''}
                disabled
                style={{ marginTop: 4, opacity: 0.6 }}
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="mono xs upper muted" style={{ fontWeight: 700 }}>phone (optional)</label>
              <input
                id="reg-phone"
                className="input"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={handleChange}
                style={{ marginTop: 4 }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="mono xs upper muted" style={{ fontWeight: 700, display: 'block' }}>tell us about something you have built or done</label>
            <span className="mono xs muted" style={{ display: 'block', marginTop: 3 }}>a school project, event, campaign, design, video — anything counts</span>
            <textarea
              className="textarea"
              name="joinReason"
              placeholder="e.g. organised a school event, ran a social media campaign, built a project, created a video or design — anything you're proud of."
              value={formData.joinReason}
              onChange={handleChange}
              style={{ marginTop: 6 }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="text-center" style={{ padding: '20px 0' }}>
            <div style={{ fontSize: 80 }}>★</div>
            <div className="h-display" style={{ fontSize: 36, marginTop: 12 }}>application sent.</div>
            <p style={{ marginTop: 8, color: 'var(--ink-2)' }}>an HoD will review your application. usually 24 hours, sometimes 48. you will get an email when you are approved.</p>
            <button className="btn btn-lg btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/pending')}>Got it</button>
          </div>
        )}

        {step < 3 && (
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 28 }}>
            <button
              className="btn"
              type="button"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >
              ← back
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleNextStep}
              disabled={isLoading}
            >
              {isLoading ? 'Submitting…' : 'next →'}
            </button>
          </div>
        )}
      </div>

      </div>{/* end right panel */}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .route-enter[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          .reg-left-panel { display: none !important; }
          .reg-mobile-logo { display: block !important; }
        }
      `}</style>
    </div>
  )
}

export default RegisterPage
