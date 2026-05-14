import { Link } from 'react-router-dom'
import { Star, Burst, Marquee } from '../components/v6Shared'

const DEPARTMENTS = [
  {
    name: 'Events',
    color: '#FF7A1A',
    icon: '🎪',
    desc: 'Paradox, Disco Diwali, Starry Nights, awareness events. AQ-run fundraisers have crossed 6-digit revenue. This team plans and executes every large-scale gathering.',
    stat: '300+ attendees at Paradox 3.0',
    category: 'events',
  },
  {
    name: 'Welfare Projects',
    color: '#00E5A0',
    icon: '🌱',
    desc: 'Teaching workshops, Sundarbans relief trips, dog feeding drives, plantation drives, old age home visits, clothes distribution. 3,500+ kids reached in educational workshops.',
    stat: '8 Sundarbans trips, 4,000+ saplings',
    category: 'welfare',
  },
  {
    name: 'Social Media',
    color: '#FF6BD6',
    icon: '📱',
    desc: 'Instagram (@ngo.aquaterra), LinkedIn, website, reels, carousels, copy. 3,200+ followers. Real brand work by student creators who show up every week.',
    stat: '3,200+ followers on Instagram',
    category: 'content',
  },
  {
    name: 'Collabs',
    color: '#FFC700',
    icon: '🤝',
    desc: 'School collabs, college partnerships, inter-NGO collaborations. AQ grows through peer networks. The Collabs team builds those networks.',
    stat: 'Partnerships across Kolkata',
    category: 'operations',
  },
  {
    name: 'ROOTS',
    color: '#7E5BFF',
    icon: '👕',
    desc: 'Student-run streetwear brand. Design, production, sales. Profits fund welfare projects and events. This is not a concept. The brand ships real merch.',
    stat: 'Revenue funds AQ operations',
    category: 'content',
  },
  {
    name: 'AQ.Ventures',
    color: '#3DA9FC',
    icon: '🚀',
    desc: 'A free marketing agency for student businesses. Real clients. Real briefs. Real deliverables. Members get live marketing experience before college.',
    stat: 'Pro-bono for student businesses',
    category: 'operations',
  },
  {
    name: 'ShikshAQ',
    color: '#FF4D8C',
    icon: '📚',
    desc: 'Tuition discovery platform built by AQ members for students across Kolkata. Launched 2026. Product, growth, content. Still early. Team is small and moving fast.',
    stat: 'Live as of 2026',
    category: 'labs',
  },
  {
    name: 'Human Resources',
    color: '#FFE94A',
    icon: '👥',
    desc: 'Recruitment, onboarding, certificates, Letters of Recommendation. HR runs the intake pipeline for 1,100+ members. First people new joiners meet.',
    stat: '1,100+ members onboarded',
    category: 'operations',
  },
]

export default function EverythingWeDoPage() {
  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)', position: 'relative', overflow: 'hidden' }}>
        <Star size={120} color="var(--lemon)" style={{ position: 'absolute', top: 40, right: '8%', opacity: 0.7 }} className="spin-slow" />
        <Burst size={90} color="var(--pink)" style={{ position: 'absolute', bottom: 20, left: '6%', opacity: 0.5 }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="row gap-2" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
            <span className="sticker sticker-mint sticker-float">★ 8 departments</span>
            <span className="sticker sticker-lemon wobble">512+ projects</span>
            <span className="sticker sticker-ghost">since 2021</span>
          </div>
          <h1 className="giant" style={{ margin: 0, lineHeight: 0.86 }}>
            everything<br />
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>we do</span>.
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.5, marginTop: 24, maxWidth: 560, color: 'var(--ink-2)' }}>
            AquaTerra runs 8 departments, each operated entirely by students. welfare drives, a streetwear brand, a marketing agency, and a tuition platform. all from Kolkata.
          </p>
        </div>
      </section>

      {/* Marquee */}
      <section style={{ padding: '20px 0', background: 'var(--ink)', color: 'var(--bg)', overflow: 'hidden' }}>
        <Marquee items={['★ WELFARE DRIVES', 'PLANTATION DRIVES', '★ SUNDARBANS RELIEF', 'ROOTS STREETWEAR', '★ AQ.VENTURES', 'SHIKSHAQ', '★ PARADOX', 'DISCO DIWALI', '★ SOCIAL MEDIA', 'TEACHING WORKSHOPS']} color="mint" />
      </section>

      {/* Department grid */}
      <div className="container" style={{ padding: '60px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {DEPARTMENTS.map((dept, i) => (
            <article key={dept.name} className="card card-hover" style={{ padding: 0, overflow: 'hidden', transform: `rotate(${i % 2 ? 0.4 : -0.4}deg)` }}>
              <div style={{ background: dept.color, color: '#0A0A0A', padding: '20px 22px 16px', borderBottom: '2px solid var(--ink)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{dept.icon}</div>
                <div className="h-display" style={{ fontSize: 28, lineHeight: 1 }}>{dept.name}</div>
                <span className={'chip cat-' + dept.category} style={{ marginTop: 8, background: 'rgba(0,0,0,0.12)', border: 'none', color: '#0A0A0A' }}>{dept.category}</span>
              </div>
              <div style={{ padding: '18px 22px 20px' }}>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 12px' }}>{dept.desc}</p>
                <div className="mono xs upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>★ {dept.stat}</div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="card" style={{ padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 36px)', marginTop: 48, background: 'var(--ink)', color: 'var(--bg)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <Star size={100} color="var(--mint)" style={{ position: 'absolute', top: -20, left: -20, opacity: 0.12 }} className="spin-slow" />
          <span className="sticker sticker-mint" style={{ marginBottom: 16, display: 'inline-flex' }}>★ open applications</span>
          <h2 className="h-display" style={{ fontSize: 'clamp(36px, 5vw, 60px)', margin: '0 0 16px', lineHeight: 0.95 }}>
            pick a department. show up.
          </h2>
          <p style={{ fontSize: 16, opacity: 0.75, maxWidth: 440, margin: '0 auto 24px' }}>2 minutes to apply. 24 hours to hear back. zero fees.</p>
          <div className="row gap-2" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">apply to join</Link>
            <Link to="/opportunities" className="btn btn-lg" style={{ background: 'transparent', color: 'var(--bg)' }}>see open roles</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
