import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import schoolService from '../services/schoolService'

interface GoogleProfile {
  googleId: string
  email: string
  name: string
  picture?: string
}

interface School {
  schoolId: number
  uuid: string
  name: string
  shortName?: string
}

const CLASS_OPTIONS = [
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
  'College 1st Year', 'College 2nd Year', 'College 3rd Year', 'College 4th Year', 'Other',
]

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()

  const googleProfile = (location.state as { googleProfile?: GoogleProfile })?.googleProfile

  const [schoolId, setSchoolId] = useState('')
  const [classGrade, setClassGrade] = useState('')
  const [schools, setSchools] = useState<School[]>([])
  const [schoolQuery, setSchoolQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!googleProfile) navigate('/login', { replace: true })
  }, [googleProfile, navigate])

  useEffect(() => {
    schoolService.getSchools({ limit: 200 })
      .then(r => { if (r.success) setSchools(r.data as unknown as School[]) })
      .catch(() => {})
  }, [])

  if (!googleProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(schoolQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classGrade) { setError('Please select your class/grade'); return }
    setIsLoading(true); setError(null)
    try {
      const result = await register({
        googleId: googleProfile.googleId,
        email: googleProfile.email,
        fullName: googleProfile.name,
        avatarUrl: googleProfile.picture,
        classGrade,
        phone: '',
        joinReason: 'Joining AquaTerra community',
        schoolId: schoolId ? parseInt(schoolId) : undefined,
      })
      if (result.success) navigate('/pending')
      else setError(result.message || 'Registration failed')
    } catch { setError('Failed to submit registration') }
    finally { setIsLoading(false) }
  }

  return (
    <div className="aq-auth-page">
      <div className="aq-auth-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', textTransform: 'uppercase', marginBottom: 8 }}>
            <span style={{ color: 'var(--accent)' }}>AQ</span><span style={{ color: 'var(--txt)' }}>uaTerra</span>
          </div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Step 2 of 2
          </p>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt)', lineHeight: 1.4 }}>
            One more thing.
          </p>
        </div>

        {/* Welcome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r)', marginBottom: 24, border: '1px solid var(--line-2)' }}>
          {googleProfile.picture && (
            <img src={googleProfile.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          )}
          <div>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{googleProfile.name}</div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-3)' }}>{googleProfile.email}</div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* School */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="reg-school" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              School
            </label>
            <input
              id="reg-school"
              type="text"
              className="aq-input"
              placeholder="Search your school..."
              value={schoolQuery}
              onChange={e => setSchoolQuery(e.target.value)}
              style={{ marginBottom: 6 }}
              autoComplete="organization"
            />
            {schoolQuery && filteredSchools.length > 0 && (
              <div style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', maxHeight: 160, overflowY: 'auto', marginTop: 4 }}>
                {filteredSchools.slice(0, 8).map(s => (
                  <button
                    key={s.schoolId}
                    type="button"
                    onClick={() => { setSchoolId(String(s.schoolId)); setSchoolQuery(s.name) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 14px',
                      fontFamily: 'var(--f-display)', fontSize: 12, color: 'var(--txt)',
                      borderBottom: '1px solid var(--line)', transition: 'background 0.12s',
                      background: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Class */}
          <div style={{ marginBottom: 28 }}>
            <label htmlFor="reg-class" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              Class / Grade <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <select
              id="reg-class"
              className="aq-input"
              value={classGrade}
              onChange={e => setClassGrade(e.target.value)}
              required
            >
              <option value="">Select your class</option>
              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            type="submit"
            className="aq-btn aq-btn-accent"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Application →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontFamily: 'var(--f-display)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.04em', marginTop: 20 }}>
          A director will review your application.
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
