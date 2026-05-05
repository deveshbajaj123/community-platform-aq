import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const HOW_TO_HELP = [
  {
    num: '01',
    color: 'var(--c-welfare)',
    title: 'Join as a Volunteer',
    body: 'Show up, do the work, and become part of the community. No experience needed — just willingness.',
    cta: 'Apply to Volunteer →',
    to: '/volunteer/apply',
    variant: 'aq-btn-ink',
  },
  {
    num: '02',
    color: 'var(--c-events)',
    title: 'Collaborate with Us',
    body: "Partner on events, co-sponsor drives, or lend your organization's resources. We're open to all serious partnerships.",
    cta: 'Propose Collaboration →',
    to: '/collaborations',
    variant: 'aq-btn-outline',
  },
  {
    num: '03',
    color: 'var(--c-labs)',
    title: 'Spread the Word',
    body: 'Share our work, follow our channels, and help more people know what AquaTerra does every weekend.',
    cta: 'Follow @ngo.aquaterra →',
    href: 'https://instagram.com/ngo.aquaterra',
    variant: 'aq-btn-outline',
  },
]

export default function SupportPage() {
  useReveal()

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(72px, 12vw, 140px) 0 clamp(48px, 8vw, 80px)', overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--c-events)' }}>Support</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24, color: 'var(--c-events)' }}>
            Back The<br />Work.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 520 }}>
            AquaTerra is entirely volunteer-driven. Every contribution goes directly into welfare work — feeding animals, running drives, and supporting communities.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section className="aq-band-sm" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <blockquote className="aq-reveal" style={{
            fontStyle: 'italic', fontSize: 'clamp(18px, 2.5vw, 28px)',
            lineHeight: 1.5, color: 'var(--txt)',
            borderLeft: '3px solid var(--c-events)', paddingLeft: 28,
          }}>
            "Every effort goes directly into welfare. We show up for the work, not the credit."
          </blockquote>
        </div>
      </section>

      {/* How to help */}
      <section className="aq-band-sm">
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 32 }}>How to help</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
            {HOW_TO_HELP.map((opt, i) => (
              <div key={opt.num} className={`aq-reveal aq-reveal-d${Math.min(i, 3)}`} style={{ padding: '40px 32px', background: 'var(--bg-card)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 20, right: 24, fontWeight: 700, fontSize: 'clamp(60px, 8vw, 100px)', color: 'var(--line)', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{opt.num}</div>
                <div style={{ height: 3, background: opt.color, borderRadius: 2, marginBottom: 24, width: 36 }} />
                <h2 style={{ fontWeight: 700, fontSize: 'clamp(17px, 2vw, 22px)', letterSpacing: '-0.025em', marginBottom: 12, color: 'var(--txt)' }}>{opt.title}</h2>
                <p style={{ fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.75, marginBottom: 24 }}>{opt.body}</p>
                {opt.to ? (
                  <Link to={opt.to} className={`aq-btn ${opt.variant} aq-btn-sm`}>{opt.cta}</Link>
                ) : (
                  <a href={opt.href} target="_blank" rel="noopener noreferrer" className={`aq-btn ${opt.variant} aq-btn-sm`}>{opt.cta}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do with support */}
      <section className="aq-band-sm" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 32 }}>Where it goes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { label: 'Animal Feed', body: 'Dog food, medical supplies, and equipment for our weekly welfare rounds across Kolkata.' },
              { label: 'Event Production', body: 'Venue, logistics, and materials for welfare events, awareness programs, and community workshops.' },
              { label: 'Tree Plantation', body: 'Saplings, soil, and transport for plantation drives across Kolkata and surrounding districts.' },
              { label: 'Tech & Media', body: 'Tools, hosting, and resources for AQ Tech and Prism Media to document and build.' },
            ].map((item, i) => (
              <div key={item.label} className={`aq-reveal aq-reveal-d${Math.min(i, 3)}`} style={{
                padding: '24px 20px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--r-lg)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8, letterSpacing: '-0.01em' }}>{item.label}</div>
                <p style={{ fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.7 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="aq-band-sm" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <h2 className="aq-title aq-reveal" style={{ marginBottom: 12 }}>Have questions?</h2>
          <p className="aq-reveal aq-reveal-d1" style={{ color: 'var(--txt-2)', marginBottom: 28, fontSize: 15, lineHeight: 1.7, maxWidth: 480 }}>
            We're real people. Reach us on Instagram or through the contact page.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="aq-reveal aq-reveal-d2">
            <a href="https://instagram.com/ngo.aquaterra" target="_blank" rel="noopener noreferrer" className="aq-btn aq-btn-ink">@ngo.aquaterra</a>
            <Link to="/contact" className="aq-btn aq-btn-outline">Contact us →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
