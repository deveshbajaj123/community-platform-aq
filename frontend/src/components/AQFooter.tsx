import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, DEPT_COLORS } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

const DEPTS = [
  { key: 'welfare',    label: 'Welfare' },
  { key: 'events',     label: 'Events' },
  { key: 'labs',       label: 'Labs' },
  { key: 'operations', label: 'Ops' },
  { key: 'content',    label: 'Content' },
]

export default function AQFooter() {
  const { isAuthenticated } = useAuth()
  const [featuredProjects, setFeaturedProjects] = useState<{ slug: string; header: string }[]>([])
  const [blogs, setBlogs] = useState<{ slug: string; headliner: string }[]>([])

  useEffect(() => {
    supabase
      .from('welfare_projects')
      .select('slug, header')
      .eq('featured', true)
      .eq('is_draft', false)
      .limit(6)
      .then(({ data }) => data && setFeaturedProjects(data))

    supabase
      .from('blogs')
      .select('slug, headliner')
      .order('published_date', { ascending: false })
      .limit(5)
      .then(({ data }) => data && setBlogs(data))
  }, [])

  const linkStyle: React.CSSProperties = {
    display: 'block',
    padding: '5px 0',
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.62)',
    textDecoration: 'none',
    transition: 'color 0.12s',
    letterSpacing: '-0.01em',
  }

  return (
    <footer style={{ background: '#0c0c0a', padding: '80px 0 0', marginTop: 80 }}>
      <div className="aq-wrap">

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 56, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.04em', color: '#fff' }}>AquaTerra</span>
            </div>
            <p style={{ fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, maxWidth: 260 }}>
              "Started as an NGO. It got out of hand."
            </p>
          </div>
          <Link
            to={isAuthenticated ? '/feed' : '/volunteer/apply'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontWeight: 600,
              color: 'var(--accent)',
              background: 'rgba(0,163,92,0.12)',
              border: '1px solid rgba(0,163,92,0.28)',
              borderRadius: 100, padding: '12px 22px', minHeight: 40,
              transition: 'background 0.15s, border-color 0.15s, transform 0.12s cubic-bezier(0.2,0,0,1)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = 'rgba(0,163,92,0.22)'
              el.style.borderColor = 'rgba(0,163,92,0.5)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.background = 'rgba(0,163,92,0.12)'
              el.style.borderColor = 'rgba(0,163,92,0.28)'
              el.style.transform = ''
            }}
            onMouseDown={e => ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(0.96)')}
            onMouseUp={e => ((e.currentTarget as HTMLAnchorElement).style.transform = '')}
          >
            {isAuthenticated ? 'Go to feed' : 'Join us'} →
          </Link>
        </div>

        {/* Main grid — 5 columns */}
        <div className="aq-footer-grid">

          {/* Brand column */}
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,0.28)', lineHeight: 2.2, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 20 }}>
              DARPAN CERTIFIED · KOLKATA<br />
              REG: AAFTT2300ME20251<br />
              @ngo.aquaterra · @roots.aquaterra
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEPTS.map(d => {
                const c = DEPT_COLORS[d.key] || 'var(--accent)'
                return (
                  <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: c, opacity: 0.7 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    {d.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Explore */}
          <div>
            <div className="aq-footer-col-head">Explore</div>
            {([
              ['Feed', '/'],
              ['Everything We Do', '/everything-we-do'],
              ['Projects', '/projects'],
              ['Blog', '/blog'],
              ['About', '/about'],
              ['Volunteer', '/volunteer'],
              ['Collaborate', '/collaborations'],
            ] as [string, string][]).map(([label, path]) => (
              <Link key={path} to={path} style={linkStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.62)' }}
              >{label}</Link>
            ))}
          </div>

          {/* Featured Projects */}
          <div>
            <div className="aq-footer-col-head">Featured Projects</div>
            {featuredProjects.map(p => (
              <Link key={p.slug} to={`/projects/${p.slug}`} style={linkStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.62)' }}
              >{p.header}</Link>
            ))}
            <Link to="/projects" style={{ ...linkStyle, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            >All 534+ →</Link>
          </div>

          {/* Groundwork Diaries */}
          <div>
            <div className="aq-footer-col-head">Groundwork Diaries</div>
            {blogs.map(b => (
              <Link key={b.slug} to={`/blog/${b.slug}`} style={linkStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.62)' }}
              >{b.headliner}</Link>
            ))}
            <Link to="/blog" style={{ ...linkStyle, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
            >All posts →</Link>
          </div>

          {/* Quick Links */}
          <div>
            <div className="aq-footer-col-head">Quick Links</div>
            {([
              ['Support AQ', '/support'],
              ['FAQ', '/faq'],
              ['Contact', '/contact'],
              ['Apply to Join', '/volunteer/apply'],
            ] as [string, string][]).map(([label, path]) => (
              <Link key={path} to={path} style={linkStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.62)' }}
              >{label}</Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 56, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {DEPTS.map(d => (
              <div key={d.key} style={{ width: 24, height: 2, borderRadius: 2, background: DEPT_COLORS[d.key] || 'var(--accent)', opacity: 0.5 }} />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            © 2026 AQUATERRA · AQ.TECH
          </span>
        </div>
      </div>
    </footer>
  )
}
