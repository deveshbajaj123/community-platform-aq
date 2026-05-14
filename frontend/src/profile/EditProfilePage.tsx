import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService from '../services/profileService'
import schoolService from '../services/schoolService'
import { useToast } from '../components/Toast'

interface School { schoolId: number; uuid: string; name: string }
const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const EditProfilePage = () => {
  const navigate = useNavigate()
  const { refreshMember } = useAuth()
  const { success, error: toastError } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    fullName: '', email: '', classGrade: '', phone: '', avatarUrl: '', bio: '', schoolId: ''
  })
  const [schools, setSchools] = useState<School[]>([])
  const [schoolSearch, setSchoolSearch] = useState('')
  const [showSchoolList, setShowSchoolList] = useState(false)
  const schoolComboRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [profileResult, schoolsResult] = await Promise.all([
          profileService.getOwnProfile(),
          schoolService.getSchools({ limit: 100 })
        ])
        if (profileResult.success) {
          const { member: p } = profileResult.data
          setFormData({
            fullName: p.fullName || '', email: p.email || '',
            classGrade: p.classGrade || '', phone: p.phone || '',
            avatarUrl: p.avatarUrl || '', bio: p.bio || '',
            schoolId: p.schoolId?.toString() || ''
          })
        }
        if (schoolsResult.success) setSchools(schoolsResult.data as unknown as School[])
      } catch { setError('Failed to load profile') }
      finally { setIsLoading(false) }
    }
    fetch()
  }, [])

  // Sync school search display text when schools or selected schoolId changes
  useEffect(() => {
    if (formData.schoolId && schools.length > 0) {
      const found = schools.find(s => s.schoolId.toString() === formData.schoolId)
      if (found) setSchoolSearch(found.name)
    }
  }, [formData.schoolId, schools])

  // Close school dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (schoolComboRef.current && !schoolComboRef.current.contains(e.target as Node)) {
        setShowSchoolList(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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
    setIsSaving(true); setError(null); setSavedMsg(null)
    if (!formData.fullName.trim()) { setError('Full name is required'); setIsSaving(false); return }
    try {
      const result = await profileService.updateProfile({
        fullName: formData.fullName.trim(), email: formData.email.trim(),
        classGrade: formData.classGrade.trim(), phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl, bio: formData.bio.trim(),
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : undefined
      })
      if (result.success) {
        setSavedMsg('profile updated.')
        success('Profile updated ✓')
        await refreshMember()
        setTimeout(() => navigate('/profile/me'), 1400)
      } else { setError('Failed to update profile'); toastError('Failed to update profile') }
    } catch (err: any) { const msg = err.response?.data?.message || 'Failed to update profile'; setError(msg); toastError(msg) }
    finally { setIsSaving(false) }
  }

  if (isLoading) {
    return (
      <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(24px,5vw,40px)', paddingBottom: 80, maxWidth: 600 }}>
        <div className="v6-skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
        <div className="v6-skeleton" style={{ width: 260, height: 13, marginBottom: 32 }} />
        <div className="card" style={{ padding: 24 }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28 }}>
            <div className="v6-skeleton sk-circle" style={{ width: 80, height: 80 }} />
            <div>
              <div className="v6-skeleton" style={{ width: 120, height: 13, marginBottom: 10 }} />
              <div className="v6-skeleton sk-pill" style={{ width: 96, height: 32 }} />
            </div>
          </div>
          {/* Form fields */}
          <div className="sk-group">
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div className="v6-skeleton" style={{ width: 80, height: 10, marginBottom: 8 }} />
                <div className="v6-skeleton" style={{ width: '100%', height: 44, borderRadius: 12 }} />
              </div>
            ))}
          </div>
          <div className="v6-skeleton sk-pill" style={{ width: '100%', height: 44, marginTop: 8 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(28px,5vw,48px)', paddingBottom: 80, maxWidth: 640 }}>
      <div className="row gap-2" style={{ marginBottom: 24, alignItems: 'center' }}>
        <Link to="/profile/me" className="btn btn-sm">← back</Link>
        <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', margin: 0, lineHeight: 1 }}>
          edit profile<span style={{ color: 'var(--mint)' }}>.</span>
        </h1>
      </div>

      {error && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #FF4D2E' }}>
          <span style={{ fontSize: 14, color: '#FF4D2E' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D2E', fontSize: 16 }}>✕</button>
        </div>
      )}
      {savedMsg && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--mint)' }}>
          <span style={{ fontSize: 14, color: 'var(--mint)', fontWeight: 700 }}>✓ {savedMsg}</span>
        </div>
      )}

      <div className="card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              <div className="avatar" style={{ width: 88, height: 88, fontSize: 28, background: 'var(--mint)', overflow: 'hidden', border: '4px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)' }}>
                {formData.avatarUrl
                  ? <img src={formData.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : getInitials(formData.fullName || 'U')}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} aria-label="Change avatar" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                style={{ position: 'absolute', bottom: -6, right: -6, width: 32, height: 32, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontSize: 14, border: 'none', cursor: 'pointer' }}>
                {isUploadingAvatar ? '...' : '↑'}
              </button>
            </div>
            <span className="mono xs muted" style={{ marginTop: 10 }}>click to change photo</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="edit-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="ep-name" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  full name <span style={{ color: 'var(--mint)' }}>*</span>
                </label>
                <input id="ep-name" className="input" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="your full name" required autoComplete="name" />
              </div>
              <div>
                <label htmlFor="ep-email" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>email</label>
                <input id="ep-email" className="input" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" autoComplete="email" />
              </div>
            </div>

            <div className="edit-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="ep-class" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>class / grade</label>
                <input id="ep-class" className="input" name="classGrade" value={formData.classGrade} onChange={handleChange} placeholder="e.g. Class 11" />
              </div>
              <div>
                <label htmlFor="ep-phone" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>phone</label>
                <input id="ep-phone" className="input" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" autoComplete="tel" inputMode="tel" />
              </div>
            </div>

            <div>
              <label htmlFor="ep-school" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>school</label>
              <div ref={schoolComboRef} style={{ position: 'relative' }}>
                <input
                  id="ep-school"
                  className="input"
                  type="text"
                  autoComplete="off"
                  placeholder="search your school (optional)"
                  value={schoolSearch}
                  onChange={e => {
                    setSchoolSearch(e.target.value)
                    setShowSchoolList(true)
                    // If user clears the field, also clear the selected schoolId
                    if (!e.target.value) setFormData(prev => ({ ...prev, schoolId: '' }))
                  }}
                  onFocus={() => setShowSchoolList(true)}
                />
                {showSchoolList && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    maxHeight: 200,
                    overflowY: 'scroll',
                    zIndex: 100,
                    background: 'var(--card)',
                    border: '2px solid var(--ink)',
                    borderRadius: 'var(--r)',
                    boxShadow: '4px 4px 0 var(--ink)',
                  }}>
                    {schools
                      .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                      .length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink-3)' }}>
                          no schools match "{schoolSearch}"
                        </div>
                      ) : (
                        schools
                          .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                          .map(s => (
                            <div
                              key={s.schoolId}
                              onMouseDown={e => {
                                e.preventDefault() // prevent blur before click registers
                                setFormData(prev => ({ ...prev, schoolId: s.schoolId.toString() }))
                                setSchoolSearch(s.name)
                                setShowSchoolList(false)
                              }}
                              style={{
                                padding: '9px 14px',
                                fontSize: 14,
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--line)',
                                color: formData.schoolId === s.schoolId.toString() ? 'var(--mint)' : 'var(--ink)',
                                fontWeight: formData.schoolId === s.schoolId.toString() ? 700 : 400,
                                background: 'transparent',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {s.name}
                            </div>
                          ))
                      )
                    }
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label htmlFor="ep-bio" className="mono xs upper muted" style={{ fontWeight: 700 }}>bio</label>
                <span className="mono xs muted" style={{ color: formData.bio.length > 450 ? 'var(--pink)' : undefined }}>
                  {formData.bio.length}/500
                </span>
              </div>
              <textarea id="ep-bio" className="textarea" name="bio" value={formData.bio} onChange={handleChange as any}
                rows={4} maxLength={500}
                placeholder="tell the community about yourself, what you work on at AQ, and what you care about."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => navigate('/profile/me')} className="btn">cancel</button>
              <button type="submit" disabled={isSaving} className="btn btn-primary" aria-busy={isSaving}>
                {isSaving ? 'saving...' : 'save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .edit-profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

export default EditProfilePage
