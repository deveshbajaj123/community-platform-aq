import { useState } from 'react'
import { Link } from 'react-router-dom'

const SECTIONS = [
  {
    title: 'What is AquaTerra?',
    body: `AquaTerra is a student-led NGO based in Kolkata, registered under DARPAN (REG: AAFTT2300ME20251). We run welfare drives for animals and communities, organise cultural events, and build technology projects, all driven entirely by volunteers aged 14–25.

We started in 2021 with a dog feeding drive in South Kolkata. Four years later, we've run 534+ welfare projects, built AQ Tech, launched Prism Media, and grown to 1,100+ members across 15+ schools.`,
  },
  {
    title: 'What will I actually do?',
    body: `It depends on which department you join. Welfare teams coordinate on-ground drives: feeding dogs, distributing supplies, visiting old age homes, planting trees. Events teams plan and execute workshops, fundraisers, and awareness programs. Content teams document our work through writing, photography, and video. Labs teams work on AQ Tech and Prism Media. Ops and HR teams keep everything running behind the scenes.

Most volunteers start by showing up to drives. As you prove yourself, you take on more responsibility.`,
  },
  {
    title: 'Who can apply?',
    body: `Anyone between Class 9 and college final year. We don't require prior experience, specific skills, or any kind of portfolio. We do ask that you're serious about showing up. We have limited spots and we're looking for people who want to do real work, not pad a resume.

We recruit from across Kolkata. If you're outside Kolkata and interested in our tech/content arms (AQ Tech, Prism Media), reach out directly.`,
  },
  {
    title: "What's the time commitment?",
    body: `Minimum 4–6 hours per month. Most active volunteers put in 10–15 hours. Drives are usually on weekends. Virtual coordination happens on WhatsApp throughout the week.

We understand you have school and exams. We don't expect perfect attendance. We expect genuine effort and communication when you can't make it.`,
  },
  {
    title: 'How does the approval process work?',
    body: `Apply via this website. A director reviews your application within 2–5 days. If approved, you'll get access to the AquaTerra community platform where you can see all internal posts, team updates, and initiatives.

Some departments (especially Labs and Director-track roles) have additional screening. Most welfare and events roles just need the standard application.`,
  },
  {
    title: 'What do I get out of it?',
    body: `Real experience doing real things. You'll work alongside directors who've run hundreds of welfare drives. You'll build relationships with 1,100+ members from across Kolkata's schools. You'll be credited for every project you contribute to.

We're not going to tell you it looks good on a college application. It probably does. But that's not why we're here.`,
  },
  {
    title: 'Code of conduct',
    body: `Show up when you say you will. If you can't, communicate. Don't ghost. Treat every person (volunteer, director, beneficiary, animal) with respect. Don't use your affiliation with AquaTerra to promote personal agendas or external businesses without explicit permission.

Directors have the authority to remove members who repeatedly fail to show up, behave disrespectfully, or act in ways that damage the community.`,
  },
]

export default function VolunteerHandbookPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ padding: 'clamp(40px,8vw,100px) var(--page-px,24px) clamp(32px,5vw,56px)', background: 'var(--bg-2)', borderBottom: '2px solid var(--ink)' }}>
        <div className="container">
          <span className="sticker wobble" style={{ display: 'inline-flex', marginBottom: 16 }}>★ VOLUNTEER</span>
          <h1 className="h-display" style={{ fontSize: 'clamp(48px,9vw,100px)', margin: '0 0 16px', lineHeight: 0.9 }}>
            The<br />
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>Handbook.</span>
          </h1>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', maxWidth: 480, fontSize: 18, lineHeight: 1.6 }}>
            Everything you need to know before applying. Read this first.
          </p>
        </div>
      </section>

      {/* Accordion */}
      <section style={{ padding: 'clamp(28px,4vw,48px) var(--page-px,24px)' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          {SECTIONS.map((s, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em',
                  color: 'var(--ink)', textAlign: 'left', gap: 16,
                  transition: 'color 0.15s',
                }}
              >
                <span>{s.title}</span>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: openIdx === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <div style={{
                overflow: 'hidden',
                maxHeight: openIdx === i ? 600 : 0,
                transition: 'max-height 0.25s cubic-bezier(0.2,0,0,1)',
              }}>
                <div style={{ padding: '0 0 24px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.72 }}>
                  {s.body.split('\n\n').map((para, j) => (
                    <p key={j} style={{ marginBottom: 14, fontFamily: 'var(--eina)' }}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--lemon)', borderTop: '2px solid var(--ink)', padding: 'clamp(40px,6vw,72px) var(--page-px,24px)', textAlign: 'center' }}>
        <div className="container">
          <h2 className="h-display" style={{ fontSize: 'clamp(28px,5vw,52px)', color: '#0A0A0A', marginBottom: 12 }}>Ready to apply?</h2>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: '#0A0A0A', marginBottom: 28, fontSize: 18, opacity: 0.8 }}>
            Takes 5 minutes. We read every application.
          </p>
          <Link to="/volunteer/apply" className="btn btn-lg" style={{ background: '#0A0A0A', color: 'var(--lemon)' }}>
            Apply to Volunteer →
          </Link>
        </div>
      </section>
    </div>
  )
}
