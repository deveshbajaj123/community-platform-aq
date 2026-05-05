import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Post } from '../services/api'
import feedService from '../services/feedService'
import PostCard from './PostCard'
import CreatePostModal from './CreatePostModal'
import { DEPT_COLORS } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

const DEPT_FILTERS = [
  { k: '', label: 'All', color: DEPT_COLORS.all },
  { k: 'welfare', label: 'Welfare', color: DEPT_COLORS.welfare },
  { k: 'events', label: 'Events', color: DEPT_COLORS.events },
  { k: 'labs', label: 'Labs', color: DEPT_COLORS.labs },
  { k: 'operations', label: 'Ops', color: DEPT_COLORS.ops },
  { k: 'content', label: 'Content', color: DEPT_COLORS.content },
]

const FeedPage = () => {
  const { member } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fetchPosts = useCallback(async (pageNum: number, cat: string, append = false) => {
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)
    try {
      const result = await feedService.getFeed({ page: pageNum, limit: 20, category: cat || undefined })
      if (result.success) {
        if (append) setPosts(prev => [...prev, ...result.data])
        else setPosts(result.data)
        setHasMore(result.pagination.hasNextPage)
      } else if (!append) {
        setPosts([])
        setHasMore(false)
      }
    } catch {
      if (!append) { setPosts([]); setHasMore(false) }
    }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }, [])

  useEffect(() => { setPage(1); fetchPosts(1, category) }, [category, fetchPosts])

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchPosts(p, category, true) }
  const handlePostCreated = () => { setPage(1); fetchPosts(1, category) }
  const handlePostDelete = (postId: number) => setPosts(prev => prev.filter(p => p.postId !== postId))

  // Tap active filter again → scroll to top + refresh
  const handleFilterClick = (k: string) => {
    if (k === category) { window.scrollTo({ top: 0, behavior: 'smooth' }); fetchPosts(1, k) }
    else setCategory(k)
  }

  const trendingPosts = [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 3)

  return (
    <div className="aq-page">
      <div className="aq-feed-layout">
        {/* Left sidebar */}
        <aside className="aq-feed-left">
          {/* AQ Stats */}
          <div className="sb-sec">
            <span className="sb-lbl">AquaTerra</span>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {[['1.1K+', 'Members'], ['534+', 'Projects'], ['4', 'Years']].map(([n, l]) => (
                <div key={l}>
                  <div className="sb-n">{n}</div>
                  <div className="sb-nl">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dept filters */}
          {DEPT_FILTERS.map(f => (
            <button
              key={f.k}
              onClick={() => handleFilterClick(f.k)}
              className={`sb-row${category === f.k ? ' on' : ''}`}
              aria-pressed={category === f.k}
              style={{ width: '100%', textAlign: 'left', border: 'none', fontFamily: 'var(--f)' }}
            >
              <span className="cdot" style={{ background: f.color || 'var(--ink-4)' }} />
              <span className="sb-rl">{f.label}</span>
            </button>
          ))}

          {/* Quick links */}
          <div className="sb-sec" style={{ borderBottom: 'none' }}>
            <span className="sb-lbl">Explore</span>
            {[['Everything We Do →', '/everything-we-do'], ['534+ Projects →', '/projects'], ['Blog →', '/blog'], ['About AQ →', '/about']].map(([l, p]) => (
              <Link key={p} to={p} className="sb-link">{l}</Link>
            ))}
          </div>
        </aside>

        {/* Main feed */}
        <main className="aq-feed-main">
          {/* Compose bar */}
          <div className="compose-bar">
            {/* Mini avatar */}
            <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 13, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
              {member?.avatarUrl
                ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : (member?.fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
              }
            </div>
            <button className="aq-compose-pill" onClick={() => setShowCreateModal(true)}>
              What's your team been up to?
            </button>
            <button className="aq-btn aq-btn-accent aq-btn-sm" onClick={() => setShowCreateModal(true)}>Post</button>
          </div>

          {/* Filter chips */}
          <div className="chip-row">
            {DEPT_FILTERS.map(f => (
              <button key={f.k} onClick={() => handleFilterClick(f.k)} aria-pressed={category === f.k} className={`aq-chip ${category === f.k ? 'on' : ''}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {isLoading ? (
            <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div className="aq-spinner" />
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING FEED</span>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)', marginBottom: 20 }}>
                No posts in this category yet.
              </p>
              <button className="aq-btn aq-btn-accent aq-btn-sm" onClick={() => setShowCreateModal(true)}>
                Be the first to post →
              </button>
            </div>
          ) : (
            <div className="post-feed">
              {posts.map(post => (
                <PostCard key={post.postId} post={post} onDelete={handlePostDelete} />
              ))}
              {hasMore && (
                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                  <button
                    onClick={handleLoadMore}
                    className="aq-btn aq-btn-ghost aq-btn-sm"
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : 'Load more →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right sidebar */}
        <aside className="aq-feed-right">
          <div className="wgt">
            <div className="wgt-hd"><span className="sb-lbl" style={{ margin: 0 }}>Trending</span></div>
            {trendingPosts.length === 0
              ? <div className="wgt-row" style={{ color: 'var(--txt-4)', fontFamily: 'var(--fm)', fontSize: 11 }}>Nothing yet</div>
              : trendingPosts.map(p => (
                <Link key={p.postId} to={`/post/${p.uuid}`} className="wgt-row" style={{ textDecoration: 'none' }}>
                  <div className="wgt-title">{p.body?.slice(0, 80)}</div>
                  <div className="wgt-meta">♡ {p.likeCount || 0} · <span style={{ color: `var(--c-${p.category})` }}>{p.category}</span></div>
                </Link>
              ))
            }
          </div>
          <div className="wgt">
            <div className="wgt-hd"><span className="sb-lbl" style={{ margin: 0 }}>Open Roles</span></div>
            <Link to="/everything-we-do" className="wgt-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>Welfare Volunteer</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--c-welfare)', marginTop: 2 }}>WELFARE</div>
            </Link>
            <Link to="/everything-we-do" className="wgt-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 600, fontSize: 12.5 }}>Content Writer</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--c-content)', marginTop: 2 }}>CONTENT</div>
            </Link>
          </div>
          <div className="wgt" style={{ borderBottom: 'none' }}>
            <div className="wgt-hd"><span className="sb-lbl" style={{ margin: 0 }}>Quick links</span></div>
            {[['534+ Projects →', '/projects'], ['Groundwork Diaries →', '/blog'], ['Support AQ →', '/support'], ['About AQ →', '/about']].map(([l, p]) => (
              <Link key={p} to={p} className="wgt-row">{l}</Link>
            ))}
          </div>
        </aside>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          className="aq-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default FeedPage
