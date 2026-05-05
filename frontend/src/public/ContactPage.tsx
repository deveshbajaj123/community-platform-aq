import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

const ROLES = ['Student', 'NGO / Organisation', 'Media / Press', 'Parent / Guardian', 'Donor / Supporter', 'Other']

interface Form {
  name: string; email: string; phone: string; role: string; message: string
}

export default function ContactPage() {
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', role: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useReveal()

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { setError('Please fill in all required fields.'); return }
    setLoading(true); setError(null)
    const { error: err } = await supabase.from('contact_submissions').insert([{
      name: form.name, email: form.email, phone: form.phone || null,
      role: form.role || null, message: form.message,
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
          <div className="aq-label aq-reveal" style={{ marginBottom: 24 }}>Contact</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24, fontSize: 'clamp(40px, 7vw, 100px)' }}>
            Say hello.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            For anything else — press, general questions, or just reaching out.
          </p>
          <div style={{ marginTop: 24 }} className="aq-reveal aq-reveal-d3">
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="aq-btn aq-btn-accent aq-btn-sm"
            >
              WhatsApp us directly →
            </a>
          </div>
        </div>
      </section>

      <div className="aq-wrap-xs" style={{ padding: 'clamp(40px, 8vw, 72px) 40px' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 20, color: 'var(--accent)' }}>✓</div>
            <h2 className="aq-title" style={{ marginBottom: 16 }}>Message received.</h2>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>
              We'll get back to you soon.
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
                <label style={labelStyle}>Name *</label>
                <input className="aq-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" required />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="aq-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="aq-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label style={labelStyle}>I am a...</label>
                <select className="aq-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="">Select role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Message *</label>
              <textarea className="aq-input" rows={5} value={form.message} onChange={e => set('message', e.target.value)} placeholder="What's on your mind?" required />
            </div>

            <button type="submit" className="aq-btn aq-btn-ink" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send message →'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 48, padding: '28px 0', borderTop: '1px solid var(--line)', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[['Instagram', '@ngo.aquaterra', 'https://instagram.com/ngo.aquaterra'], ['Instagram', '@roots.aquaterra', 'https://instagram.com/roots.aquaterra']].map(([l, h, u]) => (
            <div key={h}>
              <div className="aq-label" style={{ marginBottom: 6 }}>{l}</div>
              <a href={u} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{h}</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
