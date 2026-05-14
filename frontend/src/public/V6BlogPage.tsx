import { useNavigate } from 'react-router-dom'

const BLOG_POSTS = [
  { slug: 'what-is-aq', title: 'So what IS AquaTerra?', excerpt: 'It started in 2021 with three kids and a leaky aquarium.', author: 'Sarah Director', date: 'Apr 12' },
  { slug: 'summit-2026', title: 'Spring Summit 2026 — recap', excerpt: 'Two days, 14 schools, one giant whiteboard wall.', author: 'Diego Lopez', date: 'Apr 02' },
  { slug: 'join-us', title: "How to join (it's easy)", excerpt: 'Step 1: have a thought. Step 2: tell us. Step 3: ship.', author: 'Maya Patel', date: 'Mar 18' },
]

export default function V6BlogPage() {
  const navigate = useNavigate()
  return (
    <div className="route-enter container" style={{ padding: '32px 24px 80px' }}>
      <h1 className="h-display" style={{ fontSize: 80, margin: 0, lineHeight: 0.9 }}>
        the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--pink)' }}>blog</span>.
      </h1>
      <p style={{ fontSize: 18, marginTop: 8, color: 'var(--ink-2)' }}>longer writes. recaps. essays. the occasional rant.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 32 }}>
        {BLOG_POSTS.map((b, i) => (
          <div key={b.slug} className="card card-hover" style={{ padding: 0, overflow: 'hidden', transform: `rotate(${i % 2 ? 1 : -0.5}deg)`, cursor: 'pointer' }}
            onClick={() => navigate('/blog/' + b.slug)}>
            <div style={{ background: ['var(--mint)', 'var(--lemon)', 'var(--pink)'][i], padding: 36, color: '#0A0A0A', borderBottom: '2px solid var(--ink)' }}>
              <div className="mono xs upper" style={{ fontWeight: 700 }}>★ ESSAY · {b.date}</div>
              <div className="h-display" style={{ fontSize: 32, marginTop: 8, lineHeight: 1 }}>{b.title}</div>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>{b.excerpt}</p>
              <div className="mono xs upper muted" style={{ marginTop: 14, fontWeight: 700 }}>by {b.author}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
