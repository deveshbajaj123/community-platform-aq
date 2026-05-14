import { useState, useRef } from 'react'
import achievementService from '../services/achievementService'
import feedService from '../services/feedService'

interface AddAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  onAchievementCreated: () => void
}

const ACHIEVEMENT_TYPES = [
  { value: 'leadership', label: '👑 Leadership' },
  { value: 'academic', label: '📚 Academic' },
  { value: 'competition', label: '🏆 Competition' },
  { value: 'personal_project', label: '💡 Personal Project' },
  { value: 'other', label: '🌟 Other' },
]

const LBL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--display)',
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  marginBottom: 6,
}

const AddAchievementModal = ({ isOpen, onClose, onAchievementCreated }: AddAchievementModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    achievementType: '',
    startDate: '',
    endDate: '',
    isPresent: false,
    proofImage: null as File | null,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePresentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, isPresent: e.target.checked, endDate: '' }))
  }

  const handleSupportingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setFormData(prev => ({ ...prev, proofImage: file }))
  }

  const removeSupportingImage = () => {
    setFormData(prev => ({ ...prev, proofImage: null }))
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) { setError('Title is required'); return }
    if (!formData.achievementType) { setError('Please select an achievement type'); return }
    if (!formData.startDate) { setError('Start date is required'); return }
    if (!formData.isPresent && !formData.endDate) { setError('Please set an end date or mark as ongoing'); return }

    setIsSubmitting(true); setError(null)
    try {
      let proofUrl: string | undefined = undefined
      if (formData.proofImage) {
        const uploadResult = await feedService.uploadImages([formData.proofImage])
        if (uploadResult.success) proofUrl = uploadResult.data.images[0].url
        else throw new Error('Failed to upload supporting image')
      }
      const result = await achievementService.createAchievement({
        title: formData.title.trim(),
        description: formData.description.trim(),
        achievementType: formData.achievementType,
        achievementDate: formData.startDate,
        achievementEndDate: formData.isPresent ? null : formData.endDate,
        proofUrl,
      })
      if (result.success) { onAchievementCreated(); handleClose() }
      else setError(result.message || 'Failed to save achievement')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save achievement')
    } finally { setIsSubmitting(false) }
  }

  const handleClose = () => {
    setFormData({ title: '', description: '', achievementType: '', startDate: '', endDate: '', isPresent: false, proofImage: null })
    setImagePreview(null); setError(null); onClose()
  }

  if (!isOpen) return null

  const canSubmit = !!formData.title && !!formData.achievementType && !!formData.startDate && (formData.isPresent || !!formData.endDate)

  return (
    <div className="modal-back" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%' }}>
        {/* Head */}
        <div className="modal-head">
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Add Achievement
          </span>
          <button className="btn btn-sm" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', color: '#e05c5c', fontFamily: 'var(--display)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              {error}
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer', padding: 0, fontSize: 14 }}>✕</button>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={LBL}>Title <span style={{ color: '#e05c5c' }}>*</span></label>
            <input
              className="input"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Regional Science Olympiad Winner"
            />
          </div>

          {/* Description */}
          <div>
            <label style={LBL}>Description</label>
            <textarea
              className="input"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your achievement..."
              rows={3}
              style={{ resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Type */}
          <div>
            <label style={LBL}>Type <span style={{ color: '#e05c5c' }}>*</span></label>
            <select
              className="input"
              name="achievementType"
              value={formData.achievementType}
              onChange={handleChange}
            >
              <option value="">Select type…</option>
              {ACHIEVEMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LBL}>Start Date <span style={{ color: '#e05c5c' }}>*</span></label>
                <input className="input" type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
              </div>
              <div>
                <label style={LBL}>End Date {!formData.isPresent && <span style={{ color: '#e05c5c' }}>*</span>}</label>
                {formData.isPresent
                  ? <div className="input" style={{ color: 'var(--ink-3)', fontStyle: 'italic', cursor: 'default' }}>Present</div>
                  : <input className="input" type="date" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.startDate || undefined} />
                }
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
              <input
                type="checkbox"
                checked={formData.isPresent}
                onChange={handlePresentToggle}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ fontFamily: 'var(--display)', fontSize: 12, color: 'var(--ink-2)' }}>Currently ongoing (Present)</span>
            </label>
          </div>

          {/* Supporting Image */}
          <div>
            <label style={LBL}>Supporting Image <span style={{ fontWeight: 400, color: 'var(--ink-3)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            {imagePreview && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--r)', display: 'block', outline: '1px solid rgba(0,0,0,0.08)' }} />
                <button
                  type="button"
                  onClick={removeSupportingImage}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                >
                  ✕
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleSupportingImageSelect} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', padding: '10px 16px', borderRadius: 'var(--r)', border: '2px dashed var(--line)', background: 'none', color: 'var(--ink-3)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, letterSpacing: '0.03em', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)' }}
            >
              {imagePreview ? '↻ Change Image' : '↑ Upload Image'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-sm" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={{ opacity: (!canSubmit || isSubmitting) ? 0.5 : 1 }}
          >
            {isSubmitting ? 'Saving…' : 'Save Achievement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddAchievementModal
