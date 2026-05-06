import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabaseCommunity } from '../lib/supabaseCommunity'

const CLASS_OPTIONS = [
  'Class 9', 'Class 10', 'Class 11', 'Class 12',
  'College 1st Year', 'College 2nd Year', 'College 3rd Year', 'College 4th Year', 'Other',
]

const RegisterPage = () => {
  const navigate = useNavigate()
  const { member, refreshMember, isLoading: authLoading, isAuthenticated } = useAuth()

  const [formData, setFormData] = useState({
    fullName: member?.full_name || '',
    classGrade: member?.class_grade || '',
    phone: member?.phone || '',
    joinReason: member?.join_reason || ''
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!formData.fullName || !formData.classGrade || !formData.joinReason) {
      setError('Please fill in all required fields')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabaseCommunity
        .from('members')
        .update({
          full_name: formData.fullName,
          class_grade: formData.classGrade,
          phone: formData.phone,
          join_reason: formData.joinReason
        })
        .eq('member_id', member.member_id)

      if (error) throw error

      await refreshMember()
      navigate('/pending')
    } catch (err: any) {
      console.error('Registration update error:', err)
      setError(err.message || 'Failed to submit registration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="aq-auth-page">
      <div className="aq-auth-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', textTransform: 'uppercase', marginBottom: 8 }}>
            <span style={{ color: 'var(--accent)' }}>AQ</span><span style={{ color: 'var(--txt)' }}>uaTerra</span>
          </div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Complete Your Profile
          </p>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt)', lineHeight: 1.4 }}>
            Tell us a bit about yourself.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 20, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              Full Name <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              className="aq-input"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Your full name"
            />
          </div>

          {/* Class/Grade */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              Class / Grade <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <select
              className="aq-input"
              name="classGrade"
              value={formData.classGrade}
              onChange={handleChange}
              required
            >
              <option value="">Select your class</option>
              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              Phone Number
            </label>
            <input
              className="aq-input"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          {/* Join Reason */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }}>
              Why do you want to join? <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <textarea
              className="aq-input"
              name="joinReason"
              value={formData.joinReason}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Tell us what interests you about our community..."
              style={{ resize: 'vertical' }}
            />
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
