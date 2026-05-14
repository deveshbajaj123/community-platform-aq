import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type WelfareProject } from '../lib/supabase'

const COLLAB_TYPES = ['Event Co-hosting', 'Sponsorship', 'Resource Sharing', 'Joint Welfare Drive', 'Technology Partnership', 'Media / Content', 'Other']

const COLLAB_PARTNERS = [
  { name: 'South Point School',  type: 'Education Partner',     dept: 'welfare',     color: '#00E5A0' },
  { name: "La Martiniere",       type: 'Event Co-host',         dept: 'events',      color: '#FF7A1A' },
  { name: 'Loreto House',        type: 'Welfare Drive',         dept: 'welfare',     color: '#00E5A0' },
  { name: 'Heritage School',     type: 'Tech Partnership',      dept: 'labs',        color: '#3DA9FC' },
  { name: 'Modern High',         type: 'Distribution Drive',    dept: 'welfare',     color: '#00E5A0' },
  { name: "St. Xavier's",        type: 'Cultural Collaboration', dept: 'events',     color: '#FF7A1A' },
]

interface Form { orgName: string; contactName: string; email: string; phone: string; collabType: string; message: string }
type ProjectCard = Pick<WelfareProject, 'id' | 'slug' | 'header' | 'location' | 'main_image' | 'main_image_alt' | 'objective'>

export default function CollaborationsPage() {
  const [form, setForm] = useState<Form>({ orgName: '', contactName: '', email: '', phone: '', collabType: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collabProjects, setCollabProjects] = useState<ProjectCard[]>([])

  useEffect(() => {
    supabase
      .from('welfare_projects')
      .select('id,slug,header,location,main_image,main_image_alt,objective,collab_name')
      .eq('is_draft', false)
      .order('workshop_date', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setCollabProjects(data as any) })
  }, [])

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.orgName || !form.contactName || !form.email || !form.message) { setError('please fill in all required fields.'); return }
    setLoading(true); setError(null)
    const { error: err } = await supabase.from('collaboration_submissions').insert([{
      org_name: form.orgName, contact_name: form.contactName, email: form.email,
      phone: form.phone || null, collab_type: form.collabType || null, message: form.message,
    }])
    setLoading(false)
    if (err) { setError('submission failed. please try again.'); return }
    setSubmitted(true)
  }

  return (
    <div className="route-enter">
      <section style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)', position: 'relative', overflow: 'hidden' }}>
        <div className="container" style={{ position: 'relative' }}>
          <span className="sticker sticker-sky wobble" style={{ marginBottom: 16, display: 'inline-flex' }}>★ open to partnerships</span>
          <h1 className="giant" style={{ margin: 0, lineHeight: 0.88 }}>
            work<br />
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--sky)' }}>with us</span>.
          </h1>
          <p style={{ fontSize: 19, marginTop: 22, maxWidth: 520, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            co-host events, sponsor drives, share resources, or build something new together. we are open to any serious partnership from schools, colleges, NGOs, or brands.
          </p>
        </div>
      </section>

      {/* Past partners */}
      <div className="container" style={{ padding: '0 24px 48px' }}>
        <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 16 }}>★ PAST PARTNERS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {COLLAB_PARTNERS.map(p => (
            <div key={p.name} className="card" style={{ padding: '14px 18px', borderLeft: `4px solid ${p.color}` }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
              <div className="mono xs muted">{p.type}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Collab projects */}
      {collabProjects.length > 0 && (
        <div className="container" style={{ padding: '0 24px 48px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div className="mono xs upper muted" style={{ fontWeight: 700 }}>★ COLLABORATIVE PROJECTS</div>
            <Link to="/projects" className="mono xs" style={{ color: 'var(--mint)' }}>all projects →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {collabProjects.map(p => (
              <Link key={p.slug} to={`/projects/${p.slug}`} className="card card-hover" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none' }}>
                {p.main_image && (
                  <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img src={p.main_image} alt={p.main_image_alt || p.header} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 4 }}>{p.header}</div>
                  {p.location && <div className="mono xs muted">{p.location}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Proposal form */}
      <div className="container" style={{ padding: '0 24px 80px', maxWidth: 680 }}>
        <h2 className="h-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginBottom: 32, lineHeight: 0.95 }}>
          send a proposal<span style={{ color: 'var(--mint)' }}>.</span>
        </h2>

        {submitted ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>★</div>
            <div className="h-display" style={{ fontSize: 32 }}>we got your message.</div>
            <p className="muted" style={{ marginTop: 8 }}>we will be in touch within a few days.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            {error && (
              <div style={{ padding: '10px 14px', marginBottom: 16, borderLeft: '4px solid #FF4D2E', background: 'rgba(255,77,46,0.06)' }}>
                <span style={{ color: '#FF4D2E', fontSize: 14 }}>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label htmlFor="col-org" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>organisation name *</label>
                  <input id="col-org" className="input" value={form.orgName} onChange={e => set('orgName', e.target.value)} placeholder="your school / org" required />
                </div>
                <div>
                  <label htmlFor="col-contact" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>contact name *</label>
                  <input id="col-contact" className="input" value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="your name" required autoComplete="name" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label htmlFor="col-email" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>email *</label>
                  <input id="col-email" className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@org.com" required autoComplete="email" inputMode="email" />
                </div>
                <div>
                  <label htmlFor="col-phone" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>phone</label>
                  <input id="col-phone" className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" autoComplete="tel" inputMode="tel" />
                </div>
              </div>
              <div>
                <label className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 8 }}>type of collaboration</label>
                <div className="row gap-2 flex-wrap">
                  {COLLAB_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => set('collabType', t)} className={'chip ' + (form.collabType === t ? 'chip-active' : '')}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="col-msg" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>message *</label>
                <textarea id="col-msg" className="textarea" rows={5} value={form.message} onChange={e => set('message', e.target.value)} placeholder="tell us about your proposal. what do you want to achieve and how does AQ fit?" required />
              </div>
              <div style={{ textAlign: 'right' }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading} aria-busy={loading}>
                  {loading ? 'sending...' : 'send proposal →'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
