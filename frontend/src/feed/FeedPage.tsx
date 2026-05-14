import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Post } from '../services/api'
import feedService from '../services/feedService'
import PostCard from './PostCard'
import CreatePostModal from './CreatePostModal'
import { DEPT_COLORS } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { jobOpenings, CAT_COLORS } from '../lib/jobOpenings'
import { useToast } from '../components/Toast'

const DEPT_FILTERS = [
  { k: '', label: 'All', color: DEPT_COLORS.all },
  { k: 'welfare', label: 'Welfare', color: DEPT_COLORS.welfare },
  { k: 'events', label: 'Events', color: DEPT_COLORS.events },
  { k: 'labs', label: 'Labs', color: DEPT_COLORS.labs },
  { k: 'operations', label: 'Ops', color: DEPT_COLORS.ops },
  { k: 'content', label: 'Content', color: DEPT_COLORS.content },
]

function FeedPostSkeleton() {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="v6-skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="v6-skeleton" style={{ width: '50%', height: 14, marginBottom: 6 }} />
          <div className="v6-skeleton" style={{ width: '35%', height: 11 }} />
        </div>
      </div>
      <div style={{ margin: '0 16px', borderRadius: 14, overflow: 'hidden' }}>
        <div className="v6-skeleton" style={{ width: '100%', height: 140 }} />
      </div>
      <div style={{ padding: '14px 18px 4px' }}>
        <div className="v6-skeleton" style={{ width: '85%', height: 18, marginBottom: 8 }} />
        <div className="v6-skeleton" style={{ width: '100%', height: 13, marginBottom: 4 }} />
        <div className="v6-skeleton" style={{ width: '70%', height: 13 }} />
      </div>
      <div style={{ height: 40 }} />
    </div>
  )
}

