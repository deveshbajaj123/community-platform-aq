import { useState } from 'react'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function ContactPage() {
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toastError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    try {
      // Try saving to supabase, fall back to mailto if table doesn't exist
      const { error: dbErr } = await supabase.from('contact_submissions').insert([{
        full_name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject || null,
        message: form.message.trim(),
      }])
      if (dbErr) {
        // Graceful fallback: open email client pre-filled
        const mailto = `mailto:aquaterrakolkata@gmail.com?subject=${encodeURIComponent('Website enquiry: ' + (form.subject || 'General'))}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`
        window.open(mailto)
      }
      success('Message sent!', 'We usually reply within 24 hours.')
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      // Final fallback: always open email
      const mailto = `mailto:aquaterrakolkata@gmail.com?subject=${encodeURIComponent('Website enquiry: ' + (form.subject || 'General'))}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`
      window.open(mailto)
      success('Opening email client…', 'Send the pre-filled email to reach us.')
      setSubmitted(true)
    }
    setLoading(false)
  }

  return (
    <div className="route-enter container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)', maxWidth: 720 }}>
      <h1 className="h-display" style={{ fontSize: 'clamp(52px, 8vw, 80px)', margin: 0, lineHeight: 0.9 }}>
        say <span style={{ color: 'var(--mint)' }}>hi</span>.
      </h1>
      <p style={{ fontSize: 18, marginTop: 12, color: 'var(--ink-2)' }}>
        partnerships, collabs, questions, or just want to know more. we read everything.
      </p>

      {submitted ? (
        <div className="card" style={{ marginTop: 32, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 64 }}>✓</div>
          <div className="h-display" style={{ fontSize: 32, marginTop: 12 }}>message sent.</div>
          <p style={{ color: 'var(--ink-2)', marginTop: 8 }}>we'll get back to you within 24 hours.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setSubmitted(false)}>
            send another →
          </button>
        </div>
      ) : (
        <form className="card" style={{ marginTop: 32, padding: 28 }} onSubmit={handleSubmit}>
          <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="mono xs upper muted" htmlFor="c-name">name *</label>
              <input
                id="c-name"
                className="input"
                placeholder="your name"
                style={{ marginTop: 4 }}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="mono xs upper muted" htmlFor="c-email">email *</label>
              <input
                id="c-email"
                className="input"
                type="email"
                placeholder="your@email.com"
                style={{ marginTop: 4 }}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="mono xs upper muted" htmlFor="c-subject">what is this about?</label>
            <select
              id="c-subject"
              className="input"
              style={{ marginTop: 4 }}
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
            >
              <option value="">pick one</option>
              <option>partnership or collaboration</option>
              <option>school or college collab</option>
              <option>NGO partnership</option>
              <option>ROOTS or merchandise</option>
              <option>ShikshAQ</option>
              <option>AQ.Ventures</option>
              <option>media or press</option>
              <option>something else</option>
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <label className="mono xs upper muted" htmlFor="c-message">message *</label>
            <textarea
              id="c-message"
              className="textarea"
              placeholder="tell us what you need. be as direct as you want."
              style={{ marginTop: 4, minHeight: 120, fontFamily: 'var(--eina)', fontSize: 14 }}
              value={form.message}
              onChange={e => set('message', e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p className="mono xs muted" style={{ margin: 0 }}>
              usually within 24 hours · Instagram: @ngo.aquaterra
            </p>
            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={loading}
              style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  sending…
                </>
              ) : 'SEND →'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 28 }}>
        {[
          { label: 'Instagram', value: '@ngo.aquaterra', sub: 'fastest response', href: 'https://instagram.com/ngo.aquaterra' },
          { label: 'ROOTS', value: '@roots.aquaterra', sub: 'merch and brand', href: 'https://instagram.com/roots.aquaterra' },
          { label: 'ShikshAQ', value: '@shikshaq.in', sub: 'tuition platform', href: 'https://instagram.com/shikshaq.in' },
          { label: 'Registration', value: 'DARPAN: AAFTT2300ME20251', sub: 'govt certified', href: undefined },
        ].map(c => (
          c.href ? (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <div className="card card-hover" style={{ padding: 18 }}>
                <div className="mono xs upper muted" style={{ fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6, color: 'var(--ink)' }}>{c.value}</div>
                <div className="mono xs muted" style={{ marginTop: 2 }}>{c.sub}</div>
              </div>
            </a>
          ) : (
            <div key={c.label} className="card" style={{ padding: 18 }}>
              <div className="mono xs upper muted" style={{ fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{c.value}</div>
              <div className="mono xs muted" style={{ marginTop: 2 }}>{c.sub}</div>
            </div>
          )
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
