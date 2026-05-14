import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { feedService } from '../services/feedService'
import { Post } from '../services/api'
import { SAMPLE_POSTS, applySampleLikes } from '../data/samplePosts'

// ── Category colour map ──────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  welfare: '#00E5A0', events: '#FF7A1A', labs: '#3DA9FC',
  operations: '#FF6BD6', content: '#FFC700', general: '#7E5BFF',
}
const catColor = (cat?: string) => CAT_COLORS[cat?.toLowerCase() || ''] || 'var(--mint)'

// ── Compact masonry post card ────────────────────────────────────
function MasonryPostCard({ post, delay }: { post: Post; delay: number }) {
  const color = catColor(post.category)
  const body = post.body || ''
  const preview = body.length > 140 ? body.slice(0, 140) + '…' : body
  const initials = (name?: string) => (name || 'AQ').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hasImage = post.images && post.images.length > 0
  const imageUrl = hasImage ? post.images![0].blobUrl : null

  return (
    <div
      style={{
        breakInside: 'avoid',
        marginBottom: 14,
        borderRadius: 18,
        overflow: 'hidden',
        border: '2px solid var(--ink)',
        boxShadow: '3px 3px 0 var(--ink)',
        background: 'var(--card)',
        animation: `masonry-in 0.5s ${delay}s ease both`,
        cursor: 'default',
      }}
    >
      {/* Image — if present */}
      {hasImage && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden' }}>
          <img
            src={imageUrl!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
          {/* gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 50%)',
          }} />
          {/* Category chip on image */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: color, color: '#0A0A0A',
            fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 9px', borderRadius: 999,
            border: '1.5px solid rgba(0,0,0,0.15)',
          }}>
            {post.category || 'general'}
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: color, border: '2px solid var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--display)', fontSize: 11, fontWeight: 800, color: '#0A0A0A',
          }}>
            {initials(post.authorName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {post.authorName || 'AQ Member'}
            </div>
            {post.teamName && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
                {post.teamName}
              </div>
            )}
          </div>
          {/* Category pill — no image variant */}
          {!hasImage && (
            <div style={{
              background: color, color: '#0A0A0A',
              fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              padding: '3px 8px', borderRadius: 999,
              flexShrink: 0,
            }}>
              {post.category || 'general'}
            </div>
          )}
        </div>

        {/* Body preview */}
        {preview && (
          <p style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
            {preview}
          </p>
        )}

        {/* Footer: likes + lock notice */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {post.likeCount > 0 && <span>♥ {post.likeCount}</span>}
          </div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>🔒</span> full access on approval
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton card ────────────────────────────────────────────────
function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div style={{
      breakInside: 'avoid', marginBottom: 14,
      borderRadius: 18, overflow: 'hidden',
      border: '2px solid var(--line)',
      background: 'var(--card)',
      animationDelay: `${delay}s`,
    }}>
      <div className="v6-skeleton" style={{ height: 160, borderRadius: 0 }} />
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="v6-skeleton sk-circle" style={{ width: 30, height: 30 }} />
        <div className="v6-skeleton" style={{ height: 13, width: '60%' }} />
        <div className="v6-skeleton" style={{ height: 11, width: '90%' }} />
        <div className="v6-skeleton" style={{ height: 11, width: '75%' }} />
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────
const PendingApprovalPage = () => {
  const navigate = useNavigate()
  const { member, isAuthenticated, refreshMember, logout } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [cols, setCols] = useState(2)

  // Responsive column count
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 560) setCols(1)
      else if (w < 900) setCols(2)
      else setCols(3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Auto-refresh membership status every 30s
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => { refreshMember() }, 30000)
    return () => clearInterval(interval)
  }, [refreshMember, isAuthenticated])

  // Redirect when approved or rejected
  useEffect(() => {
    if (member?.status === 'active') navigate('/feed', { replace: true })
    else if (member?.status === 'rejected') navigate('/rejected', { replace: true })
  }, [member, navigate])

  // Load feed preview
  useEffect(() => {
    feedService.getFeed({ page: 1, limit: 18 })
      .then(r => {
        if (r.success && r.data.length > 0) setPosts(r.data)
        else setPosts(applySampleLikes(SAMPLE_POSTS) as unknown as Post[])
      })
      .catch(() => setPosts(applySampleLikes(SAMPLE_POSTS) as unknown as Post[]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="route-enter" style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* ── Sticky review banner ── */}
      {!dismissed && (
        <div style={{
          position: 'sticky', top: 'var(--nav-h, 70px)', zIndex: 40,
          background: '#0A0A0A',
          borderBottom: '2px solid var(--mint)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--mint)', flexShrink: 0,
            boxShadow: '0 0 0 0 rgba(0,229,160,0.6)',
            animation: 'pending-pulse 2s ease-in-out infinite',
          }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: '#fff' }}>
              your account is under review
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              an HoD will approve you within 24 hrs · meanwhile, explore what's happening inside AQ
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <span className="sticker sticker-mint" style={{ fontSize: 10, padding: '3px 10px' }}>
              checking status automatically…
            </span>
            <button
              onClick={() => setDismissed(true)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}
              aria-label="Dismiss banner"
            >✕</button>
          </div>
        </div>
      )}

      {dismissed && (
        <button
          onClick={() => setDismissed(false)}
          style={{
            position: 'sticky', top: 'var(--nav-h, 70px)', zIndex: 40,
            width: '100%', background: '#0A0A0A', border: 'none',
            borderBottom: '1px solid var(--mint)',
            padding: '8px 20px', cursor: 'pointer',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mint)',
            textAlign: 'left',
          }}
        >● account under review — tap to see details</button>
      )}

      {/* ── Feed preview header ── */}
      <div style={{ padding: 'clamp(28px, 4vw, 48px) clamp(16px, 4vw, 32px) 0', maxWidth: 1200, margin: '0 auto' }}>
        <div className="h-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 0.95, marginBottom: 8 }}>
          meanwhile, here's
          <br />
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', color: 'var(--mint)', fontWeight: 400 }}>what's happening</span>
          <span>.</span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 28 }}>
          live AQ community feed — full access once you're approved.
        </p>
      </div>

      {/* ── MASONRY GRID ── */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 clamp(16px, 4vw, 32px) 48px',
      }}>
        {loading ? (
          <div style={{ columnCount: cols, columnGap: 14 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} delay={i * 0.06} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            <div className="h-display" style={{ fontSize: 28 }}>stay tuned.</div>
            <p className="muted">posts will start appearing here soon.</p>
          </div>
        ) : (
          <div style={{ columnCount: cols, columnGap: 14 }}>
            {posts.map((post, i) => (
              <MasonryPostCard key={post.uuid || i} post={post} delay={i * 0.06} />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ padding: '0 clamp(16px, 4vw, 32px) 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          background: '#0A0A0A', borderRadius: 18,
          border: '2px solid var(--mint)',
          padding: 'clamp(24px, 4vw, 36px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div className="h-display" style={{ fontSize: 22, color: '#fff' }}>
              not you? <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', color: 'var(--mint)' }}>that's fine.</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              wrong account? log out and try again.
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="btn btn-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)', flexShrink: 0 }}
          >
            log out & start over
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pending-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,229,160,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(0,229,160,0); }
        }
        @keyframes masonry-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default PendingApprovalPage
