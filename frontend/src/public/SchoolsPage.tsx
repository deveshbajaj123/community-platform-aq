import { useNavigate } from 'react-router-dom'

const SCHOOLS = [
  { name: 'Riverside High', members: 24, posts: 187, color: '#00E5A0', town: 'Brooklyn, NY' },
  { name: 'St. Marks Academy', members: 18, posts: 142, color: '#FF6BD6', town: 'Chicago, IL' },
  { name: 'Lincoln Prep', members: 31, posts: 211, color: '#FFC700', town: 'Atlanta, GA' },
  { name: 'Westview College', members: 12, posts: 88, color: '#7E5BFF', town: 'Austin, TX' },
  { name: 'Hampton Middle', members: 9, posts: 54, color: '#FF7A1A', town: 'Boston, MA' },
  { name: 'Greenwood HS', members: 16, posts: 121, color: '#3DA9FC', town: 'Seattle, WA' },
  { name: 'Eastside Tech', members: 22, posts: 167, color: '#00C2A0', town: 'Detroit, MI' },
  { name: 'Bayridge Academy', members: 14, posts: 99, color: '#FF44A4', town: 'Miami, FL' },
  { name: 'Highland Middle', members: 7, posts: 38, color: '#FFD93B', town: 'Denver, CO' },
  { name: 'Park Slope HS', members: 19, posts: 144, color: '#B084FF', town: 'Brooklyn, NY' },
]

export default function SchoolsPage() {
  const navigate = useNavigate()

  return (
    <div className="route-enter container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)' }}>
      <span className="sticker sticker-mint wobble">★ {SCHOOLS.length} SCHOOLS · 412 MEMBERS</span>
      <h1 className="h-display" style={{ fontSize: 'clamp(60px, 9vw, 96px)', margin: '12px 0 32px', lineHeight: 0.9 }}>
        the<br/><span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>map</span>.
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {SCHOOLS.map((s, i) => (
          <div
            key={s.name}
            className="card card-hover"
            style={{ padding: 20, transform: `rotate(${i % 2 ? -0.6 : 0.6}deg)`, cursor: 'pointer' }}
            onClick={() => navigate('/search')}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 56, height: 56, background: s.color,
                border: '2px solid var(--ink)', borderRadius: 12,
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: '#0A0A0A'
              }}>
                {s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
              </div>
              <span className="chip">{s.posts} posts</span>
            </div>
            <h3 className="h-display" style={{ fontSize: 22, margin: '14px 0 4px' }}>{s.name}</h3>
            <div className="mono xs upper muted">{s.town} · {s.members} members</div>
          </div>
        ))}
      </div>
    </div>
  )
}
