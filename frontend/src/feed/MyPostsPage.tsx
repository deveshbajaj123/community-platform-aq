import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabaseCommunity } from '../lib/supabaseCommunity'

type Post = {
  post_id: number
  uuid: string
  author_id: number
  category: string
  body: string
  status: string
  rejection_note: string | null
  created_at: string
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') {
    return (
      <span className="chip" style={{ background: 'var(--mint)', color: '#0A0A0A', fontWeight: 700, fontSize: 11 }}>
        ✓ published
      </span>
    )
  }
  if (status === 'pending_approval') {
    return (
      <span className="chip" style={{ background: 'var(--lemon)', color: '#0A0A0A', fontWeight: 700, fontSize: 11 }}>
        ⏳ in review
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="chip" style={{ background: '#FF4D2E', color: '#fff', fontWeight: 700, fontSize: 11 }}>
        ✕ rejected
      </span>
    )
  }
  return (
    <span className="chip" style={{ background: 'var(--bg-2)', color: 'var(--ink-3)', fontWeight: 600, fontSize: 11 }}>
      {status}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="v6-skeleton" style={{ width: '60%', height: 14, borderRadius: 6 }} />
        <div className="v6-skeleton sk-pill" style={{ width: 72, height: 22, borderRadius: 20 }} />
      </div>
      <div className="v6-skeleton" style={{ width: '90%', height: 12, borderRadius: 6 }} />
      <div className="v6-skeleton" style={{ width: '75%', height: 12, borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <div className="v6-skeleton sk-pill" style={{ width: 60, height: 20, borderRadius: 20 }} />
        <div className="v6-skeleton" style={{ width: 80, height: 12, borderRadius: 6, marginTop: 4 }} />
      </div>
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MyPostsPage() {
  const { member } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    if (!member) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabaseCommunity
        .from('posts')
        .select('*')
        .eq('author_id', member.member_id)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setPosts(data ?? [])
    } catch (err) {
      console.error('MyPostsPage fetch error:', err)
      setError("couldn't load your posts.")
    } finally {
      setIsLoading(false)
    }
  }, [member])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(28px, 4vw, 48px)', paddingBottom: 80 }}>
      <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: 6 }}>my posts.</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 28, fontSize: 15, lineHeight: 1.5 }}>
        your activity and moderation status
      </p>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {!isLoading && error && (
        <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-2)', marginBottom: 16, fontSize: 15 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchPosts}>
            try again
          </button>
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 1, marginBottom: 12 }}>
            nothing here yet.
          </div>
          <p style={{ color: 'var(--ink-2)', marginBottom: 24, fontSize: 15 }}>
            you haven't posted anything yet.
          </p>
          <Link to="/feed" className="btn btn-primary btn-lg">
            create a post →
          </Link>
        </div>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => (
            <Link
              key={post.post_id}
              to={`/post/${post.uuid}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card card-hover" style={{ padding: '18px 20px' }}>
                {/* Top row: body preview + status badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <p style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'var(--ink)',
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {post.body.slice(0, 100)}{post.body.length > 100 ? '…' : ''}
                  </p>
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={post.status} />
                  </div>
                </div>

                {/* Meta row: category chip + date */}
                <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="chip" style={{ fontSize: 11, background: 'var(--bg-2)', color: 'var(--ink-2)' }}>
                    {post.category}
                  </span>
                  <span className="mono xs muted">
                    {formatDate(post.created_at)}
                  </span>
                </div>

                {/* Rejection note */}
                {post.status === 'rejected' && post.rejection_note && (
                  <div style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: 'rgba(255,77,46,0.07)',
                    borderLeft: '3px solid #FF4D2E',
                    borderRadius: '0 6px 6px 0',
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: 'var(--ink-2)',
                      lineHeight: 1.5,
                    }}>
                      {post.rejection_note}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
