import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const INTERESTS = ['Animal Welfare', 'Plantation / Environment', 'Community Relief', 'Events & Culture', 'Content Creation', 'Technology (AQ Tech)', 'Media (Prism)', 'Operations / HR', 'Finance']
const AVAIL_OPTIONS = ['Weekends only', 'Weekdays after school', 'Both', 'Flexible']

interface Form {
  fullName: string; email: string; phone: string; age: string
  college: string; yearOfStudy: string; interests: string[]
  availability: string; whyAquaterra: string; prevExp: string; instagram: string
}

export default function VolunteerApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({
    fullName: '', email: '', phone: '', age: '', college: '',
    yearOfStudy: '', interests: [], availability: '', whyAquaterra: '', prevExp: '', instagram: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleInterest = (i: string) => setForm(f => ({
    ...f,
    interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.whyAquaterra || form.interests.length === 0) {
      setError('Please fill in all required fields and select at least one interest.'); return
    }
    setLoading(true); setError(null)
    const { error: err } = await supabase.from('volunteer_applications').insert([{
      full_name: form.fullName, email: form.email, phone: form.phone || null,
      age: form.age ? parseInt(form.age) : null, college: form.college || null,
      year_of_study: form.yearOfStudy || null, interests: form.interests,
      availability: form.availability || null, why_aquaterra: form.whyAquaterra,
      previous_experience: form.prevExp || null, instagram_handle: form.instagram || null,
    }])
    setLoading(false)
    if (err) { setError('Submission failed. Please try again.'); return }
    navigate('/volunteer/thank-you')
  }

  const inputStyle = { marginBottom: 20 }
  const labelStyle: React.CSSProperties = { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--txt-3)', display: 'block', marginBottom: 8 }

  return (
    <div className="aq-page">
      <div className="aq-wrap-xs" style={{ padding: 'clamp(40px, 8vw, 80px) 40px' }}>
        <div style={{ marginBottom: 40 }}>
          <div className="aq-label" style={{ marginBottom: 12, color: 'var(--c-welfare)' }}>Volunteer Application</div>
          <h1 className="aq-title" style={{ marginBottom: 12 }}>Apply to Volunteer</h1>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--txt-2)' }}>
            Takes 5 minutes. We read every application.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 24, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={inputStyle}>
            <label style={labelStyle}>Full Name *</label>
            <input className="aq-input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input className="aq-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input className="aq-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Age</label>
              <input className="aq-input" type="number" min="13" max="30" value={form.age} onChange={e => set('age', e.target.value)} placeholder="16" />
            </div>
            <div>
              <label style={labelStyle}>Instagram (optional)</label>
              <input className="aq-input" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@yourhandle" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>School / College</label>
              <input className="aq-input" value={form.college} onChange={e => set('college', e.target.value)} placeholder="Your institution" />
            </div>
            <div>
              <label style={labelStyle}>Year / Grade</label>
              <input className="aq-input" value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)} placeholder="Class 11 / 2nd Year" />
            </div>
          </div>

          {/* Interests */}
          <div style={inputStyle}>
            <label style={labelStyle}>Areas of interest * (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {INTERESTS.map(i => (
                <button
                  key={i} type="button"
                  onClick={() => toggleInterest(i)}
                  className={`aq-chip ${form.interests.includes(i) ? 'on' : ''}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div style={inputStyle}>
            <label style={labelStyle}>Availability</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVAIL_OPTIONS.map(a => (
                <button
                  key={a} type="button"
                  onClick={() => set('availability', a)}
                  className={`aq-chip ${form.availability === a ? 'on' : ''}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div style={inputStyle}>
            <label style={labelStyle}>Why AquaTerra? *</label>
            <textarea className="aq-input" rows={4} value={form.whyAquaterra} onChange={e => set('whyAquaterra', e.target.value)} placeholder="Tell us what draws you to AquaTerra and what you want to contribute..." required />
          </div>

          <div style={inputStyle}>
            <label style={labelStyle}>Previous experience (optional)</label>
            <textarea className="aq-input" rows={3} value={form.prevExp} onChange={e => set('prevExp', e.target.value)} placeholder="Any relevant volunteer, leadership, or creative experience..." />
          </div>

          <button type="submit" className="aq-btn aq-btn-accent" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application →'}
          </button>
        </form>
      </div>
    </div>
  )
}
