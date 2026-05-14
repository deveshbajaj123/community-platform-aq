import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Blog, relativeDate } from '../lib/supabase'

const CARD_COLORS = ['var(--mint)', 'var(--lemon)', 'var(--pink)', 'var(--sky)', 'var(--mint)', 'var(--lemon)']

function BlogCard({ b, index }: { b: Blog; index: number }) {
  const href = b.slug ? `/blog/${b.slug}` : (b.author_url || null)
  const isExternal = !b.slug && !!b.author_url
  const rot = index % 2 ? 0.8 : -0.8
  const color = CARD_COLORS[index % CARD_COLORS.length]

  const inner = (
    <div className="card card-hover" style={{ padding: 0, overflow: 'hidden', transform: `rotate(${rot}deg)`, cursor: href ? 'pointer' : 'default', opacity: href ? 1 : 0.55 }}>
      {b.featured_image && (
        <div style={{ height: 180, overflow: 'hidden', borderBottom: '2px solid var(--ink)' }}>
          <img src={b.featured_image} alt={b.featured_image_alt || b.headliner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        </div>
      )}
      {!b.featured_image && (
        <div style={{ background: color, padding: '28px 24px 20px', borderBottom: '2px solid var(--ink)', color: '#0A0A0A', position: 'relative' }}>
          <div className="mono xs upper" style={{ fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>
            ★ {b.published_date ? relativeDate(b.published_date) : 'essay'}
            {b.minutes_of_read && ` · ${b.minutes_of_read} min read`}
          </div>
          <div className="h-display" style={{ fontSize: 'clamp(22px, 3vw, 32px)', lineHeight: 1.05 }}>{b.headliner}</div>
        </div>
      )}
      <div style={{ padding: 18 }}>
        {b.featured_image && (
          <h2 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 20, lineHeight: 1.1, margin: '0 0 8px', color: 'var(--ink)' }}>{b.headliner}</h2>
        )}
        {b.written_by && (
          <div className="mono xs upper muted" style={{ fontWeight: 700 }}>by {b.written_by}</div>
        )}
        {b.featured_image && b.published_date && (
          <div className="mono xs muted" style={{ marginTop: 4 }}>{relativeDate(b.published_date)}</div>
        )}
        {href && (
          <div style={{ marginTop: 12 }}>
            <span className="mono xs upper" style={{ fontWeight: 700, color: 'var(--mint)' }}>
              read {isExternal ? '↗' : '→'}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (!href) return <div key={b.id}>{inner}</div>
  if (isExternal) return <a key={b.id} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
  return <Link key={b.id} to={href} style={{ textDecoration: 'none' }}>{inner}</Link>
}

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('blogs')
      .select('id,slug,headliner,featured_image,featured_image_alt,written_by,published_date,minutes_of_read,body,author_url,author_instagram')
      .order('published_date', { ascending: false })
      .then(({ data }) => { if (data) setBlogs(data); setLoading(false) })
  }, [])

  return (
    <div className="route-enter container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)' }}>
      <span className="sticker sticker-mint wobble">★ groundwork diaries</span>
      <h1 className="h-display" style={{ fontSize: 'clamp(60px, 9vw, 96px)', margin: '12px 0 8px', lineHeight: 0.9 }}>
        the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--pink)' }}>blog</span>.
      </h1>
      <p style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 40 }}>stories from the ground. written by the people who were there.</p>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="card" style={{ height: 280, background: 'var(--bg-2)', animation: 'aq-pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>nothing here yet.</div>
          <p className="muted" style={{ marginTop: 8 }}>the first post is coming. check back soon.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
          {blogs.map((b, i) => <BlogCard key={b.id} b={b} index={i} />)}
        </div>
      )}
    </div>
  )
}
