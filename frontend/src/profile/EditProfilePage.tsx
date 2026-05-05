import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService from '../services/profileService'
import schoolService from '../services/schoolService'

interface School {
  schoolId: number
  uuid: string
  name: string
}

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const EditProfilePage = () => {
  const navigate = useNavigate()
  const { refreshMember } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    fullName: '', email: '', classGrade: '', phone: '', avatarUrl: '', bio: '', schoolId: ''
  })
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileResult, schoolsResult] = await Promise.all([
          profileService.getOwnProfile(),
          schoolService.getSchools({ limit: 100 })
        ])
        if (profileResult.success) {
          const { member: profile } = profileResult.data
          setFormData({
            fullName: profile.fullName || '', email: profile.email || '',
            classGrade: profile.classGrade || '', phone: profile.phone || '',
            avatarUrl: profile.avatarUrl || '', bio: profile.bio || '',
            schoolId: profile.schoolId?.toString() || ''
          })
        }
        if (schoolsResult.success) setSchools(schoolsResult.data as unknown as School[])
      } catch { setError('Failed to load profile') }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5MB'); return }
    setIsUploadingAvatar(true); setError(null)
    try {
      const result = await profileService.uploadAvatar(file)
      if (result.success) setFormData(prev => ({ ...prev, avatarUrl: result.data.url }))
    } catch { setError('Failed to upload avatar') }
    finally { setIsUploadingAvatar(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true); setError(null); setSuccess(null)
    if (!formData.fullName.trim()) { setError('Full name is required'); setIsSaving(false); return }
    try {
      const result = await profileService.updateProfile({
        fullName: formData.fullName.trim(), email: formData.email.trim(),
        classGrade: formData.classGrade.trim(), phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl, bio: formData.bio.trim(),
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : undefined
      })
      if (result.success) {
        setSuccess('Profile updated successfully')
        await refreshMember()
        setTimeout(() => navigate('/profile/me'), 1500)
      } else { setError('Failed to update profile') }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to update profile') }
    finally { setIsSaving(false) }
  }

  const labelSt: React.CSSProperties = {
    fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)',
    display: 'block', marginBottom: 8,
  }

  if (isLoading) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.06em' }}>LOADING...</div>
      </div>
    )
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link to="/profile/me" className="aq-nav-ghost-btn" aria-label="Back">←</Link>
          <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Edit Profile</h1>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 20, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}<button onClick={() => setError(null)} style={{ background: 'none', color: '#e05c5c', fontSize: 14 }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(42,157,110,0.12)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 20, color: 'var(--accent)', fontFamily: 'var(--f-display)', fontSize: 12 }}>
            ✓ {success}
          </div>
        )}

        <div className="aq-post-card">
          <form onSubmit={handleSubmit}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
              <div style={{ position: 'relative' }}>
                <div className="aq-avatar" style={{ width: 80, height: 80, fontSize: 24, background: 'var(--accent)', overflow: 'hidden' }}>
                  {formData.avatarUrl
                    ? <img src={formData.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : initials(formData.fullName || 'User')
                  }
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar} aria-label="Change avatar"
                  style={{ position: 'absolute', bottom: -4, right: -4, width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: isUploadingAvatar ? 0.6 : 1, transition: 'transform 0.12s var(--ease), box-shadow 0.15s', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
                >
                  <span aria-hidden style={{ position: 'absolute', inset: -8 }} />
                  {isUploadingAvatar ? '...' : '↑'}
                </button>
              </div>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 8 }}>Click to change avatar</p>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="ep-fullName" style={labelSt}>Full Name <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input id="ep-fullName" className="aq-input" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your full name" required autoComplete="name" />
              </div>
              <div>
                <label htmlFor="ep-email" style={labelSt}>Email <span style={{ color: 'var(--accent)' }}>*</span></label>
                <input id="ep-email" className="aq-input" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" required autoComplete="email" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label htmlFor="ep-classGrade" style={labelSt}>Class / Grade</label>
                <input id="ep-classGrade" className="aq-input" name="classGrade" value={formData.classGrade} onChange={handleChange} placeholder="e.g., Class 11" />
              </div>
              <div>
                <label htmlFor="ep-phone" style={labelSt}>Phone</label>
                <input id="ep-phone" className="aq-input" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" autoComplete="tel" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ep-school" style={labelSt}>School</label>
              <select id="ep-school" className="aq-input" name="schoolId" value={formData.schoolId} onChange={handleChange}>
                <option value="">Select your school (optional)</option>
                {schools.map(school => (
                  <option key={school.schoolId} value={school.schoolId}>{school.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <label htmlFor="ep-bio" style={{ ...labelSt, marginBottom: 0 }}>Bio</label>
                <span className={`aq-char-counter${formData.bio.length > 400 ? ' warn' : ''}${formData.bio.length > 480 ? ' error' : ''}`}>
                  {formData.bio.length}/500
                </span>
              </div>
              <textarea id="ep-bio" className="aq-input" name="bio" value={formData.bio} onChange={handleChange as any} rows={4}
                placeholder="Tell the community about yourself, your interests, and what you're working on..."
                style={{ resize: 'vertical' }}
                maxLength={500}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => navigate('/profile/me')} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
              <button type="submit" disabled={isSaving} className="aq-btn aq-btn-ink aq-btn-sm">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditProfilePage
