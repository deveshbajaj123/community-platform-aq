import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const FAQS = [
  {
    section: 'About AquaTerra',
    items: [
      {
        q: 'What is AquaTerra?',
        a: 'AquaTerra is a student-led NGO based in Kolkata. We run welfare drives, plantation campaigns, community events, and technology initiatives — all entirely volunteer-driven with zero paid staff.',
      },
      {
        q: 'Who can join?',
        a: 'Any student from a Kolkata school or college can apply to join. We have 1,100+ members across 15+ institutions. Apply through the member portal and an operations director will review your application.',
      },
      {
        q: 'Is AquaTerra a registered NGO?',
        a: 'Yes. We are registered under DARPAN (Niti Aayog\'s NGO Darpan portal) and have been operating since July 2021.',
      },
      {
        q: 'Does AquaTerra have a physical office?',
        a: 'No. We\'re entirely decentralised — directors coordinate remotely and drives happen in the field. There\'s no overhead of rent or staff salaries.',
      },
    ],
  },
  {
    section: 'Volunteering',
    items: [
      {
        q: 'How do I volunteer?',
        a: 'Read the Volunteer Handbook to understand what we expect, then fill out the application form. You\'ll be matched with a team based on your interests and availability.',
      },
      {
        q: 'Do I need prior experience?',
        a: 'None. We train volunteers on the job. Willingness to show up is the only requirement.',
      },
      {
        q: 'How much time commitment is expected?',
        a: 'It varies by department. Most volunteers contribute 2–6 hours per month. Some roles (like department coordinators) require more. We never pressure people.',
      },
      {
        q: 'Can I volunteer for a specific department?',
        a: 'Yes — you can express a preference in your application. We have Welfare, Events, Labs, Operations, and Content departments. You\'ll be placed based on fit and openings.',
      },
    ],
  },
  {
    section: 'Collaborations & Support',
    items: [
      {
        q: 'How can my organisation collaborate with AQ?',
        a: 'We\'re open to event co-hosting, joint welfare drives, sponsorships, resource sharing, and technology partnerships. Fill out the collaboration form and we\'ll respond within a few days.',
      },
      {
        q: 'Where does donated money go?',
        a: 'Directly into welfare work — food for animals, medical supplies, event logistics, and planting materials. We have no office or salary costs. 100% goes to the ground.',
      },
      {
        q: 'How can I donate?',
        a: 'Reach out to us on Instagram (@ngo.aquaterra) or through the contact form. We\'ll share verified payment details directly.',
      },
    ],
  },
  {
    section: 'The Member Platform',
    items: [
      {
        q: 'What is the community platform?',
        a: 'It\'s our internal social network — an activity feed, team directory, and member profiles all in one place. Only approved members can post. The public can view the feed.',
      },
      {
        q: 'My application is pending — how long does approval take?',
        a: 'Usually 2–5 days. Operations directors review each application manually. If it\'s been over a week, reach out to us on Instagram.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'Use the "Forgot password" link on the login page. You\'ll receive a reset email from Supabase Auth. Check your spam folder if it doesn\'t arrive.',
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          padding: '18px 0', background: 'none', cursor: 'pointer',
          transition: 'color 0.12s',
        }}
      >
        <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(13px,1.6vw,15px)', letterSpacing: '-0.02em', color: open ? 'var(--accent)' : 'var(--txt)', lineHeight: 1.4 }}>
          {q}
        </span>
        <span style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
          border: '1.5px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'var(--txt-3)', transition: 'transform 0.18s var(--ease), border-color 0.12s',
          transform: open ? 'rotate(45deg)' : 'none',
          borderColor: open ? 'var(--accent)' : undefined,
        }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 20, animation: 'ddIn 0.18s var(--ease)' }}>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.75 }}>{a}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  useReveal()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? FAQS.map(section => ({
        ...section,
        items: section.items.filter(
          item =>
            item.q.toLowerCase().includes(query.toLowerCase()) ||
            item.a.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : FAQS

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(72px,12vw,120px) 0 clamp(40px,6vw,64px)', overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--accent)' }}>Help</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>
            Frequently<br />Asked.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            Everything you need to know about AquaTerra, volunteering, collaborating, and the member platform.
          </p>
          {/* Search */}
          <div className="aq-reveal aq-reveal-d3" style={{ marginTop: 32, maxWidth: 480, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-3)', pointerEvents: 'none', fontSize: 15 }}>
              &#128269;
            </span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search questions…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px 12px 40px',
                fontFamily: 'var(--f-body)', fontSize: 14,
                background: 'var(--bg)', color: 'var(--txt)',
                border: '1.5px solid var(--line-2)', borderRadius: 8,
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
            />
          </div>
        </div>
      </section>

      {/* FAQ sections */}
      <div className="aq-wrap-xs" style={{ padding: 'clamp(48px,8vw,80px) 40px' }}>
        {filtered.length === 0 && (
          <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-3)', marginBottom: 52 }}>
            No results for "{query}".
          </p>
        )}
        {filtered.map(section => (
          <div key={section.section} style={{ marginBottom: 52 }} className="aq-reveal">
            <div className="aq-label" style={{ marginBottom: 20, color: 'var(--accent)' }}>{section.section}</div>
            {section.items.map(item => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        {/* Still have questions CTA */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 16 }} className="aq-reveal">
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: 'clamp(18px,2.5vw,28px)', letterSpacing: '-0.04em' }}>Still have questions?</div>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.7, maxWidth: 480 }}>
            We're real people. Reach us on Instagram or through the contact form and we'll get back to you.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="https://instagram.com/ngo.aquaterra" target="_blank" rel="noopener noreferrer" className="aq-btn aq-btn-ink aq-btn-sm">@ngo.aquaterra</a>
            <Link to="/contact" className="aq-btn aq-btn-outline aq-btn-sm">Contact us →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
