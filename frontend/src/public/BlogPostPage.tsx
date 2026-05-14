import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Blog, relativeDate } from '../lib/supabase'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [blog, setBlog] = useState<Blog | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase
      .from('blogs')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setBlog(data)
        setLoading(false)
      })
  }, [slug])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="mono xs upper muted" style={{ letterSpacing: '0.06em' }}>LOADING...</div>
      </div>
    )
  }

  if (notFound || !blog) {
    return (
      <div className="route-enter container" style={{ textAlign: 'center', padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)' }}>
        <h1 className="h-display" style={{ fontSize: 40, marginBottom: 16 }}>Post not found.</h1>
        <Link to="/blog" className="btn">← All Posts</Link>
      </div>
    )
  }

  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ background: 'var(--bg-2)', padding: 'clamp(40px, 8vw, 100px) var(--page-px,24px) 48px', borderBottom: '2px solid var(--ink)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link to="/blog" className="mono xs upper muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32, fontWeight: 700, color: 'var(--ink-3)', textDecoration: 'none' }}>
            ← Groundwork Diaries
          </Link>
          <h1 className="h-display" style={{ fontSize: 'clamp(28px, 5vw, 52px)', lineHeight: 1.0, marginBottom: 24 }}>
            {blog.headliner}
          </h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {blog.written_by && (
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-2)' }}>
                by {blog.written_by}
              </span>
            )}
            {blog.published_date && (
              <span className="mono xs muted">{relativeDate(blog.published_date)}</span>
            )}
            {blog.minutes_of_read && (
              <span className="mono xs muted">{blog.minutes_of_read} min read</span>
            )}
          </div>
        </div>
      </section>

      {/* Featured image */}
      {blog.featured_image && (
        <div style={{ width: '100%', maxHeight: 520, overflow: 'hidden', borderBottom: '2px solid var(--ink)' }}>
          <img src={blog.featured_image} alt={blog.featured_image_alt || blog.headliner}
            style={{ width: '100%', objectFit: 'cover', maxHeight: 520 }}
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)' }}>
        {blog.body ? (
          <div style={{ fontSize: 17, lineHeight: 1.78, color: 'var(--ink-2)', fontFamily: 'var(--serif)' }}>
            {blog.body.split('\n\n').map((para, i) => {
              if (para.startsWith('## ')) {
                return <h2 key={i} className="h-display" style={{ fontSize: 'clamp(22px,3vw,32px)', margin: '40px 0 16px', color: 'var(--ink)', fontFamily: 'var(--display)' }}>{para.replace('## ', '')}</h2>
              }
              if (para.startsWith('> ')) {
                return (
                  <blockquote key={i} style={{
                    borderLeft: '3px solid var(--mint)', paddingLeft: 20, margin: '24px 0',
                    fontStyle: 'italic', fontSize: 18, color: 'var(--ink-2)',
                  }}>
                    {para.replace('> ', '')}
                  </blockquote>
                )
              }
              return <p key={i} style={{ marginBottom: 20 }}>{para}</p>
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink-2)', marginBottom: 24 }}>
              Full article coming soon.
            </p>
            {blog.author_url && (
              <a href={blog.author_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Read on Instagram →
              </a>
            )}
          </div>
        )}

        <div style={{ borderTop: '2px dashed var(--line-2)', marginTop: 60, paddingTop: 32 }}>
          <Link to="/blog" className="mono xs upper muted" style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--ink-3)' }}>
            ← All posts
          </Link>
        </div>
      </div>
    </div>
  )
}
