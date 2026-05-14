import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useIsMobile } from '../hooks/useMobile'

const INTERESTS = ['Animal Welfare', 'Plantation / Environment', 'Community Relief', 'Events & Culture', 'Content Creation', 'Technology (AQ Tech)', 'Media (Prism)', 'Operations / HR', 'Finance']
const AVAIL_OPTIONS = ['Weekends only', 'Weekdays after school', 'Both', 'Flexible']

interface Form {
  fullName: string; email: string; phone: string; age: string
  college: string; yearOfStudy: string; interests: string[]
  availability: string; whyAquaterra: string; prevExp: string; instagram: string
}

const labelSt: React.CSSProperties = {
  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--ink-3)', display: 'block', marginBottom: 6,
}

export default function VolunteerApplyPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
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

  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ padding: 'clamp(40px,6vw,72px) var(--page-px,24px) 40px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-2)' }}>
        <div className="container">
          <span className="sticker wobble" style={{ display: 'inline-flex', marginBottom: 14 }}>★ GET INVOLVED</span>
          <h1 className="h-display" style={{ fontSize: 'clamp(36px,7vw,72px)', margin: '0 0 12px', lineHeight: 0.95 }}>
            apply to<br />
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>volunteer.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 480 }}>
            Takes 5 minutes. We read every application personally.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: 'clamp(28px,4vw,48px) var(--page-px,24px) 80px' }}>
        <div style={{ maxWidth: 640 }}>

          {error && (
            <div style={{
              background: 'rgba(224,92,92,0.1)', border: '1.5px solid rgba(224,92,92,0.3)',
              borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 24,
              color: '#e05c5c', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 900, fontSize: 16 }}>×</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 18 }}>About you</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelSt}>Full Name *</label>
                  <input className="input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelSt}>Email *</label>
                    <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
                  </div>
                  <div>
                    <label style={labelSt}>Phone</label>
                    <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelSt}>Age</label>
                    <input className="input" type="number" min="13" max="30" value={form.age} onChange={e => set('age', e.target.value)} placeholder="16" />
                  </div>
                  <div>
                    <label style={labelSt}>Instagram (optional)</label>
                    <input className="input" value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@yourhandle" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelSt}>School / College</label>
                    <input className="input" value={form.college} onChange={e => set('college', e.target.value)} placeholder="Your institution" />
                  </div>
                  <div>
                    <label style={labelSt}>Year / Grade</label>
                    <input className="input" value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)} placeholder="Class 11 / 2nd Year" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 18 }}>Interests & availability</div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelSt}>Areas of interest * (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {INTERESTS.map(i => (
                    <button
                      key={i} type="button"
                      onClick={() => toggleInterest(i)}
                      className={`chip${form.interests.includes(i) ? ' on' : ''}`}
                      style={form.interests.includes(i) ? { background: 'var(--mint)', color: '#0A0A0A', borderColor: 'var(--mint)' } : {}}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelSt}>Availability</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAIL_OPTIONS.map(a => (
                    <button
                      key={a} type="button"
                      onClick={() => set('availability', a)}
                      className={`chip${form.availability === a ? ' on' : ''}`}
                      style={form.availability === a ? { background: 'var(--lemon)', color: '#0A0A0A', borderColor: 'var(--lemon)' } : {}}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 28 }}>
              <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 18 }}>Your motivation</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>Why AquaTerra? *</label>
                <textarea className="textarea" rows={4} value={form.whyAquaterra} onChange={e => set('whyAquaterra', e.target.value)} placeholder="Tell us what draws you to AquaTerra and what you want to contribute..." required style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={labelSt}>Previous experience (optional)</label>
                <textarea className="textarea" rows={3} value={form.prevExp} onChange={e => set('prevExp', e.target.value)} placeholder="Any relevant volunteer, leadership, or creative experience..." style={{ marginTop: 4 }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Submitting…' : 'Submit Application →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
