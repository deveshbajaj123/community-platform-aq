import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'

const SECTIONS = [
  {
    title: 'What is AquaTerra?',
    body: `AquaTerra is a student-led NGO based in Kolkata, registered under DARPAN (REG: AAFTT2300ME20251). We run welfare drives for animals and communities, organise cultural events, and build technology projects — all driven entirely by volunteers aged 14–25.

We started in 2021 with a dog feeding drive in South Kolkata. Four years later, we've run 534+ welfare projects, built AQ Tech, launched Prism Media, and grown to 1,100+ members across 15+ schools.`,
  },
  {
    title: 'What will I actually do?',
    body: `It depends on which department you join. Welfare teams coordinate on-ground drives — feeding dogs, distributing supplies, visiting old age homes, planting trees. Events teams plan and execute workshops, fundraisers, and awareness programs. Content teams document our work through writing, photography, and video. Labs teams work on AQ Tech and Prism Media. Ops and HR teams keep everything running behind the scenes.

Most volunteers start by showing up to drives. As you prove yourself, you take on more responsibility.`,
  },
  {
    title: 'Who can apply?',
    body: `Anyone between Class 9 and college final year. We don't require prior experience, specific skills, or any kind of portfolio. We do ask that you're serious about showing up — we have limited spots and we're looking for people who want to do real work, not pad a resume.

We recruit from across Kolkata. If you're outside Kolkata and interested in our tech/content arms (AQ Tech, Prism Media), reach out directly.`,
  },
  {
    title: "What's the time commitment?",
    body: `Minimum 4–6 hours per month. Most active volunteers put in 10–15 hours. Drives are usually on weekends. Virtual coordination happens on WhatsApp throughout the week.

We understand you have school and exams. We don't expect perfect attendance — we expect genuine effort and communication when you can't make it.`,
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
    body: `Show up when you say you will. If you can't, communicate. Don't ghost. Treat every person — volunteer, director, beneficiary, animal — with respect. Don't use your affiliation with AquaTerra to promote personal agendas or external businesses without explicit permission.

Directors have the authority to remove members who repeatedly fail to show up, behave disrespectfully, or act in ways that damage the community.`,
  },
]

export default function VolunteerHandbookPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  useReveal()

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(72px, 12vw, 140px) 0 clamp(48px, 8vw, 80px)', overflow: 'hidden', background: 'var(--bg-2)' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--c-welfare)' }}>Volunteer</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>
            The<br />Handbook.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            Everything you need to know before applying. Read this first.
          </p>
        </div>
      </section>

      {/* Accordion */}
      <section className="aq-band-sm">
        <div className="aq-wrap-sm">
          {SECTIONS.map((s, i) => (
            <div key={i} className="aq-accordion-item aq-reveal">
              <button
                className="aq-accordion-trigger"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span>{s.title}</span>
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: openIdx === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0, color: 'var(--txt-3)' }}
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <div
                className="aq-accordion-body"
                style={{ maxHeight: openIdx === i ? 600 : 0 }}
              >
                <div className="aq-accordion-body-inner">
                  {s.body.split('\n\n').map((para, j) => (
                    <p key={j} style={{ marginBottom: 16 }}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="aq-band-sm" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="aq-wrap" style={{ textAlign: 'center' }}>
          <h2 className="aq-title aq-reveal" style={{ marginBottom: 16 }}>Ready to apply?</h2>
          <p className="aq-serif aq-reveal aq-reveal-d1" style={{ color: 'var(--txt-2)', marginBottom: 28, fontSize: 18 }}>
            Takes 5 minutes. We read every application.
          </p>
          <Link to="/volunteer/apply" className="aq-btn aq-btn-accent aq-reveal aq-reveal-d2">
            Apply to Volunteer →
          </Link>
        </div>
      </section>
    </div>
  )
}
