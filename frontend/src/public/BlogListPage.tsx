import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Blog, relativeDate } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  useReveal()

  useEffect(() => {
    supabase
      .from('blogs')
      .select('id,slug,headliner,featured_image,featured_image_alt,written_by,published_date,minutes_of_read,body,author_url,author_instagram')
      .order('published_date', { ascending: false })
      .then(({ data }) => {
        if (data) setBlogs(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="aq-page">
      {/* Hero — left aligned, consistent with other pages */}
      <section style={{ position: 'relative', padding: 'clamp(72px, 12vw, 140px) 0 clamp(48px, 8vw, 80px)', overflow: 'hidden' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24 }}>Groundwork Diaries</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>
            Ground<br />work.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            Stories from the ground. Written by the people who were there.
          </p>
        </div>
      </section>

      {/* Blog list — left-aligned, full container width */}
      <div className="aq-wrap" style={{ paddingBottom: 80 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height: 140, borderRadius: 'var(--r-xl)', background: 'var(--surface)', animation: 'aq-pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {blogs.map((b) => {
              /* Always route to internal blog page if slug exists, fallback to author_url only if no slug */
              const href = b.slug ? `/blog/${b.slug}` : (b.author_url || null)
              const isExternal = !b.slug && !!b.author_url
              const isClickable = !!href

              const CardContent = (
                <div style={{ display: 'grid', gridTemplateColumns: b.featured_image ? '1fr 160px' : '1fr', gap: 24, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                      {b.published_date && (
                        <span className="aq-mono" style={{ color: 'var(--txt-4)' }}>{relativeDate(b.published_date)}</span>
                      )}
                      {b.minutes_of_read && (
                        <span className="aq-mono" style={{ color: 'var(--txt-4)' }}>{b.minutes_of_read} min read</span>
                      )}
                    </div>
                    <h2 style={{ fontWeight: 700, fontSize: 'clamp(16px, 2vw, 22px)', lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: 8, color: 'var(--txt)' }}>
                      {b.headliner}
                    </h2>
                    {b.written_by && (
                      <p style={{ fontSize: 13, color: 'var(--txt-3)', marginBottom: 12, fontStyle: 'italic' }}>
                        by {b.written_by}
                      </p>
                    )}
                    {isClickable && (
                      <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Read story
                        <span style={{ display: 'inline-block', transition: 'transform 0.2s var(--ease)' }}>→</span>
                      </span>
                    )}
                  </div>
                  {b.featured_image && (
                    <div style={{ aspectRatio: '4/3', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-2)', flexShrink: 0 }}>
                      <img src={b.featured_image} alt={b.featured_image_alt || b.headliner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  )}
                </div>
              )

              const cardStyle: React.CSSProperties = {
                display: 'block',
                padding: '28px 0',
                borderBottom: '1px solid var(--line)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'opacity 0.12s',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isClickable ? 1 : 0.55,
              }

              if (!isClickable) {
                return <div key={b.id} style={cardStyle}>{CardContent}</div>
              }

              if (isExternal) {
                return (
                  <a key={b.id} href={href!} target="_blank" rel="noopener noreferrer" style={cardStyle}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                  >
                    {CardContent}
                  </a>
                )
              }

              return (
                <Link key={b.id} to={href!} style={cardStyle}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
                >
                  {CardContent}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