// ── Opening card rendered inline in the feed ──────────────────────
function OpeningCard({ op }: { op: any }) {
  const accent = CAT_COLORS[op.category] || 'var(--mint)'
  const skills: string[] = op.skills || []
  const { member, isAuthenticated } = useAuth()
  const { success, error: toastError } = useToast()
  const [showApply, setShowApply] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!member || !op.id) return
    jobOpenings.hasApplied(op.id, member.member_id)
      .then(has => { if (has) setApplied(true) })
      .catch(() => {})
  }, [member, op.id])

  const handleApply = async () => {
    if (!member || applying) return
    setApplying(true)
    const result = await jobOpenings.apply(op.id, member.member_id, member.full_name || '', member.email || '', applyMsg)
    if (result.alreadyApplied) {
      setApplied(true); setShowApply(false)
      toastError('You already applied for this role.')
    } else if (result.success) {
      setApplied(true); setShowApply(false)
      success('Application sent!', 'The team will review and get back to you.')
    } else {
      toastError(result.error || 'Failed to apply. Try again.')
    }
    setApplying(false)
  }

  return (
    <div className="feed-card" style={{ cursor: 'default' }}>
      {/* Header */}
      <div className="feed-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div className="avatar" style={{ background: accent, width: 38, height: 38, fontSize: 13, flexShrink: 0, color: '#0A0A0A', fontFamily: 'var(--display)', fontWeight: 900 }}>
            {(op.teamName || op.category || 'AQ').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>{op.teamName || 'AquaTerra'}</div>
            <div className="mono xs muted" style={{ marginTop: 2 }}>open role</div>
          </div>
        </div>
        <span className="chip" style={{ background: accent + '22', color: accent, border: `1.5px solid ${accent}44`, fontSize: 11 }}>
          {op.category}
        </span>
      </div>

      {/* Body */}
      <div className="feed-card-body">
        <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 20, lineHeight: 1.1, marginBottom: 8, color: 'var(--ink)' }}>
          {op.title}
        </div>
        {op.description && (
          <p style={{ fontFamily: 'var(--eina)', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>
            {op.description}
          </p>
        )}
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {skills.map((s: string) => (
              <span key={s} className="chip" style={{ fontSize: 11, background: 'var(--bg-2)' }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="feed-card-foot" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className="mono xs muted">
          {op.commitment && <span>⏱ {op.commitment}</span>}
          {op.deadline && <span style={{ marginLeft: op.commitment ? 12 : 0 }}>
            📅 closes {new Date(op.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip" style={{ background: 'var(--mint)', color: '#0A0A0A', fontSize: 11, fontWeight: 700 }}>● Open</span>
          {isAuthenticated && (
            applied
              ? <span className="chip" style={{ background: 'var(--bg-2)', fontSize: 11, fontWeight: 700, color: 'var(--mint)' }}>✓ applied</span>
              : <button
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: 12, padding: '4px 14px' }}
                  onClick={e => { e.stopPropagation(); setShowApply(v => !v) }}
                >
                  Apply →
                </button>
          )}
        </div>
      </div>

      {showApply && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px dashed var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}
          onClick={e => e.stopPropagation()}>
          <label style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
            Why are you a good fit? <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea className="textarea" rows={3} placeholder="Tell the team about yourself and what you bring…"
            value={applyMsg} onChange={e => setApplyMsg(e.target.value)}
            style={{ fontFamily: 'var(--eina)', fontSize: 13, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={() => setShowApply(false)} disabled={applying}>cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleApply} disabled={applying}>
              {applying ? 'sending…' : 'send application →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const FeedPage = () => {
  const { member } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Openings inline view
  const [showOpenings, setShowOpenings] = useState(false)
  const [openingsList, setOpeningsList] = useState<any[]>([])
  const [openingsLoading, setOpeningsLoading] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fetchPosts = useCallback(async (pageNum: number, cat: string, append = false) => {
    if (append) setIsLoadingMore(true)
    else { setIsLoading(true); setFeedError(null) }
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
    } catch (err: any) {
      if (!append) {
        setPosts([])
        setHasMore(false)
        setFeedError(err?.message || 'Failed to load posts')
      }
    }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }, [])

  useEffect(() => { setPage(1); fetchPosts(1, category) }, [category, fetchPosts])

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchPosts(p, category, true) }
  const handlePostCreated = () => { setPage(1); fetchPosts(1, category) }
  const handlePostDelete = (postId: number) => setPosts(prev => prev.filter(p => p.postId !== postId))

  // Tap active filter again → scroll to top + refresh
  const handleFilterClick = (k: string) => {
    setShowOpenings(false)
    if (k === category) { window.scrollTo({ top: 0, behavior: 'smooth' }); fetchPosts(1, k) }
    else setCategory(k)
  }

  const handleOpeningsClick = () => {
    if (showOpenings) {
      // toggle off → back to feed
      setShowOpenings(false)
      return
    }
    setShowOpenings(true)
    setCategory('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setOpeningsLoading(true)
    jobOpenings.getOpen()
      .then(roles => setOpeningsList(roles))
      .catch(() => setOpeningsList([]))
      .finally(() => setOpeningsLoading(false))
  }

  const trendingPosts = [...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 3)
  const [sidebarOpenRoles, setSidebarOpenRoles] = useState<any[]>([])
  useEffect(() => {
    jobOpenings.getOpen().then(roles => setSidebarOpenRoles(roles.slice(0, 3))).catch(() => setSidebarOpenRoles([]))
  }, [])

  return (
    <div className="aq-page">
      <div className="aq-feed-layout">
        {/* Left sidebar — AQ info */}
        <aside className="aq-feed-left">
          {/* Identity block */}
          <div className="sb-sec" style={{ borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.03em', color: 'var(--txt)' }}>AquaTerra</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--txt-3)', marginBottom: 14 }}>
              A student-led NGO from Kolkata. Welfare work, cultural events, and technology — all volunteer-driven since 2021.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['1.1K+', 'Members'], ['534+', 'Projects'], ['4 yrs', 'Running']].map(([n, l]) => (
                <div key={l}>
                  <div className="sb-n">{n}</div>
                  <div className="sb-nl">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dept filters */}
          <div className="sb-sec" style={{ paddingBottom: 6 }}>
            <span className="sb-lbl">Filter by department</span>
          </div>
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
            {[
              ['Everything We Do', '/everything-we-do'],
              ['534+ Projects', '/projects'],
              ['Groundwork Diaries', '/blog'],
              ['About AQ', '/about'],
              ['Support Us', '/support'],
            ].map(([l, p]) => (
              <Link key={p} to={p} className="sb-link">{l} →</Link>
            ))}
          </div>
        </aside>

        {/* Main feed */}
        <main className="aq-feed-main">
          {/* Compose bar */}
          <div className="compose-bar">
            {/* Mini avatar */}
            <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 13, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
              {member?.avatar_url
                ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : (member?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
              }
            </div>
            <button className="aq-compose-pill" onClick={() => setShowCreateModal(true)}>
              What's your team been up to?
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCreateModal(true)}>Post</button>
          </div>

          {/* Filter chips */}
          <div className="chip-row" style={{ position: 'relative', overscrollBehaviorX: 'none' }}>
            {DEPT_FILTERS.map(f => (
              <button
                key={f.k}
                onClick={() => handleFilterClick(f.k)}
                aria-pressed={category === f.k && !showOpenings}
                className={`aq-chip ${category === f.k && !showOpenings ? 'on' : ''}`}
                style={{ position: 'relative' }}
              >
                {category === f.k && !showOpenings && (
                  <motion.span
                    layoutId="chip-active"
                    style={{
                      position: 'absolute', inset: 0, borderRadius: 'inherit',
                      background: (f.color || DEPT_COLORS.all) + '22',
                      border: `1.5px solid ${f.color || DEPT_COLORS.all}`,
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{f.label}</span>
              </button>
            ))}
            {/* Openings chip — loads openings inline, no page nav */}
            <button
              onClick={handleOpeningsClick}
              aria-pressed={showOpenings}
              className={`aq-chip ${showOpenings ? 'on' : ''}`}
              style={{ position: 'relative' }}
            >
              {showOpenings && (
                <motion.span
                  layoutId="chip-active"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 'inherit',
                    background: 'var(--mint)22',
                    border: '1.5px solid var(--mint)',
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>⚡ Openings</span>
            </button>
          </div>

          {/* Openings inline view */}
          {showOpenings ? (
            openingsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 4 }}>
                {[0, 1, 2].map(i => <FeedPostSkeleton key={i} />)}
              </div>
            ) : openingsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28, color: 'var(--ink-3)' }}>no open roles right now.</p>
                <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8 }}>check back soon — teams post new openings regularly.</p>
              </div>
            ) : (
              <div className="post-feed">
                {openingsList.map((op, i) => (
                  <motion.div
                    key={op.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 140, damping: 22 }}
                  >
                    <OpeningCard op={op} />
                  </motion.div>
                ))}
              </div>
            )
          ) : null}

          {/* Posts */}
          {!showOpenings && (isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 4 }}>
              {[0, 1, 2, 3, 4].map(i => <FeedPostSkeleton key={i} />)}
            </div>
          ) : feedError ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', border: '2px solid var(--line)' }}>
              <div style={{ fontSize: 40 }}>⚠</div>
              <div className="h-display" style={{ fontSize: 28, marginTop: 12 }}>couldn't load posts.</div>
              <p className="muted" style={{ marginTop: 8 }}>Check your connection and try again.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => fetchPosts(1, category)}>retry →</button>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <p style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 28, color: 'var(--ink-3)' }}>
                nothing here yet.
              </p>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 8 }}>
                try a different filter or post the first one.
              </p>
            </div>
          ) : (
            <div className="post-feed">
              <AnimatePresence mode="popLayout">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.postId ?? post.uuid}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 140, damping: 22 }}
                  >
                    <PostCard post={post} onDelete={handlePostDelete} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {hasMore && (
                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                  <button
                    onClick={handleLoadMore}
                    className="btn btn-sm"
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? 'Loading...' : 'Load more →'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </main>

        {/* Right sidebar */}
        <aside className="aq-feed-right">
          <div className="wgt">
            <div className="wgt-hd"><span className="sb-lbl" style={{ margin: 0 }}>Trending</span></div>
            {trendingPosts.length === 0
              ? <div className="wgt-row" style={{ color: 'var(--txt-4)', fontFamily: 'var(--f)', fontSize: 11 }}>Nothing yet</div>
              : trendingPosts.map(p => (
                <Link key={p.postId} to={`/post/${p.uuid}`} className="wgt-row" style={{ textDecoration: 'none' }}>
                  <div className="wgt-title">{p.body?.slice(0, 80)}</div>
                  <div className="wgt-meta" style={{ fontFamily: 'var(--f)' }}>♡ {p.likeCount || 0} · <span style={{ color: `var(--c-${p.category})` }}>{p.category}</span></div>
                </Link>
              ))
            }
          </div>
          {sidebarOpenRoles.length > 0 && (
            <div className="wgt">
              <div className="wgt-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="sb-lbl" style={{ margin: 0 }}>Open Roles</span>
                <Link to="/opportunities" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mint)', textDecoration: 'none', fontWeight: 700 }}>all →</Link>
              </div>
              {sidebarOpenRoles.map(op => {
                const accent = CAT_COLORS[op.category] || 'var(--mint)'
                return (
                  <Link key={op.id} to="/opportunities" className="wgt-row" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink)' }}>{op.title}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 10, color: accent, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {op.category}{op.teamName ? ` · ${op.teamName}` : ''}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          <div className="wgt" style={{ borderBottom: 'none' }}>
            <div className="wgt-hd"><span className="sb-lbl" style={{ margin: 0 }}>Quick links</span></div>
            {[['534+ Projects →', '/projects'], ['Groundwork Diaries →', '/blog'], ['Support AQ →', '/support'], ['About AQ →', '/about']].map(([l, p]) => (
              <Link key={p} to={p} className="wgt-row">{l}</Link>
            ))}
          </div>
        </aside>
      </div>

      {/* Mobile FAB — fixed create button for small screens */}
      <button
        className="feed-mobile-fab"
        onClick={() => setShowCreateModal(true)}
        aria-label="Create post"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

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
