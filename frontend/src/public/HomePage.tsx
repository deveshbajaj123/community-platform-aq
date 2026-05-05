import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { feedService } from '../services/feedService'
import { supabase, DEPT_COLORS, type WelfareProject } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'
import { toggleSampleLike, type SamplePost } from '../data/samplePosts'

const DEPT_FILTERS = [
  { k: 'all',        label: 'All',     color: DEPT_COLORS.all },
  { k: 'welfare',    label: 'Welfare', color: DEPT_COLORS.welfare },
  { k: 'events',     label: 'Events',  color: DEPT_COLORS.events },
  { k: 'labs',       label: 'Labs',    color: DEPT_COLORS.labs },
  { k: 'operations', label: 'Ops',     color: DEPT_COLORS.ops },
  { k: 'content',    label: 'Content', color: DEPT_COLORS.content },
]

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function SamplePostCard({ post: initialPost }: { post: SamplePost }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [post, setPost] = useState(initialPost)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  const catColor = (DEPT_COLORS as Record<string, string>)[post.category] || DEPT_COLORS.all
  const initials = (post.authorName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)

  const handleLike = async () => {
    if (isLiking) return
    if (!isAuthenticated) { navigate('/login'); return }
    setIsLiking(true)
    try {
      const result = await feedService.toggleLike(post.uuid)
      if (result.success) {
        setPost(p => ({ ...p, isLiked: result.data.liked, likeCount: result.data.likeCount }))
      }
    } catch {
      const updated = toggleSampleLike(post.uuid, post.likeCount, post.isLiked)
      setPost(p => ({ ...p, isLiked: updated.liked, likeCount: updated.count }))
    }
    setIsLiking(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.uuid}`
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('input'); el.value = url
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <article className="aq-post-card">
      <div className="post-cat-rule" style={{ background: catColor }} />
      <div className="post-in">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <Link to={`/member/${post.authorUuid}`} style={{ flexShrink: 0 }}>
            <div className="aq-avatar" style={{ width: 40, height: 40, fontSize: 13, background: catColor, color: '#0c0c0a' }}>
              {initials}
            </div>
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Link to={`/member/${post.authorUuid}`} style={{ color: 'inherit', transition: 'color 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt)')}
              >{post.authorName}</Link>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
              {post.authorSchool && <span style={{ fontSize: 10, color: 'var(--txt-3)' }}>{post.authorSchool}</span>}
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: catColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{post.category}</span>
            </div>
            <div className="aq-mono" style={{ color: 'var(--txt-4)', marginTop: 3 }}>{timeAgo(post.createdAt)}</div>
          </div>
        </div>

        <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--txt)', marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {post.body}
        </p>

        {post.images && post.images.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {post.images.length === 1 ? (
              <div style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                <img src={post.images[0].blobUrl} alt="" style={{ width: '100%', maxHeight: 480, objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="aq-post-card-img-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {post.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img.blobUrl} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="aq-post-card-actions">
          <button onClick={handleLike} disabled={isLiking} className={`aq-post-action ${post.isLiked ? 'liked' : ''}`} aria-label={post.isLiked ? 'Unlike' : 'Like'}>
            {post.isLiked ? '♥' : '♡'}
          </button>
          <button className="aq-post-action">
            <span className="tabular-nums">{post.likeCount}</span> {post.likeCount === 1 ? 'like' : 'likes'}
          </button>
          <button onClick={handleShare} className="aq-post-action" style={{ marginLeft: 'auto', color: linkCopied ? 'var(--accent)' : undefined }} title="Copy link">
            {linkCopied ? '✓ Copied' : '↗ Share'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState<SamplePost[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<WelfareProject[]>([])
  useReveal()

  const loadPosts = useCallback(async (cat: string) => {
    setLoading(true)
    try {
      const r = await feedService.getFeed({ page: 1, limit: 20, category: cat === 'all' ? undefined : cat })
      if (r.success && Array.isArray(r.data)) {
        setPosts((r.data as any[]).map((p: any) => ({
          postId: p.postId, uuid: p.uuid,
          body: p.body, authorName: p.authorName, authorUuid: p.authorUuid,
          authorAvatar: p.authorAvatar, authorSchool: p.authorSchool, category: p.category,
          likeCount: p.likeCount || 0, isLiked: p.isLiked || false,
          createdAt: p.createdAt, images: p.images, status: p.status,
        })))
      } else {
        setPosts([])
      }
    } catch {
      setPosts([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadPosts(filter) }, [filter, loadPosts])

  useEffect(() => {
    supabase
      .from('welfare_projects')
      .select('id,slug,header,featured,workshop_date')
      .eq('is_draft', false)
      .order('workshop_date', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setProjects(data as any) })
  }, [])

  const trending = [...posts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5)

  return (
    <div className="aq-page">
      <div className="aq-home-layout">

        {/* ── Main feed ── */}
        <main className="aq-feed-main">
          {!isAuthenticated && (
            <div className="aq-feed-hero">
              <div className="aq-feed-hero-grid" />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'clamp(22px, 3.5vw, 44px)', lineHeight: 0.92, letterSpacing: '-0.04em', textTransform: 'uppercase', marginBottom: 14 }}>
                  <span style={{ display: 'block', color: 'var(--txt-3)', fontSize: '0.45em', marginBottom: 6, lineHeight: 1 }}>Inside</span>
                  <span style={{ color: 'var(--accent)' }}>AquaTerra</span>
                </div>
                <p style={{ fontStyle: 'italic', fontSize: 15, color: 'var(--txt-2)', maxWidth: 380, lineHeight: 1.55, marginBottom: 18 }}>
                  The internal activity wall. 1,100+ members across Kolkata's schools — one feed.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link to="/login" className="aq-btn aq-btn-ink aq-btn-sm">Log in to post</Link>
                  <Link to="/about" className="aq-btn aq-btn-outline aq-btn-sm">What is AQ? →</Link>
                </div>
              </div>
            </div>
          )}

          {/* Filter chips */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6 }} className="aq-scroll-x">
            {DEPT_FILTERS.map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)} className={`aq-chip ${filter === f.k ? 'on' : ''}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '16px 0' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ margin: '0 0 8px', height: 160, borderRadius: 'var(--r-md)', background: 'var(--surface)', animation: 'aq-pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>No posts in this category yet.</p>
            </div>
          ) : (
            posts.map(post => <SamplePostCard key={post.uuid} post={post} />)
          )}
        </main>

        {/* ── Right sidebar — sticky within viewport ── */}
        <aside className="aq-home-right">
          {/* Trending in AQ */}
          <div className="aq-sidebar-widget">
            <div className="aq-sidebar-widget-head">
              <span className="aq-label">Trending in AQ</span>
            </div>
            {trending.length === 0
              ? <div className="aq-sidebar-row" style={{ color: 'var(--txt-4)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>Nothing yet</div>
              : trending.map(p => {
                  const col = (DEPT_COLORS as Record<string, string>)[p.category] || DEPT_COLORS.all
                  return (
                    <Link key={p.uuid} to={`/member/${p.authorUuid}`} className="aq-sidebar-row" style={{ textDecoration: 'none' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.4, color: 'var(--txt)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {p.body?.slice(0, 70)}…
                      </div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 4, display: 'flex', gap: 8 }}>
                        <span style={{ color: col }}>{p.category}</span>
                        <span className="tabular-nums">♥ {p.likeCount}</span>
                      </div>
                    </Link>
                  )
                })
            }
          </div>

          {/* Project Sets */}
          <div className="aq-sidebar-widget">
            <div className="aq-sidebar-widget-head">
              <span className="aq-label">Project Sets</span>
            </div>
            {projects.length === 0
              ? <div className="aq-sidebar-row" style={{ color: 'var(--txt-4)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>No projects</div>
              : projects.map((p, i) => (
                  <Link key={p.slug} to={`/projects/${p.slug}`} className="aq-sidebar-row" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tabular-nums" style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--txt-4)', minWidth: 20 }}>#{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--txt)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {p.header}
                      </div>
                    </div>
                  </Link>
                ))
            }
            <Link to="/projects" className="aq-sidebar-row" style={{ textDecoration: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>
              All 534+ projects →
            </Link>
          </div>

          {/* Quick Links */}
          <div className="aq-sidebar-widget">
            <div className="aq-sidebar-widget-head"><span className="aq-label">Quick Links</span></div>
            {[
              ['Groundwork Diaries', '/blog'],
              ['Support AQ', '/support'],
              ['Volunteer', '/volunteer'],
              ['Collaborations', '/collaborations'],
              ['FAQ', '/faq'],
            ].map(([l, p]) => (
              <Link key={p} to={p} className="aq-sidebar-row" style={{ textDecoration: 'none' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--txt-2)' }}>{l} →</div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
