import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type WelfareProject } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

const COLLAB_TYPES = ['Event Co-hosting', 'Sponsorship', 'Resource Sharing', 'Joint Welfare Drive', 'Technology Partnership', 'Media / Content', 'Other']

const COLLAB_PARTNERS = [
  { name: 'South Point School', type: 'Education Partner', dept: 'welfare' },
  { name: 'La Martiniere', type: 'Event Co-host', dept: 'events' },
  { name: 'Loreto House', type: 'Welfare Drive', dept: 'welfare' },
  { name: 'Heritage School', type: 'Tech Partnership', dept: 'labs' },
  { name: 'Modern High', type: 'Distribution Drive', dept: 'welfare' },
  { name: 'St. Xavier\'s', type: 'Cultural Collaboration', dept: 'events' },
]

interface Form {
  orgName: string; contactName: string; email: string; phone: string
  collabType: string; message: string
}

type ProjectCard = Pick<WelfareProject, 'id' | 'slug' | 'header' | 'location' | 'main_image' | 'main_image_alt' | 'objective'>

const DEPT_COLORS_COLLAB: Record<string, string> = {
  welfare: 'var(--c-welfare)',
  events: 'var(--c-events)',
  labs: 'var(--c-labs)',
  operations: 'var(--c-ops)',
  content: 'var(--c-content)',
}

export default function CollaborationsPage() {
  const [form, setForm] = useState<Form>({ orgName: '', contactName: '', email: '', phone: '', collabType: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collabProjects, setCollabProjects] = useState<ProjectCard[]>([])
  useReveal()

  useEffect(() => {
    /* Show the most recent projects that involved external collaboration */
    supabase
      .from('welfare_projects')
      .select('id,slug,header,location,main_image,main_image_alt,objective,collab_name')
      .eq('is_draft', false)
      .order('workshop_date', { ascending: false })
      .limit(9)
      .then(({ data }) => { if (data) setCollabProjects(data as any) })
  }, [])

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orgName || !form.contactName || !form.email || !form.message) {
      setError('Please fill in all required fields.'); return
    }
    setLoading(true); setError(null)
    const { error: err } = await supabase.from('collaboration_submissions').insert([{
      org_name: form.orgName, contact_name: form.contactName, email: form.email,
      phone: form.phone || null, collab_type: form.collabType || null, message: form.message,
    }])
    setLoading(false)
    if (err) { setError('Submission failed. Please try again.'); return }
    setSuccess(true)
  }

  const labelStyle: React.CSSProperties = { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(72px, 12vw, 120px) 0 clamp(40px, 6vw, 64px)', overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--c-labs)' }}>Collaborate</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24, fontSize: 'clamp(40px, 7vw, 100px)' }}>
            Work<br />with us.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            Co-host events, sponsor drives, share resources, or build something new together. We're open to any serious partnership.
          </p>
        </div>
      </section>

      {/* Partners section */}
      <section className="aq-band-sm" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 24 }}>Past Partners</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {COLLAB_PARTNERS.map((p, i) => (
              <div key={p.name} className={`aq-reveal aq-reveal-d${Math.min(i % 3, 3)}`} style={{
                padding: '16px 20px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                borderLeft: `3px solid ${DEPT_COLORS_COLLAB[p.dept] || 'var(--accent)'}`,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', marginBottom: 4, letterSpacing: '-0.01em' }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: DEPT_COLORS_COLLAB[p.dept] || 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.type}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaborative projects */}
      {collabProjects.length > 0 && (
        <section className="aq-band-sm">
          <div className="aq-wrap">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <div className="aq-label aq-reveal">Collaborative Projects</div>
              <Link to="/projects" className="aq-label aq-reveal" style={{ color: 'var(--accent)' }}>All projects →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {collabProjects.map((p, i) => (
                <Link key={p.slug} to={`/projects/${p.slug}`} className={`aq-reveal aq-reveal-d${Math.min(i % 3, 3)}`} style={{
                  display: 'block',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.18s',
                  textDecoration: 'none',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.transform = 'translateY(-2px)'
                    el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'
                    el.style.borderColor = 'var(--line-2)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.transform = ''
                    el.style.boxShadow = ''
                    el.style.borderColor = ''
                  }}
                >
                  {p.main_image && (
                    <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-2)' }}>
                      <img src={p.main_image} alt={p.main_image_alt || p.header} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  )}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', lineHeight: 1.35, letterSpacing: '-0.01em', marginBottom: 6 }}>{p.header}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.location && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-3)' }}>{p.location}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="aq-wrap-xs" style={{ padding: 'clamp(40px, 8vw, 72px) 40px' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 20, color: 'var(--c-labs)' }}>✓</div>
            <h2 className="aq-title" style={{ marginBottom: 16 }}>We got your message.</h2>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>
              We'll be in touch within a few days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '12px 16px', marginBottom: 24, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Organisation Name *</label>
                <input className="aq-input" value={form.orgName} onChange={e => set('orgName', e.target.value)} placeholder="Your organisation" required />
              </div>
              <div>
                <label style={labelStyle}>Contact Name *</label>
                <input className="aq-input" value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Your name" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="aq-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@org.com" required />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="aq-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Type of collaboration</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {COLLAB_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('collabType', t)} className={`aq-chip ${form.collabType === t ? 'on' : ''}`}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Message *</label>
              <textarea className="aq-input" rows={5} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your proposal, what you're hoping to achieve, and how you'd like to work with us..." required />
            </div>

            <button type="submit" className="aq-btn aq-btn-accent" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Proposal →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
