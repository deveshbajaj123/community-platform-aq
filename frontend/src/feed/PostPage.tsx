import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import { I, LikeButton, Burst } from '../components/v6Shared'

const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}
function getInitials(name: string) {
  return (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
}

const CAT_COLORS: Record<string, string> = {
  events:     '#FF6BD6',
  welfare:    '#00E5A0',
  labs:       '#FFC700',
  operations: '#3DA9FC',
  content:    '#7E5BFF',
}

const PostPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentPage, setCommentPage] = useState(1)
  const [commentsHasMore, setCommentsHasMore] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  useEffect(() => {
    if (!uuid) return
    setIsLoading(true)
    feedService.getPost(uuid)
      .then(result => {
        if (result.success && result.data.post.status === 'published') {
          const p = result.data.post
          setPost(p)
          setLiked(p.isLiked || false)
          setLikeCount(p.likeCount || 0)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [uuid])

  useEffect(() => {
    if (!uuid) return
    setCommentsLoading(true)
    feedService.getComments(uuid, { page: 1, limit: 10 })
      .then(result => {
        if (result.success) {
          setComments(result.data)
          setCommentCount(result.pagination.totalItems)
          setCommentsHasMore(result.pagination.hasNextPage)
          setCommentPage(1)
        }
      })
      .catch(console.error)
      .finally(() => setCommentsLoading(false))
  }, [uuid])

  const handleLike = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (isLiking || !post) return
    const wasLiked = liked
    setLiked(!wasLiked); setLikeCount(c => wasLiked ? c - 1 : c + 1)
    setIsLiking(true)
    try {
      const result = await feedService.toggleLike(post.uuid)
      if (result.success) { setLiked(result.data.liked); setLikeCount(result.data.likeCount) }
    } catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1) }
    setIsLiking(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${uuid}`
    // Native share sheet on mobile
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.body?.slice(0, 60) || 'AquaTerra post',
          text: post?.body?.slice(0, 120) || '',
          url,
        })
        return
      } catch { /* user cancelled */ }
    }
    // Desktop fallback — copy to clipboard
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('input'); el.value = url
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleAddComment = async () => {
    if (!commentInput.trim() || isSubmittingComment || !uuid) return
    const body = commentInput.trim()
    setIsSubmittingComment(true)
    // Optimistic insert
    const tempComment = {
      commentId: Date.now(),
      uuid: 'temp-' + Date.now(),
      body,
      createdAt: new Date().toISOString(),
      authorId: member?.member_id,
      authorUuid: member?.uuid,
      authorName: member?.full_name || 'You',
      authorAvatar: member?.avatar_url || null,
      authorRole: member?.role || 'member',
      isTemp: true,
    }
    setComments(prev => [...prev, tempComment])
    setCommentCount(c => c + 1)
    setCommentInput('')
    try {
      const result = await feedService.addComment(uuid, body)
      if (result.success) {
        setComments(prev => prev.map(c => c.uuid === tempComment.uuid ? result.data : c))
      }
    } catch {
      // Roll back optimistic insert
      setComments(prev => prev.filter(c => c.uuid !== tempComment.uuid))
      setCommentCount(c => c - 1)
      setCommentInput(body)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentUuid: string) => {
    const removed = comments.find(c => c.uuid === commentUuid)
    setComments(prev => prev.filter(c => c.uuid !== commentUuid))
    setCommentCount(c => c - 1)
    try {
      await feedService.deleteComment(commentUuid)
    } catch {
      if (removed) setComments(prev => [...prev, removed])
      setCommentCount(c => c + 1)
    }
  }

  const loadMoreComments = async () => {
    if (!uuid || !commentsHasMore) return
    const nextPage = commentPage + 1
    try {
      const result = await feedService.getComments(uuid, { page: nextPage, limit: 10 })
      if (result.success) {
        setComments(prev => [...prev, ...result.data])
        setCommentsHasMore(result.pagination.hasNextPage)
        setCommentPage(nextPage)
      }
    } catch (e) { console.error(e) }
  }

  if (isLoading) {
    return (
      <div className="route-enter post-page-root">
        <div style={{ height: 4, background: 'var(--bg-3)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
          <div className="v6-skeleton sk-pill" style={{ width: 80, height: 30 }} />
          <div className="v6-skeleton" style={{ width: 60, height: 12 }} />
        </div>
        <div style={{ padding: '0 20px 32px' }} className="sk-group">
          <div className="v6-skeleton sk-pill" style={{ width: 72, height: 20, marginBottom: 22 }} />
          <div className="v6-skeleton" style={{ width: '88%', height: 38, marginBottom: 10 }} />
          <div className="v6-skeleton" style={{ width: '60%', height: 38, marginBottom: 28 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="v6-skeleton sk-circle" style={{ width: 44, height: 44 }} />
            <div>
              <div className="v6-skeleton" style={{ width: 130, height: 14, marginBottom: 7 }} />
              <div className="v6-skeleton" style={{ width: 90, height: 11 }} />
            </div>
          </div>
        </div>
        <div style={{ height: 220, background: 'var(--bg-2)', marginBottom: 0 }} />
        <div style={{ padding: '32px 20px' }} className="sk-group">
          {[100, 96, 92, 68, 94, 55].map((w, i) => (
            <div key={i} className="v6-skeleton" style={{ width: `${w}%`, height: 14, marginBottom: 14 }} />
          ))}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <div className="v6-skeleton sk-pill" style={{ width: 72, height: 32 }} />
          <div className="v6-skeleton sk-pill" style={{ width: 56, height: 32 }} />
          <div className="v6-skeleton sk-pill" style={{ width: 64, height: 32 }} />
        </div>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(44px, 8vw, 80px)', paddingBottom: 'clamp(44px, 8vw, 80px)', textAlign: 'center', maxWidth: 600 }}>
        <div className="h-display" style={{ fontSize: 40 }}>post not found.</div>
        <p className="muted" style={{ marginTop: 12 }}>this post doesn't exist or has been removed.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>← go back</Link>
      </div>
    )
  }

  const accent = CAT_COLORS[post.category] || '#00E5A0'
  const authorColor = hashColor(post.authorName || post.authorUuid || '')
  const initials = getInitials(post.authorName || 'U')
  const profilePath = member ? `/profile/${post.authorUuid}` : `/member/${post.authorUuid}`
  const hasImages = post.images && post.images.length > 0

  // If director wrote title\n\nbody, split them for better display
  const bodyParts = post.body.split('\n\n')
  const hasExplicitTitle = bodyParts.length >= 2 && bodyParts[0].length <= 120
  const displayTitle = hasExplicitTitle ? bodyParts[0] : post.body.slice(0, 120).trimEnd()
  const displayBody = hasExplicitTitle
    ? bodyParts.slice(1).join('\n\n')
    : post.body.length > 120 ? post.body.slice(120).trimStart() : ''

  return (
    <div className="route-enter post-page-root">

      {/* ── Dark hero ── */}
      <header className="post-page-hero" style={{ '--accent': accent } as React.CSSProperties}>

        {/* Halftone texture */}
        <div className="halftone" style={{ position: 'absolute', inset: 0, color: accent, opacity: 0.12, pointerEvents: 'none' }} />

        {/* Burst decoration */}
        <Burst size={160} color={accent} stroke="transparent"
          style={{ position: 'absolute', top: -40, right: -20, opacity: 0.18, pointerEvents: 'none' }} />

        {/* Top nav row */}
        <div className="post-page-topbar">
          <button className="btn btn-sm" onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff', gap: 6, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <I.back /> back
          </button>
          <span className="mono xs" style={{ color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        {/* Category sticker */}
        <div style={{ position: 'relative', paddingBottom: 28 }}>
          <span
            className="sticker wobble"
            style={{ display: 'inline-flex', marginBottom: 20, background: accent, color: '#0A0A0A', border: 'none' }}
          >
            ★ {post.category.toUpperCase()}
          </span>

          {/* Title — NeutralFace, huge */}
          <h1 className="post-page-title">
            {displayTitle}
          </h1>

          {/* Author row */}
          <Link to={profilePath} className="post-page-author-link">
            <div className="avatar"
              style={{ background: authorColor, width: 46, height: 46, fontSize: 15, flexShrink: 0, overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' }}>
              {post.authorAvatar
                ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.1 }}>
                {post.authorName}
              </div>
              {(post as any).authorSchool && (
                <div className="mono xs" style={{ marginTop: 3, color: 'rgba(255,255,255,0.5)' }}>
                  {(post as any).authorSchool}
                </div>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* ── Full-bleed image ── */}
      {hasImages && (
        <div className="post-page-img-wrap">
          {post.images!.length === 1 ? (
            <img
              src={(post.images![0] as any).blobUrl || (post.images![0] as any).url}
              alt=""
              className="post-page-img"
              style={{ outline: '1px solid rgba(0,0,0,0.08)', outlineOffset: -1 }}
            />
          ) : (
            <div className="post-page-img-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
              {post.images!.slice(0, 4).map((img: any, i: number) => (
                <img key={i} src={img.blobUrl || img.url} alt=""
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block',
                    outline: '1px solid rgba(0,0,0,0.08)', outlineOffset: -1 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Body content ── */}
      <div className="post-page-body-wrap">
        {/* Left accent stripe — thick, bold */}
        <div style={{
          position: 'absolute', left: 0, top: 32, bottom: 32,
          width: 5, background: accent, borderRadius: '0 3px 3px 0', opacity: 0.85,
        }} />
        <p className="post-page-body">{displayBody}</p>

        {/* Link CTA */}
        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="feed-link-cta"
            style={{ marginTop: 24, display: 'inline-flex' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            {(post as any).linkTitle || post.linkUrl.replace(/^https?:\/\//, '').slice(0, 60)}
          </a>
        )}
      </div>

      {/* ── Action bar — sticky ── */}
      <div className="post-page-actions">
        <LikeButton liked={liked} count={likeCount} onToggle={handleLike} />
        <a href="#comments" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none' }}>
          <I.comment />
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{commentCount}</span>
        </a>
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleShare}
          style={{ color: linkCopied ? accent : undefined, transition: 'color 0.15s' }}
        >
          {linkCopied ? '✓ copied' : <><I.share /> share</>}
        </button>
        <span style={{ flex: 1 }} />
        {/* Accent dot — matches category */}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0, boxShadow: `0 0 8px ${accent}88` }} />
        <span className="mono xs" style={{ color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {post.category}
        </span>
      </div>

      {/* ── Comments ── */}
      <section id="comments" className="post-page-comments">

        {/* Section heading — editorial */}
        <div style={{ marginBottom: 28 }}>
          <h2 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 0.9, margin: 0 }}>
            {commentCount > 0
              ? <><span style={{ fontVariantNumeric: 'tabular-nums' }}>{commentCount}</span> <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: accent }}>comment{commentCount !== 1 ? 's' : ''}.</span></>
              : <>join the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: accent }}>conversation.</span></>
            }
          </h2>
          {commentCount === 0 && (
            <p className="mono xs muted" style={{ marginTop: 10 }}>be the first to say something.</p>
          )}
        </div>

        {/* Comment input — authenticated users only */}
        {isAuthenticated && (
          <div style={{
            background: 'var(--card)',
            border: '2px solid var(--ink)',
            boxShadow: '3px 3px 0 0 var(--ink)',
            borderRadius: 18,
            padding: 18,
            marginBottom: 32,
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div className="avatar" style={{
                background: hashColor(member?.full_name || member?.uuid || ''),
                flexShrink: 0, width: 38, height: 38, fontSize: 13, overflow: 'hidden',
                border: '2px solid var(--ink)',
              }}>
                {member?.avatar_url
                  ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : (member?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <textarea
                  placeholder="say something thoughtful..."
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value.slice(0, 500))}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment() }}
                  rows={3}
                  style={{
                    width: '100%', resize: 'vertical', borderRadius: 12, fontSize: 14,
                    minHeight: 84, fontFamily: 'var(--eina)', padding: '10px 14px',
                    background: 'var(--bg-2)', border: '1.5px solid var(--line-2)',
                    color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, gap: 8, alignItems: 'center' }}>
                  <span
                    className="mono xs"
                    style={{
                      marginRight: 'auto',
                      fontVariantNumeric: 'tabular-nums',
                      color: commentInput.length >= 500
                        ? '#e05c5c'
                        : commentInput.length >= 450
                          ? 'var(--lemon)'
                          : 'var(--ink-3)',
                    }}
                  >
                    {commentInput.length}/500
                  </span>
                  {commentInput && (
                    <button className="btn btn-sm btn-ghost" onClick={() => setCommentInput('')}>clear</button>
                  )}
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleAddComment}
                    disabled={isSubmittingComment || !commentInput.trim()}
                    style={{ background: accent, borderColor: accent, color: '#0A0A0A' }}
                  >
                    {isSubmittingComment ? 'posting…' : 'post →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not logged in CTA */}
        {!isAuthenticated && (
          <div style={{
            padding: '28px 28px 32px',
            background: '#0A0A0A',
            borderRadius: 18,
            border: '2px solid var(--ink)',
            boxShadow: '4px 4px 0 0 var(--ink)',
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Burst size={100} color={accent} stroke="transparent"
              style={{ position: 'absolute', top: -20, right: -10, opacity: 0.2 }} />
            <div className="h-display" style={{ fontSize: 'clamp(22px, 4vw, 32px)', marginBottom: 8, color: '#fff', position: 'relative' }}>
              join the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: accent }}>conversation.</span>
            </div>
            <p style={{ marginBottom: 20, color: 'rgba(255,255,255,0.55)', fontSize: 14, fontFamily: 'var(--eina)', position: 'relative' }}>
              log in to leave a comment.
            </p>
            <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <Link to="/login" className="btn btn-sm btn-primary"
                style={{ background: accent, borderColor: accent, color: '#0A0A0A' }}>
                log in →
              </Link>
              <Link to="/register" className="btn btn-sm btn-ghost"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                join AQ
              </Link>
            </div>
          </div>
        )}

        {/* Comments list */}
        {commentsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} className="v6-skeleton" style={{ height: 80, borderRadius: 14, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {comments.map((c, idx) => {
              const isOwn = member?.uuid === c.authorUuid
              const canDelete = isOwn || ['director', 'hod', 'super_admin'].includes(member?.role || '')
              const commentColor = hashColor(c.authorName || c.authorUuid || '')
              const commentInitials = (c.authorName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              const commentProfilePath = member ? `/profile/${c.authorUuid}` : `/member/${c.authorUuid}`
              return (
                <div key={c.uuid} style={{
                  display: 'flex', gap: 14, padding: '18px 0',
                  borderBottom: idx < comments.length - 1 ? '1px solid var(--line)' : 'none',
                  opacity: (c as any).isTemp ? 0.55 : 1,
                  transition: 'opacity 0.25s',
                }}>
                  <Link to={commentProfilePath} style={{ flexShrink: 0, textDecoration: 'none' }}>
                    <div className="avatar" style={{
                      background: commentColor, width: 36, height: 36, fontSize: 12,
                      overflow: 'hidden', border: '2px solid var(--ink)',
                      boxShadow: '2px 2px 0 0 var(--ink)', transition: 'transform 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = '')}
                    >
                      {c.authorAvatar
                        ? <img src={c.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        : commentInitials}
                    </div>
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <Link to={commentProfilePath}
                        style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 13, color: 'var(--ink)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
                      >
                        {c.authorName}
                      </Link>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'var(--eina)', fontSize: 14.5, lineHeight: 1.68, color: 'var(--ink-2)', margin: 0 }}>
                      {c.body}
                    </p>
                  </div>
                  {canDelete && !(c as any).isTemp && (
                    <button
                      onClick={() => handleDeleteComment(c.uuid)}
                      style={{
                        flexShrink: 0, alignSelf: 'flex-start',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ink-3)', fontSize: 16, lineHeight: 1,
                        padding: '6px 8px', borderRadius: 6,
                        minWidth: 32, minHeight: 32,
                        transition: 'color 0.12s, background 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.background = 'rgba(224,92,92,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.background = 'none' }}
                      title="Delete comment"
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
            {commentsHasMore && (
              <button className="btn btn-ghost" style={{ marginTop: 16, justifyContent: 'center' }} onClick={loadMoreComments}>
                load more →
              </button>
            )}
          </div>
        ) : (
          isAuthenticated && (
            <div style={{ padding: '20px 0 8px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
              no comments yet. be first.
            </div>
          )
        )}
      </section>

      <style>{`
        .post-page-root {
          max-width: 780px;
          margin: 0 auto;
          padding-bottom: 100px;
        }

        /* ── Hero ── */
        .post-page-hero {
          position: relative;
          background: #0A0A0A;
          color: #fff;
          border-bottom: 2px solid var(--ink);
          overflow: hidden;
          padding-bottom: 0;
        }
        .post-page-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px 0;
          position: relative;
        }

        /* ── Title ── */
        .post-page-title {
          font-family: var(--eina) !important;
          font-size: clamp(36px, 6vw, 68px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -0.03em;
          color: #fff;
          margin: 0 0 28px;
          text-wrap: balance;
        }
        .post-page-hero > div { position: relative; padding: 20px 24px 32px; }

        /* ── Author link ── */
        .post-page-author-link {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          padding: 10px 14px;
          background: rgba(255,255,255,0.07);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          transition: background 0.15s, border-color 0.15s;
        }
        .post-page-author-link:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.22);
        }

        /* ── Image ── */
        .post-page-img-wrap {
          border-bottom: 2px solid var(--ink);
          overflow: hidden;
        }
        .post-page-img {
          width: 100%;
          max-height: 540px;
          object-fit: cover;
          display: block;
        }

        /* ── Body ── */
        .post-page-body-wrap {
          padding: 40px 24px 36px 36px;
          position: relative;
          border-bottom: 2px solid var(--line);
        }
        .post-page-body {
          font-family: var(--eina) !important;
          font-size: clamp(16px, 2vw, 18.5px);
          line-height: 1.84;
          color: var(--ink-2);
          white-space: pre-wrap;
          margin: 0;
          text-wrap: pretty;
        }

        /* ── Action bar ── */
        .post-page-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding: 14px 20px;
          padding-bottom: max(14px, env(safe-area-inset-bottom));
          border-bottom: 2px solid var(--ink);
          background: var(--bg);
          position: sticky;
          bottom: 0;
          z-index: 10;
          box-shadow: 0 -1px 0 0 var(--line);
        }

        /* ── Comments ── */
        .post-page-comments {
          padding: 36px 24px 0;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .post-page-title { font-size: clamp(30px, 9vw, 48px); }
          .post-page-body { font-size: 16px; line-height: 1.76; }
          .post-page-hero > div,
          .post-page-body-wrap,
          .post-page-comments { padding-left: 18px; padding-right: 18px; }
          .post-page-body-wrap { padding-left: 24px; }
          .post-page-topbar { padding: 14px 18px 0; }
        }
        @media (max-width: 600px) {
          .post-page-img-grid { gap: 0 !important; }
        }
      `}</style>
    </div>
  )
}

export default PostPage
