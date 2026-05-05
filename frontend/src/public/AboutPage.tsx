import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

/* ─── Animated count-up ─── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime: number | null = null
    const step = (ts: number) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return value
}

const IMPACT = [
  { num: 3500, suffix: '+', label: 'Kids Taught' },
  { num: 4000, suffix: '+', label: 'Saplings Planted' },
  { num: 1600, suffix: '+', label: 'Medical Checkups' },
  { num: 2500, suffix: '+', label: 'Event Attendees' },
  { num: 534,  suffix: '+', label: 'Welfare Projects' },
  { num: 1500, suffix: '+', label: 'Dogs Fed Weekly' },
  { num: 1100, suffix: '+', label: 'Active Members' },
]

function ImpactCell({ num, suffix, label, triggered }: { num: number; suffix: string; label: string; triggered: boolean }) {
  const val = useCountUp(num, 1600, triggered)
  return (
    <div className="aq-impact-cell">
      <div className="aq-impact-num tabular-nums">{val.toLocaleString()}{suffix}</div>
      <div className="aq-impact-label">{label}</div>
    </div>
  )
}

function ImpactGrid() {
  const ref = useRef<HTMLDivElement>(null)
  const [triggered, setTriggered] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTriggered(true); obs.disconnect() }
    }, { threshold: 0.15 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className="aq-impact-grid">
      {IMPACT.map(s => <ImpactCell key={s.label} {...s} triggered={triggered} />)}
    </div>
  )
}

const TIMELINE = [
  { year: 'Jul 2021', title: 'A Dog Feeding Drive', body: 'Seven friends, three bags of dog food, and one park in South Kolkata. That\'s how AquaTerra started — not with a plan, but with a problem that needed solving right now.' },
  { year: '2022', title: 'Growing Past the Park', body: 'What started as a neighbourhood circuit expanded to 8+ locations. We registered under DARPAN, launched our first tree-plantation drives, and began coordinating proper welfare campaigns. Membership hit 200.' },
  { year: '2023', title: 'Building the Machine', body: 'We created structured departments — Welfare, Events, Labs, Ops, Content. AQ Tech launched to build tools for NGOs. Prism Media started documenting everything. First batch of directors appointed.' },
  { year: '2024', title: 'Scale & Permanence', body: '500+ members. 15+ partner schools. 300+ welfare projects completed. We ran our largest cultural event — Reverie — with 800+ attendees. AQ became less of a club and more of an institution.' },
  { year: '2025', title: 'Where We Are Now', body: '1,100+ members. 534+ projects. 4 years of showing up. We\'re building the platform you\'re reading this on — AQ 5.0 — so the people who run AquaTerra can do it better, together.' },
]

const VALUES = [
  { num: '01', title: 'Show Up', body: 'The most important thing you can do is be there. We don\'t romanticise intention. We track attendance, not motivation.' },
  { num: '02', title: 'No Hierarchy', body: 'Directors lead because they do more work, not because they have a title. Every member\'s opinion on a welfare call matters equally.' },
  { num: '03', title: 'Own It', body: 'If you commit to something, you own the outcome. No blame-shifting. No waiting for permission. Take the initiative and fix it.' },
  { num: '04', title: 'Make Noise', body: 'Document what you do. Post about it. Tell people. If your team ran a great drive and nobody knows, that\'s on you.' },
]

const FAQ = [
  { q: 'Is AquaTerra a registered NGO?', a: 'Yes. AquaTerra is registered under DARPAN (REG: AAFTT2300ME20251). We operate as a student-led voluntary organisation based in Kolkata.' },
  { q: 'Who runs AquaTerra?', a: 'Students aged 14–25, coordinated by a Director cohort who are voted in or appointed based on track record. There\'s no external management or adult oversight — we run this ourselves.' },
  { q: 'How is AquaTerra funded?', a: 'Through community fundraisers, event ticket sales, and small donations from our alumni network. We\'ve never taken institutional funding. We want to keep it that way.' },
  { q: 'What departments exist?', a: 'Welfare (on-ground drives), Events (planning & execution), Labs (AQ Tech + Prism Media), Operations (logistics & HR), and Content (documentation & media). Most members sit in one department and cross-pollinate.' },
  { q: 'Can I join if I\'m not in Kolkata?', a: 'On-ground welfare and events are Kolkata-based. AQ Tech and Prism Media are remote-friendly. Reach out via the contact page if you\'re interested.' },
  { q: 'How is this different from a college club?', a: 'We do real work with real consequences. Animals are fed or not fed. Events happen or don\'t. There\'s no faculty advisor to fall back on. The stakes feel proportional because they are.' },
]

const DEPTS = [
  { color: 'var(--c-welfare)', dept: 'Welfare', label: 'On-ground', body: 'Dog feeding, tree planting, medical camps, old age home visits, stray animal care. We show up every weekend without fail.' },
  { color: 'var(--c-events)', dept: 'Events', label: 'Cultural', body: 'Workshop coordination, fundraisers, awareness programs, and Reverie — our flagship annual event with 800+ attendees.' },
  { color: 'var(--c-labs)', dept: 'Labs', label: 'Technology', body: 'AQ Tech builds tools for NGOs. Prism Media documents everything. We make things that outlast any single drive.' },
  { color: 'var(--c-ops)', dept: 'Operations', label: 'Infrastructure', body: 'Logistics, HR, member management, and everything that keeps the machine running behind the scenes.' },
  { color: 'var(--c-content)', dept: 'Content', label: 'Media', body: 'Photography, writing, video, and the Groundwork Diaries blog — we tell the stories that matter.' },
  { color: 'var(--accent)', dept: 'Director Track', label: 'Leadership', body: 'Directors are members who prove themselves over time. No elections. No popularity contests. Just track record.' },
]

export default function AboutPage() {
  useReveal()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="aq-page">

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: 'clamp(80px, 14vw, 160px) 0 clamp(56px, 8vw, 96px)', overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-about-hero-badge aq-reveal">
            <span>Est. July 2021</span>
            <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
            <span>REG: AAFTT2300ME20251</span>
          </div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 28 }}>
            Started As<br />An NGO.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 520, marginBottom: 32 }}>
            It got out of hand. Four years, 1,100+ members, and 534+ welfare projects later — here's the full story.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="aq-reveal aq-reveal-d3">
            <Link to="/volunteer/apply" className="aq-btn aq-btn-accent">Join Us →</Link>
            <Link to="/projects" className="aq-btn aq-btn-outline">Our Projects</Link>
          </div>
        </div>
      </section>

      {/* ── Impact Numbers ── */}
      <section className="aq-band-sm" style={{ background: 'var(--bg)' }}>
        <div className="aq-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <h2 className="aq-title aq-reveal">By the Numbers</h2>
            <span className="aq-label aq-reveal">Since July 2021</span>
          </div>
          <ImpactGrid />
        </div>
      </section>

      {/* ── Origin Story ── */}
      <section className="aq-band" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 'clamp(32px, 6vw, 80px)', alignItems: 'start' }}>
            <div>
              <div className="aq-label aq-reveal" style={{ marginBottom: 16 }}>Origin</div>
              <h2 className="aq-display aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>How We Got Here</h2>
              <p style={{ color: 'var(--txt-2)', lineHeight: 1.8, fontSize: 15 }} className="aq-reveal aq-reveal-d2">
                No founding vision. No five-year plan. Just a group of people who noticed the dogs around them were starving, and decided that was a problem they could fix.
              </p>
            </div>
            <div className="aq-timeline aq-reveal aq-reveal-d1" style={{ marginLeft: 20 }}>
              {TIMELINE.map(item => (
                <div key={item.year} className="aq-timeline-item">
                  <div className="aq-timeline-dot" />
                  <div className="aq-timeline-year">{item.year}</div>
                  <div className="aq-timeline-title">{item.title}</div>
                  <div className="aq-timeline-body">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Are We ── */}
      <section className="aq-band" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 'clamp(32px, 6vw, 80px)', alignItems: 'center' }}>
            <div>
              <div className="aq-label aq-reveal" style={{ marginBottom: 16 }}>Who We Are</div>
              <h2 className="aq-display aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>Students Who<br />Got Serious</h2>
              <p style={{ color: 'var(--txt-2)', lineHeight: 1.85, fontSize: 15, marginBottom: 20 }} className="aq-reveal aq-reveal-d2">
                AquaTerra is run entirely by students between Class 9 and college final year. No adults. No institutional backing. Just 1,100+ people who decided they could do something real.
              </p>
              <p style={{ color: 'var(--txt-2)', lineHeight: 1.85, fontSize: 15, marginBottom: 28 }} className="aq-reveal aq-reveal-d3">
                We have six departments, fifteen+ school partnerships across Kolkata, a tech arm (AQ Tech), a media division (Prism Media), and a welfare network that runs every weekend without fail.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} className="aq-reveal">
                {[['15+', 'Partner Schools'], ['6', 'Departments'], ['4 yrs', 'Running']].map(([num, lbl]) => (
                  <div key={lbl} className="aq-stat-pill">
                    <div className="aq-stat-pill-num">{num}</div>
                    <div className="aq-stat-pill-label">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Photo mosaic */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderRadius: 'var(--r-xl)', overflow: 'hidden' }} className="aq-reveal aq-reveal-d2">
              {['Welfare Drive', 'Reverie 2024', 'Tree Plantation', 'AQ Tech'].map((label, i) => (
                <div key={i} style={{
                  background: ['var(--c-welfare)', 'var(--c-events)', 'var(--c-labs)', 'var(--c-ops)'][i],
                  aspectRatio: '1', display: 'flex', alignItems: 'flex-end', padding: 16, opacity: 0.85,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Everything We Do ── */}
      <section className="aq-band" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div style={{ marginBottom: 48 }}>
            <div className="aq-label aq-reveal" style={{ marginBottom: 12 }}>Departments</div>
            <h2 className="aq-display aq-reveal aq-reveal-d1">Everything We Do</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
            {DEPTS.map((d, i) => (
              <div key={d.dept} className={`aq-reveal aq-reveal-d${Math.min(i % 3, 3)}`} style={{
                background: 'var(--bg-card)', padding: '28px 24px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: d.color }} />
                <div className="aq-label" style={{ color: d.color, marginBottom: 8 }}>{d.label}</div>
                <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--txt)', marginBottom: 12 }}>{d.dept}</div>
                <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--txt-2)' }}>{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Values ── */}
      <section className="aq-band" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div style={{ marginBottom: 48 }}>
            <div className="aq-label aq-reveal" style={{ marginBottom: 12 }}>What We Believe</div>
            <h2 className="aq-display aq-reveal aq-reveal-d1">Core Values</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
            {VALUES.map((v, i) => (
              <div key={v.num} className={`aq-reveal aq-reveal-d${Math.min(i, 3)}`} style={{
                padding: '36px 28px', background: 'var(--bg-card)',
              }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 16, fontVariantNumeric: 'tabular-nums' }}>{v.num}</div>
                <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--txt)', marginBottom: 12 }}>{v.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--txt-2)' }}>{v.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manifesto ── */}
      <section className="aq-band" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap-sm">
          <div className="aq-label aq-reveal" style={{ marginBottom: 24 }}>Manifesto</div>
          <p className="aq-manifesto aq-reveal aq-reveal-d1">
            AquaTerra is less about <em>telling people to care</em> and more about showing up when nobody is watching. The dogs that get fed, the trees that get planted, the kids who get taught — none of them care about your intentions. <em>Neither do we.</em>
          </p>
          <p className="aq-manifesto aq-reveal aq-reveal-d2" style={{ marginTop: 32, fontSize: 'clamp(16px, 2.5vw, 32px)' }}>
            We are not a charity. We are not a brand. We are a group of people who decided <em>this week matters</em> — and did something about it.
          </p>
        </div>
      </section>

      {/* ── Impact Stats Bento ── */}
      <section className="aq-band" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div style={{ marginBottom: 40 }}>
            <div className="aq-label aq-reveal" style={{ marginBottom: 12 }}>Four Years In</div>
            <h2 className="aq-title aq-reveal aq-reveal-d1">What We've Actually Done</h2>
          </div>
          <div className="aq-stats-bento">
            {[
              { num: '3,500+', label: 'Children given structured learning sessions by AQ volunteers' },
              { num: '4,000+', label: 'Saplings planted across Kolkata, Howrah, and surrounding districts' },
              { num: '1,600+', label: 'Free medical checkups organised at community camps' },
              { num: '2,500+', label: 'Event attendees across cultural programs and workshops' },
              { num: '500+',   label: 'Animal welfare campaigns — feeding, medical, rescue' },
              { num: '2,500 kg', label: 'Clothing distributed to communities in need' },
            ].map((s, i) => (
              <div key={i} className={`aq-stats-bento-card aq-reveal aq-reveal-d${Math.min(i % 3, 3)}`}>
                <div className="aq-stats-bento-num tabular-nums">{s.num}</div>
                <div className="aq-stats-bento-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="aq-band" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap-sm">
          <div style={{ marginBottom: 40 }}>
            <div className="aq-label aq-reveal" style={{ marginBottom: 12 }}>Questions</div>
            <h2 className="aq-title aq-reveal aq-reveal-d1">Common Questions</h2>
          </div>
          <div className="aq-faq-wrap aq-reveal aq-reveal-d1">
            {FAQ.map((item, i) => (
              <div key={i} className="aq-accordion-item">
                <button className="aq-accordion-trigger" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ padding: '22px 0' }}>
                  <span>{item.q}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: openFaq === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0, color: 'var(--txt-3)' }}>
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                <div className="aq-accordion-body" style={{ maxHeight: openFaq === i ? 400 : 0 }}>
                  <div style={{ padding: '0 0 22px', fontSize: 14, lineHeight: 1.8, color: 'var(--txt-2)' }}>
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="aq-band" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 16 }}>Join Us</div>
          <h2 className="aq-display aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>
            Ready to<br />Show Up?
          </h2>
          <p style={{ color: 'var(--txt-2)', fontSize: 15, lineHeight: 1.75, marginBottom: 36, maxWidth: 440 }} className="aq-reveal aq-reveal-d2">
            Takes five minutes to apply. We read every application. We don't care about your CV — we care about whether you'll actually come.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="aq-reveal aq-reveal-d3">
            <Link to="/volunteer/apply" className="aq-btn aq-btn-accent">Apply to Volunteer →</Link>
            <Link to="/volunteer" className="aq-btn aq-btn-outline">Read the Handbook</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
