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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--txt-3)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
        LOADING...
      </div>
    )
  }

  if (notFound || !blog) {
    return (
      <div className="aq-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h1 className="aq-title" style={{ marginBottom: 16 }}>Post not found.</h1>
        <Link to="/blog" className="aq-btn aq-btn-outline">← All Posts</Link>
      </div>
    )
  }

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ background: 'var(--bg-2)', padding: 'clamp(60px, 10vw, 100px) 0 48px', borderBottom: '1px solid var(--line)' }}>
        <div className="aq-wrap-sm">
          <Link to="/blog" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
            ← Groundwork Diaries
          </Link>
          <h1 className="aq-title" style={{ fontSize: 'clamp(24px, 4vw, 48px)', lineHeight: 1.0, marginBottom: 24 }}>
            {blog.headliner}
          </h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {blog.written_by && (
              <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--txt-2)' }}>
                by {blog.written_by}
              </span>
            )}
            {blog.published_date && (
              <span className="aq-mono" style={{ color: 'var(--txt-4)' }}>{relativeDate(blog.published_date)}</span>
            )}
            {blog.minutes_of_read && (
              <span className="aq-mono" style={{ color: 'var(--txt-4)' }}>{blog.minutes_of_read} min read</span>
            )}
          </div>
        </div>
      </section>

      {/* Featured image */}
      {blog.featured_image && (
        <div style={{ width: '100%', maxHeight: 520, overflow: 'hidden' }}>
          <img src={blog.featured_image} alt={blog.featured_image_alt || blog.headliner} style={{ width: '100%', objectFit: 'cover', maxHeight: 520 }} />
        </div>
      )}

      {/* Content */}
      <div className="aq-wrap-sm" style={{ padding: '60px 40px 80px' }}>
        {blog.body ? (
          <div className="aq-prose">
            {blog.body.split('\n\n').map((para, i) => {
              if (para.startsWith('## ')) {
                return <h2 key={i}>{para.replace('## ', '')}</h2>
              }
              if (para.startsWith('> ')) {
                return <blockquote key={i}>{para.replace('> ', '')}</blockquote>
              }
              return <p key={i}>{para}</p>
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 20, color: 'var(--txt-2)', marginBottom: 24 }}>
              Full article coming soon.
            </p>
            {blog.author_url && (
              <a href={blog.author_url} target="_blank" rel="noopener noreferrer" className="aq-btn aq-btn-ink">
                Read on Instagram →
              </a>
            )}
            {blog.author_instagram && (
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', marginTop: 16 }}>
                {blog.author_instagram}
              </p>
            )}
          </div>
        )}

        <hr className="aq-hr" style={{ marginTop: 60, marginBottom: 32 }} />
        <Link to="/blog" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>
          ← All posts
        </Link>
      </div>
    </div>
  )
}
