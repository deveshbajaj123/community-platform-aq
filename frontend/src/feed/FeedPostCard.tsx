import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import ImageLightbox from '../components/ImageLightbox'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import { I, LikeButton } from '../components/v6Shared'
import { DEPT_COLORS } from '../lib/supabase'
import ShareModal from '../components/ShareModal'
import { jobOpenings } from '../lib/jobOpenings'
import { useToast } from '../components/Toast'
import PostFocusModal from '../components/PostFocusModal'
import { useIsMobile } from '../hooks/useMobile'

const STICKER_KINDS = ['mint', 'lemon', 'pink', 'sky', 'orange', 'grape']
const STICKER_LABELS = ['NEW', '★ FRESH', 'POSTED', 'LIVE', 'READ ME', 'THIS!', '+1', 'GOOD']
const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60)    return 'just now'
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function getInitials(name: string) {
  return (name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
}

interface FeedPostCardProps {
  post: Post
  seed?: number
  onLikeToggle?: () => void
}

export default function FeedPostCard({ post, seed = 0, onLikeToggle }: FeedPostCardProps) {
  const navigate = useNavigate()
  const { member, isAuthenticated } = useAuth()
  const { success, info } = useToast()
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [bookmarked, setBookmarked] = useState(() => {
    try { return localStorage.getItem(`aq_bm_${post.uuid}`) === '1' } catch { return false }
  })
  const [bookmarkPop, setBookmarkPop] = useState(false)
  const [linkedOpening, setLinkedOpening] = useState<any>(undefined)
  const [showFocusModal, setShowFocusModal] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [showCommentSheet, setShowCommentSheet] = useState(false)
  const [sheetComments, setSheetComments] = useState<any[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetInput, setSheetInput] = useState('')
  const [sheetSubmitting, setSheetSubmitting] = useState(false)
  const [sheetCount, setSheetCount] = useState(post.commentCount || 0)

  const isMobile = useIsMobile()

  // ── Preview comments for image posts ──
  const hasImages = !!(post.images && post.images.length > 0)
  const [previewComments, setPreviewComments] = useState<any[]>([])
  const previewFetched = useRef(false)

  const cardRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fetch top 2 comments for image posts once card is visible
  useEffect(() => {
    if (!visible || !hasImages || !post.uuid || post.commentCount === 0) return
    if (previewFetched.current) return
    previewFetched.current = true
    feedService.getComments(post.uuid, { page: 1, limit: 2 })
      .then(r => { if (r.success) setPreviewComments(r.data.slice(0, 2)) })
      .catch(() => {})
  }, [visible, hasImages, post.uuid, post.commentCount])

  useEffect(() => {
    if (!post.uuid) return
    jobOpenings.getByPostId(post.uuid).then(setLinkedOpening).catch(() => setLinkedOpening(undefined))
  }, [post.uuid])

  useEffect(() => {
    if (!showCommentSheet || !post.uuid) return
    setSheetLoading(true)
    feedService.getComments(post.uuid, { page: 1, limit: 5 })
      .then(r => { if (r.success) { setSheetComments(r.data); setSheetCount(r.pagination.totalItems) } })
      .catch(() => {})
      .finally(() => setSheetLoading(false))
  }, [showCommentSheet, post.uuid])

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !bookmarked
    setBookmarked(next)
    if (next) {
      setBookmarkPop(true)
      setTimeout(() => setBookmarkPop(false), 400)
      success('Saved to bookmarks')
    } else {
      info('Removed from bookmarks')
    }
    try { next ? localStorage.setItem(`aq_bm_${post.uuid}`, '1') : localStorage.removeItem(`aq_bm_${post.uuid}`) } catch {}
  }

  const stickerKind = STICKER_KINDS[seed % STICKER_KINDS.length]
  const stickerLabel = STICKER_LABELS[seed % STICKER_LABELS.length]
  const rot = (((seed * 37) % 14) - 7)
  const isHot = likeCount >= 100

  void DEPT_COLORS // kept for future use
  const authorColor = hashColor(post.authorName || post.authorUuid || '')
  const initials = getInitials(post.authorName || 'U')
  const profilePath = member ? `/profile/${post.authorUuid}` : `/member/${post.authorUuid}`

  const goPost = () => setShowFocusModal(true)

  const handleLike = async () => {
    if (isLiking) return
    if (!isAuthenticated) { navigate('/login'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    setIsLiking(true)
    try {
      const result = await feedService.toggleLike(post.uuid)
      if (result.success) { setLiked(result.data.liked); setLikeCount(result.data.likeCount) }
    } catch {
      setLiked(wasLiked); setLikeCount(c => wasLiked ? c + 1 : c - 1)
    }
    setIsLiking(false)
    onLikeToggle?.()
  }

  const handleSheetComment = async () => {
    if (!sheetInput.trim() || sheetSubmitting) return
    if (!isAuthenticated) { navigate('/login'); return }
    const body = sheetInput.trim()
    const tempComment = {
      uuid: 'temp-' + Date.now(), body,
      createdAt: new Date().toISOString(),
      authorUuid: member?.uuid, authorName: member?.full_name || 'You',
      authorAvatar: member?.avatar_url || null, isTemp: true,
    }
    setSheetComments(prev => [...prev, tempComment])
    setSheetCount(c => c + 1)
    setSheetInput('')
    setSheetSubmitting(true)
    try {
      const result = await feedService.addComment(post.uuid, body)
      if (result.success) setSheetComments(prev => prev.map(c => c.uuid === tempComment.uuid ? result.data : c))
    } catch {
      setSheetComments(prev => prev.filter(c => c.uuid !== tempComment.uuid))
      setSheetCount(c => c - 1)
      setSheetInput(body)
    }
    setSheetSubmitting(false)
  }

  return (
    <>
    <article ref={cardRef} className={`feed-card${!visible ? ' aq-animations-paused' : ''}`} onClick={goPost}>
      {/* AUTHOR HEADER */}
      <header className="feed-card-head">
        <button
          className="row gap-2"
          onClick={e => { e.stopPropagation(); navigate(profilePath) }}
          style={{ alignItems: 'center', minWidth: 0, flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div className="avatar" style={{ background: authorColor, width: 38, height: 38, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
            {post.authorAvatar
              ? <img src={post.authorAvatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              : initials}
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>{post.authorName}</div>
            <div className="mono xs muted" style={{ marginTop: 2 }}>
              {(post as any).authorSchool && `${(post as any).authorSchool} · `}{timeAgo(post.createdAt)}
            </div>
          </div>
        </button>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className={'chip cat-' + post.category}>{post.category}</span>
          {/* ⋮ removed — no action defined yet */}
        </div>
      </header>

      {/* MEDIA — only render if real images exist */}
      {post.images && post.images.length > 0 && (
        <div className="feed-card-media" style={{ position: 'relative' }}>
          {post.images.length === 1 ? (
            <img
              src={(post.images[0] as any).blobUrl || (post.images[0] as any).url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onClick={e => { e.stopPropagation(); setLightboxSrc((post.images![0] as any).blobUrl || (post.images![0] as any).url) }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', height: '100%' }}>
              {post.images.slice(0, 2).map((img: any, i: number) => (
                <img key={i} src={img.blobUrl || img.url} alt="" loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onClick={e => { e.stopPropagation(); setLightboxSrc(img.blobUrl || img.url) }}
                />
              ))}
            </div>
          )}
          {isHot && (
            <span className="sticker sticker-tomato sticker-pop-in" style={{ position: 'absolute', top: 14, right: 14, transform: 'rotate(8deg)', fontSize: 11, zIndex: 2 }}>★ HOT</span>
          )}
          <span className={'sticker sticker-' + stickerKind} style={{ position: 'absolute', top: 10, left: 12, transform: `rotate(${rot}deg)`, fontSize: 11, zIndex: 2 }}>
            {stickerLabel}
          </span>

          {/* ── Comment bubble cloud ── */}
          {previewComments.length > 0 && (
            <div
              onClick={e => { e.stopPropagation(); setShowCommentSheet(true) }}
              style={{
                position: 'absolute',
                bottom: 12,
                left: 10,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
                zIndex: 3,
                pointerEvents: 'auto',
                maxWidth: 'calc(100% - 20px)',
              }}
            >
              {/* Commenter avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: hashColor(previewComments[0].authorName || ''),
                border: '2px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--display)', fontWeight: 900, fontSize: 10,
                color: '#0A0A0A', flexShrink: 0,
                boxShadow: '1px 1px 0 var(--ink)',
                overflow: 'hidden',
              }}>
                {previewComments[0].authorAvatar
                  ? <img src={previewComments[0].authorAvatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : getInitials(previewComments[0].authorName || 'U')}
              </div>

              {/* Bubbles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {previewComments.map((c, i) => (
                  <div key={c.uuid || i} style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1.5px solid var(--ink)',
                    borderRadius: i === 0 ? '14px 14px 14px 2px' : '14px 14px 14px 2px',
                    padding: '5px 10px',
                    fontFamily: 'var(--eina)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#0A0A0A',
                    lineHeight: 1.5,
                    maxWidth: 200,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    boxShadow: '1px 1px 0 rgba(0,0,0,0.2)',
                    transform: i === 1 ? 'translateX(4px)' : 'none',
                    opacity: i === 1 ? 0.88 : 1,
                  }}>
                    {(c.body || '').slice(0, 80)}{(c.body || '').length > 80 ? '…' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job opening badge — shown when post has a linked role that's no longer open */}
      {linkedOpening && linkedOpening.status !== 'open' && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ margin: '0 16px 0', padding: '8px 12px', background: 'rgba(255,122,26,0.1)', borderRadius: 8, border: '1px solid rgba(255,122,26,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#FF7A1A', fontWeight: 700 }}>
            This role is no longer accepting applications.
          </span>
        </div>
      )}

      {/* BODY — always show body only; no auto title-split */}
      <div className="feed-card-body">
        <h3 className="h-display feed-card-title">
          {post.body.slice(0, 120)}{post.body.length > 120 ? '…' : ''}
        </h3>
        {post.body.length > 120 && (
          <p className="feed-card-snippet">{post.body.slice(120, 300)}</p>
        )}
        {/* Link CTA */}
        {(post as any).linkUrl && (
          <a href={(post as any).linkUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="feed-link-cta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            {(post as any).linkTitle || (post as any).linkUrl.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}
      </div>

      {/* ACTIONS */}
      <footer className="feed-card-foot">
        <LikeButton liked={liked} count={likeCount} onToggle={handleLike} />
        <button
          className="btn btn-sm btn-ghost"
          onClick={e => { e.stopPropagation(); setShowCommentSheet(true) }}
          title="comments"
        >
          <I.comment />
          <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {sheetCount}
          </span>
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={e => { e.stopPropagation(); setShowShareModal(true) }}
          title="share"
        >
          <I.share />
        </button>
        <span style={{ flex: 1 }} />
        <button
          className={'btn btn-sm btn-ghost' + (bookmarkPop ? ' bookmark-pop' : '')}
          onClick={handleBookmark}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark post'}
          style={{ color: bookmarked ? 'var(--lemon)' : undefined, transition: 'color 0.15s' }}
        >
          <I.bookmark />
        </button>
      </footer>
    </article>

    {/* Share modal — rendered via portal to escape article's onClick bubble */}
    {showShareModal && createPortal(
      <ShareModal
        url={`${window.location.origin}/post/${post.uuid}`}
        storyData={{
          type: 'post',
          title: post.body.slice(0, 100),
          body: post.body,
          authorName: post.authorName || 'AQ Member',
          authorAvatar: post.authorAvatar,
          authorSchool: (post as any).authorSchool,
          category: post.category,
          uuid: post.uuid,
        }}
        onClose={() => setShowShareModal(false)}
      />,
      document.body
    )}

    {/* Inline comment sheet */}
    {showCommentSheet && createPortal(
      <div
        onClick={() => { setShowCommentSheet(false); setSheetComments([]); setSheetInput('') }}
        style={{
          position: 'fixed', inset: 0, zIndex: 310,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 560,
            background: 'var(--card)',
            borderRadius: '20px 20px 0 0',
            border: '2px solid var(--ink)',
            borderBottom: 'none',
            maxHeight: '76dvh',
            display: 'flex', flexDirection: 'column',
            animation: 'commentSheetIn 0.22s cubic-bezier(0.2,0,0,1)',
          }}
        >
          {/* Sheet header */}
          <div style={{ padding: '14px 18px 12px', borderBottom: '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17 }}>comments</span>
              {sheetCount > 0 && (
                <span className="mono xs" style={{ background: 'var(--bg-2)', borderRadius: 999, padding: '2px 9px', fontVariantNumeric: 'tabular-nums', fontSize: 11, fontWeight: 700 }}>
                  {sheetCount}
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowCommentSheet(false); setSheetComments([]); setSheetInput('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: '8px 10px', margin: '-8px -10px', borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
            >✕</button>
          </div>

          {/* Post snippet — context */}
          <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--line)', flexShrink: 0, background: 'var(--bg-2)' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>
              {post.body.slice(0, 90)}{post.body.length > 90 ? '…' : ''}
            </div>
            <div className="mono xs muted" style={{ marginTop: 4 }}>
              {post.authorName} · <a href={`/post/${post.uuid}#comments`} onClick={e => { e.stopPropagation(); setShowCommentSheet(false) }} style={{ color: 'var(--mint)', textDecoration: 'none', fontWeight: 700 }}>view full post →</a>
            </div>
          </div>

          {/* Comments list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {sheetLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 18px' }}>
                {[1,2,3].map(i => (
                  <div key={i} className="v6-skeleton" style={{ height: 56, borderRadius: 10, animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            ) : sheetComments.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
                  no comments yet.
                </div>
                <p className="muted" style={{ fontSize: 13 }}>be the first to say something.</p>
              </div>
            ) : (
              sheetComments.map((c, idx) => {
                const cColor = (() => {
                  const colors = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
                  let h = 0; for (let i = 0; i < (c.authorName || '').length; i++) h = (c.authorName || '').charCodeAt(i) + ((h << 5) - h)
                  return colors[Math.abs(h) % colors.length]
                })()
                const cInits = (c.authorName || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                const timeAgoLocal = (iso: string) => {
                  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
                  if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d/60)}m`
                  if (d < 86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d`
                }
                return (
                  <div key={c.uuid} style={{
                    display: 'flex', gap: 12, padding: '13px 18px',
                    borderBottom: idx < sheetComments.length - 1 ? '1px solid var(--line)' : 'none',
                    opacity: c.isTemp ? 0.55 : 1, transition: 'opacity 0.2s',
                  }}>
                    <div className="avatar" style={{ background: cColor, width: 32, height: 32, fontSize: 11, overflow: 'hidden', flexShrink: 0 }}>
                      {c.authorAvatar
                        ? <img src={c.authorAvatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        : cInits}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 12, color: 'var(--ink)' }}>{c.authorName}</span>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{timeAgoLocal(c.createdAt)}</span>
                      </div>
                      <p style={{ fontFamily: 'var(--eina)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0 }}>{c.body}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Comment input */}
          <div style={{ padding: '12px 16px', borderTop: '2px solid var(--line)', flexShrink: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div className="avatar" style={{ background: ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC'][Math.abs(Array.from(member?.full_name || '').reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)) % 6], width: 32, height: 32, fontSize: 11, overflow: 'hidden', flexShrink: 0 }}>
                  {member?.avatar_url ? <img src={member.avatar_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (member?.full_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <input
                  value={sheetInput}
                  onChange={e => setSheetInput(e.target.value.slice(0, 500))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSheetComment() } }}
                  placeholder="say something..."
                  style={{
                    flex: 1, padding: '9px 14px', background: 'var(--bg-2)',
                    border: '1.5px solid var(--line-2)', borderRadius: 999, color: 'var(--ink)',
                    fontFamily: 'var(--eina)', fontSize: 14, outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--mint)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSheetComment}
                  disabled={sheetSubmitting || !sheetInput.trim()}
                  style={{ flexShrink: 0 }}
                >
                  {sheetSubmitting ? '…' : '↑'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <span style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-3)' }}>
                  <a href="/login" onClick={e => { e.preventDefault(); navigate('/login') }} style={{ color: 'var(--mint)', fontWeight: 700, textDecoration: 'none' }}>Log in</a>
                  {' '}to leave a comment.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    )}

    {/* Focus modal for normal (non-blog) posts */}
    {showFocusModal && (
      <PostFocusModal post={post} onClose={() => setShowFocusModal(false)} />
    )}
    </>
  )
}
