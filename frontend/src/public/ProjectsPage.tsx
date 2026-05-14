import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Burst } from '../components/v6Shared'

const PROJECTS = [
  {
    id: 'sea-moss',
    title: 'Sea Moss Bio Lab',
    cat: 'biology',
    catColor: 'var(--mint)',
    lead: 'Maya P.',
    school: 'Northside High',
    members: 8,
    status: 'active',
    blurb: 'Growing sea moss in controlled tanks to study bioremediation in brackish water. Open dataset.',
    tags: ['marine bio', 'open data', 'tanks'],
    year: '2026',
  },
  {
    id: 'beach-guard',
    title: 'Beach Guard Initiative',
    cat: 'conservation',
    catColor: 'var(--sky)',
    lead: 'Kai R.',
    school: 'Coastal Academy',
    members: 22,
    status: 'active',
    blurb: 'Weekly dawn patrols. 318kg of plastic removed since Jan. Every pickup logged and mapped.',
    tags: ['cleanup', 'mapping', 'weekly'],
    year: '2025',
  },
  {
    id: 'river-atlas',
    title: 'River Microplastic Atlas',
    cat: 'research',
    catColor: 'var(--lemon)',
    lead: 'Zara A.',
    school: 'Multiple',
    members: 14,
    status: 'complete',
    blurb: 'Four-river microplastic survey. All samples, methods, and raw data published under CC0.',
    tags: ['open data', 'sampling', 'atlas'],
    year: '2024',
  },
  {
    id: 'tide-zine',
    title: 'TIDE Zine',
    cat: 'media',
    catColor: 'var(--pink)',
    lead: 'Nora K.',
    school: 'Art Dept.',
    members: 6,
    status: 'active',
    blurb: 'Quarterly risograph zine about ecology and community. Issue 04 dropping next month.',
    tags: ['zine', 'print', 'risograph'],
    year: '2026',
  },
  {
    id: 'youth-tutoring',
    title: 'Youth Ecology Tutoring',
    cat: 'education',
    catColor: 'var(--lemon)',
    lead: 'Sarah D.',
    school: 'Multi-school',
    members: 31,
    status: 'active',
    blurb: 'Sunday sessions for ages 10–16. Ecology, data literacy, field skills. Free, always.',
    tags: ['tutoring', 'free', 'sundays'],
    year: '2025',
  },
  {
    id: 'spring-summit',
    title: 'Spring Summit 2026',
    cat: 'event',
    catColor: 'var(--mint)',
    lead: 'Diego L.',
    school: 'HQ',
    members: 45,
    status: 'complete',
    blurb: 'Two-day convening for 14 schools. Workshops, critiques, one very large whiteboard wall.',
    tags: ['summit', 'annual', '14 schools'],
    year: '2026',
  },
  {
    id: 'coral-nursery',
    title: 'Coral Nursery Pilot',
    cat: 'biology',
    catColor: 'var(--mint)',
    lead: 'Asha K.',
    school: 'Marine Sciences Dept.',
    members: 5,
    status: 'active',
    blurb: 'Small-scale coral fragment propagation in partnership with the local marine reserve.',
    tags: ['coral', 'marine', 'pilot'],
    year: '2026',
  },
  {
    id: 'watershed-map',
    title: 'Watershed Community Map',
    cat: 'research',
    catColor: 'var(--lemon)',
    lead: 'Rohan M.',
    school: 'Geography Club',
    members: 9,
    status: 'active',
    blurb: 'Participatory mapping of local watershed. Community interviews + GIS. Fully open.',
    tags: ['GIS', 'mapping', 'community'],
    year: '2025',
  },
]

const CATS = ['all', 'biology', 'conservation', 'research', 'media', 'education', 'event']

function ProjectCard({ p, onClick }: { p: typeof PROJECTS[0]; onClick: () => void }) {
  return (
    <div
      className="card card-hover"
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
      onClick={onClick}
    >
      {/* Color header */}
      <div style={{ background: p.catColor, padding: '24px 20px 20px', color: '#0A0A0A', borderBottom: '2px solid var(--ink)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="mono xs upper" style={{ fontWeight: 800, opacity: 0.6, fontSize: 10 }}>{p.cat}</span>
          <span className="sticker" style={{
            fontSize: 10, padding: '2px 7px',
            background: p.status === 'active' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)',
          }}>{p.status === 'active' ? '● active' : '✓ done'}</span>
        </div>
        <h3 style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 22, margin: '8px 0 0', lineHeight: 1.1 }}>{p.title}</h3>
      </div>
      {/* Body */}
      <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--ink-2)', flex: 1 }}>{p.blurb}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {p.tags.map(t => (
            <span key={t} className="mono xs" style={{ background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, color: 'var(--ink-2)' }}>#{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <div className="mono xs" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
            {p.lead} · {p.school}
          </div>
          <div className="mono xs" style={{ fontWeight: 800, fontSize: 11, color: 'var(--ink-2)' }}>
            {p.members} members
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [cat, setCat] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = PROJECTS.filter(p => {
    const matchCat = cat === 'all' || p.cat === cat
    const q = search.toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.blurb.toLowerCase().includes(q) || p.tags.some(t => t.includes(q))
    return matchCat && matchSearch
  })

  return (
    <div className="route-enter">
      {/* HERO */}
      <section style={{ padding: '72px 24px 48px', position: 'relative', overflow: 'hidden' }}>
        <Burst size={180} color="var(--mint)" style={{ position: 'absolute', top: -40, right: '5%', opacity: 0.18 }} />
        <Burst size={100} color="var(--lemon)" style={{ position: 'absolute', bottom: -20, left: '3%', opacity: 0.22 }} />
        <div className="container" style={{ position: 'relative' }}>
          <div className="row gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="sticker sticker-mint sticker-float">★ student projects</span>
            <span className="sticker">{PROJECTS.length} total</span>
          </div>
          <h1 className="giant" style={{ margin: 0, lineHeight: 0.88 }}>
            what we're<br />
            <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>building</span>.
          </h1>
          <p style={{ fontSize: 18, marginTop: 20, maxWidth: 520, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            every active project, completed study, and ongoing experiment. all public. all student-run.
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <div style={{ background: 'var(--bg)', borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="container" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button
              key={c}
              className={'btn btn-sm' + (cat === c ? ' btn-primary' : '')}
              onClick={() => setCat(c)}
              style={{ textTransform: 'uppercase', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700 }}
            >
              {c}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: 160 }}>
            <input
              className="input"
              placeholder="search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: 13, padding: '6px 12px', height: 34 }}
            />
          </div>
        </div>
      </div>

      {/* GRID */}
      <section className="container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-2)' }}>
            <p className="mono" style={{ fontSize: 16 }}>no projects match "{search}"</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filtered.map(p => (
              <ProjectCard key={p.id} p={p} onClick={() => navigate('/projects/' + p.id)} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container" style={{ padding: '0 24px 80px' }}>
        <div className="card" style={{ padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 36px)', background: 'var(--ink)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="sticker sticker-mint" style={{ marginBottom: 12 }}>★ got an idea?</div>
            <h3 className="h-display" style={{ fontSize: 40, margin: 0, lineHeight: 0.95 }}>start your own project.</h3>
            <p style={{ marginTop: 10, opacity: 0.7, fontSize: 16 }}>join first, then pitch. we fund the weird ones.</p>
          </div>
          <button className="btn btn-lg btn-primary" onClick={() => navigate('/register')}>JOIN NOW</button>
        </div>
      </section>
    </div>
  )
}
