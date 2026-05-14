import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import ImageLightbox from '../components/ImageLightbox'
import { feedService } from '../services/feedService'
import { Post } from '../services/api'
import CreatePostModal from '../feed/CreatePostModal'
import { SAMPLE_POSTS, applySampleLikes, toggleSampleLike, type SamplePost } from '../data/samplePosts'
import { I, LikeButton } from '../components/v6Shared'
import { useToast } from '../components/Toast'
import { DEPT_COLORS } from '../lib/supabase'
import { hasLeaderAccess } from '../lib/roles'
import { jobOpenings, CAT_COLORS as JOB_CAT_COLORS } from '../lib/jobOpenings'
import PostFocusModal from '../components/PostFocusModal'
import ParadoxBanner from '../components/ParadoxBanner'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATS = [
  { k: '',           l: 'All',     icon: <I.sparkles />, color: 'var(--mint)',               bg: 'rgba(0,229,160,0.13)' },
  { k: 'events',     l: 'Events',  icon: <I.flag />,     color: 'var(--pink)',               bg: 'rgba(255,107,214,0.13)' },
  { k: 'welfare',    l: 'Welfare', icon: I.heart(false), color: '#FF7A1A',                   bg: 'rgba(255,122,26,0.13)' },
  { k: 'labs',       l: 'Labs',    icon: <I.bolt />,     color: 'var(--lemon)',              bg: 'rgba(255,199,0,0.13)' },
  { k: 'operations', l: 'Ops',     icon: <I.gear />,     color: '#3DA9FC',                   bg: 'rgba(61,169,252,0.13)' },
  { k: 'content',    l: 'Content', icon: <I.pen />,      color: 'var(--grape, #7E5BFF)',     bg: 'rgba(126,91,255,0.13)' },
]

const DEFAULT_EVENTS = [
  { id: '1', day: '08', mon: 'JUN', title: 'Dog feeding drive, Ballygunge', host: 'Welfare team', color: '#00E5A0' },
  { id: '2', day: '14', mon: 'JUN', title: 'Teaching workshop, Tiljala', host: 'Welfare team', color: '#FFC700' },
  { id: '3', day: '21', mon: 'JUN', title: 'Paradox 4.0 planning kick-off', host: 'Events team', color: '#FF6BD6' },
]
const EVENTS_KEY = 'aq_events_v1'
function loadEvents() {
  try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || 'null') || DEFAULT_EVENTS } catch { return DEFAULT_EVENTS }
}
function saveEvents(evts: typeof DEFAULT_EVENTS) {
  try { localStorage.setItem(EVENTS_KEY, JSON.stringify(evts)) } catch {}
}

const NOTICE_BOARD_KEY = 'aq_notice_board_v1'

type NoticeItem = {
  id: string
  title: string      // custom title set by director
  postUuid: string   // uuid of the actual feed post
  postBody: string   // cached body snippet
  authorName: string // cached author
  category: string   // cached category for accent
  pinnedAt: string   // when pinned
}

function loadNotices(): NoticeItem[] {
  try { return JSON.parse(localStorage.getItem(NOTICE_BOARD_KEY) || 'null') || [] }
  catch { return [] }
}
function saveNotices(items: NoticeItem[]) {
  try { localStorage.setItem(NOTICE_BOARD_KEY, JSON.stringify(items)) } catch {}
}

const STICKER_KINDS = ['mint', 'lemon', 'pink', 'sky', 'orange', 'grape']
const STICKER_LABELS = ['NEW', '★ FRESH', 'POSTED', 'LIVE', 'READ ME', 'THIS!', '+1', 'GOOD']

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── Feed post card (exact prototype FeedPostCard) ────────────────────────────

type AnyPost = Post & { authorColor?: string; authorInitials?: string; time?: string; tags?: string[]; img?: string; hue?: string }

function FeedPostCard({ post, onLike, seed = 0 }: { post: AnyPost | SamplePost; onLike?: () => void; seed?: number }) {
  const navigate = useNavigate()
  const { isAuthenticated, member } = useAuth()
  const { success, info } = useToast()
  const [liked, setLiked] = useState((post as any).isLiked || false)
  const [likeCount, setLikeCount] = useState((post as any).likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [showFocusModal, setShowFocusModal] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(() => {
    try { return localStorage.getItem(`aq_bm_${(post as any).uuid}`) === '1' } catch { return false }
  })
  const [bookmarkPop, setBookmarkPop] = useState(false)
  const [showCommentSheet, setShowCommentSheet] = useState(false)
  const [sheetComments, setSheetComments] = useState<any[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetInput, setSheetInput] = useState('')
  const [sheetSubmitting, setSheetSubmitting] = useState(false)
  const [sheetCount, setSheetCount] = useState((post as any).commentCount || 0)

  const stickerKind = STICKER_KINDS[seed % STICKER_KINDS.length]
  const stickerLabel = STICKER_LABELS[seed % STICKER_LABELS.length]
  const rot = (((seed * 37) % 14) - 7)
  const isHot = likeCount >= 100

  void DEPT_COLORS
  const initials = getInitials((post as any).authorName || 'U')
  const authorColor = (post as any).authorColor || hashColor((post as any).authorName || '')

  const handleLike = async () => {
    if (isLiking) return
    if (!isAuthenticated) { navigate('/login'); return }
    // Optimistic update — show immediately before async call
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c: number) => wasLiked ? c - 1 : c + 1)
    setIsLiking(true)
    try {
      const result = await feedService.toggleLike((post as any).uuid)
      if (result.success) { setLiked(result.data.liked); setLikeCount(result.data.likeCount) }
    } catch {
      // Fallback for sample posts
      const updated = toggleSampleLike((post as any).uuid, likeCount, wasLiked)
      setLiked(updated.liked); setLikeCount(updated.count)
    }
    onLike?.()
    setIsLiking(false)
  }

  useEffect(() => {
    if (!showCommentSheet || !(post as any).uuid) return
    setSheetLoading(true)
    feedService.getComments((post as any).uuid, { page: 1, limit: 5 })
      .then((r: any) => { if (r.success) { setSheetComments(r.data); setSheetCount(r.pagination.totalItems) } })
      .catch(() => {})
      .finally(() => setSheetLoading(false))
  }, [showCommentSheet, (post as any).uuid])

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
    setSheetComments((prev: any[]) => [...prev, tempComment])
    setSheetCount((c: number) => c + 1)
    setSheetInput('')
    setSheetSubmitting(true)
    try {
      const result = await feedService.addComment((post as any).uuid, body)
      if (result.success) setSheetComments((prev: any[]) => prev.map((c: any) => c.uuid === tempComment.uuid ? result.data : c))
    } catch {
      setSheetComments((prev: any[]) => prev.filter((c: any) => c.uuid !== tempComment.uuid))
      setSheetCount((c: number) => c - 1)
      setSheetInput(body)
    }
    setSheetSubmitting(false)
  }

  const images = (post as any).images
  const body = (post as any).body || ''
  const category = (post as any).category || 'general'

  const goPost = () => setShowFocusModal(true)

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !bookmarked
    setBookmarked(next)
    if (next) {
      setBookmarkPop(true)
      setTimeout(() => setBookmarkPop(false), 350)
      success('Saved to bookmarks')
      try { localStorage.setItem(`aq_bm_${(post as any).uuid}`, '1') } catch {}
    } else {
      info('Removed from bookmarks')
      try { localStorage.removeItem(`aq_bm_${(post as any).uuid}`) } catch {}
    }
  }

  return (
    <>
    <article className="feed-card" onClick={goPost}>
      {/* AUTHOR HEADER */}
      <header className="feed-card-head">
        <button
          onClick={e => { e.stopPropagation(); navigate(`/member/${(post as any).authorUuid}`) }}
          className="row gap-2"
          style={{ alignItems: 'center', minWidth: 0, flex: 1, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div className="avatar" style={{ background: authorColor, width: 38, height: 38, fontSize: 14, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.1 }}>{(post as any).authorName}</div>
            <div className="mono xs muted" style={{ marginTop: 2 }}>{(post as any).authorSchool} · {timeAgo((post as any).createdAt)}</div>
          </div>
        </button>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className={'chip cat-' + category}>{category}</span>
        </div>
      </header>

      {/* MEDIA — only show when real images exist */}
      {images && images.length > 0 && (
        <div className="feed-card-media" style={{ position: 'relative' }}>
          <img
            src={images[0].blobUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onClick={e => { e.stopPropagation(); setLightboxSrc(images[0].blobUrl) }}
          />
          {isHot && (
            <span className="sticker sticker-tomato sticker-pop-in" style={{ position: 'absolute', top: 14, right: 14, transform: 'rotate(8deg)', fontSize: 11 }}>★ HOT</span>
          )}
          <span className={'sticker sticker-' + stickerKind} style={{ position: 'absolute', top: -10, left: 18, transform: `rotate(${rot}deg)`, fontSize: 11, zIndex: 2 }}>
            {stickerLabel}
          </span>
        </div>
      )}

      {/* BODY — always body only; no auto title-split */}
      <div className="feed-card-body">
        <h3 className="h-display feed-card-title">
          {body.slice(0, 120)}{body.length > 120 ? '…' : ''}
        </h3>
        {body.length > 120 && <p className="feed-card-snippet">{body.slice(120, 300)}</p>}
        {(post as any).tags && (post as any).tags.length > 0 && (
          <div className="row gap-1 flex-wrap" style={{ marginTop: 10 }}>
            {(post as any).tags.slice(0, 4).map((t: string) => (
              <span key={t} className="chip" style={{ fontSize: 11, padding: '3px 9px' }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* ACTIONS — stopPropagation on footer prevents card click from firing */}
      <footer className="feed-card-foot" onClick={e => e.stopPropagation()}>
        <LikeButton liked={liked} count={likeCount} onToggle={handleLike} />
        <button className="btn btn-sm btn-ghost" onClick={e => { e.stopPropagation(); setShowCommentSheet(true) }}>
          <I.comment /> <span className="mono" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{sheetCount}</span>
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => {
          const url = `${window.location.origin}/post/${(post as any).uuid}`
          if (typeof navigator.share === 'function') {
            navigator.share({ url }).catch(() => {})
          } else {
            navigator.clipboard.writeText(url).catch(() => {})
          }
        }} title="share"><I.share /></button>
        <span style={{ flex: 1 }} />
        <button
          className={'btn btn-sm btn-ghost' + (bookmarkPop ? ' bookmark-pop' : '')}
          onClick={handleBookmark}
          title={bookmarked ? 'Remove bookmark' : 'Save post'}
          style={{ color: bookmarked ? 'var(--lemon)' : undefined, transition: 'color 0.15s' }}
        >
          <I.bookmark />
        </button>
      </footer>
    </article>
    {lightboxSrc && (
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
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
              {((post as any).body || '').slice(0, 90)}{((post as any).body || '').length > 90 ? '…' : ''}
            </div>
            <div className="mono xs muted" style={{ marginTop: 4 }}>
              {(post as any).authorName} · <a href={`/post/${(post as any).uuid}#comments`} onClick={e => { e.stopPropagation(); setShowCommentSheet(false) }} style={{ color: 'var(--mint)', textDecoration: 'none', fontWeight: 700 }}>view full post →</a>
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
              sheetComments.map((c: any, idx: number) => {
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
                        ? <img src={c.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
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
                <div className="avatar" style={{ background: ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC'][Math.abs(Array.from(member?.full_name || '').reduce((h: number, c: string) => c.charCodeAt(0) + ((h << 5) - h), 0)) % 6], width: 32, height: 32, fontSize: 11, overflow: 'hidden', flexShrink: 0 }}>
                  {member?.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (member?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
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

    {/* Focus modal for normal (non-blog) posts */}
    {showFocusModal && (
      <PostFocusModal post={post as any} onClose={() => setShowFocusModal(false)} />
    )}
    </>
  )
}

// ─── Left rail ────────────────────────────────────────────────────────────────

function LeftRail({ member, filter, setFilter, postCount }: {
  member: any; filter: string; setFilter: (f: string) => void; postCount: number
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const initials = getInitials(member?.full_name || 'U')
  const avatarColor = hashColor(member?.full_name || member?.uuid || '')

  return (
    <aside className="home-left">
      {member ? (
        <div className="rail-card rail-id" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Compact horizontal profile row */}
          <button
            onClick={() => navigate(`/profile/${member.uuid}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%' }}
          >
            <div className="avatar" style={{ background: avatarColor, overflow: 'hidden', flexShrink: 0, width: 44, height: 44, fontSize: 15 }}>
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rail-id-name" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name || 'you'}</div>
              <div className="mono xs muted" style={{ marginTop: 1 }}>@{member.uuid?.slice(0, 8) || 'member'}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.3, flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {/* Stats row */}
          <div className="rail-id-stats" style={{ marginTop: 0 }}>
            <div><b>{postCount}</b><span>posts</span></div>
            <div><b>—</b><span>likes</span></div>
            <div><b>—</b><span>teams</span></div>
          </div>
        </div>
      ) : (
        <div className="rail-card rail-join" style={{
          background: '#0A0A0A',
          border: '2px solid #0A0A0A',
          color: '#ffffff',
        }}>
          <span className="sticker" style={{
            alignSelf: 'flex-start', transform: 'rotate(-3deg)',
            background: 'var(--mint)', color: '#0A0A0A',
            fontWeight: 800, fontSize: 10, padding: '4px 10px',
            borderRadius: 999, letterSpacing: '0.06em',
          }}>★ kolkata, 2021</span>
          <div className="h-display" style={{ fontSize: 26, lineHeight: 1.05, marginTop: 10, color: '#ffffff' }}>
            join the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', color: 'var(--mint)', fontWeight: 400 }}>chaos</span>.
          </div>
          <p style={{ fontSize: 13, margin: '8px 0 14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            2 min to apply. 24 hrs to hear back. free forever.
          </p>
          <div className="row gap-2">
            <Link to="/register" className="btn btn-sm btn-primary">Apply now →</Link>
            <Link to="/login" className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>Log in</Link>
          </div>
        </div>
      )}

      {/* Category nav — visual tile grid */}
      <div className="rail-card rail-cats">
        <div className="rail-h" style={{ marginBottom: 12 }}>
          <span className="mono xs upper" style={{ fontWeight: 700 }}>browse</span>
          <span className="mono xs muted">{postCount} posts</span>
        </div>
        <div className="rail-cat-grid">
          {CATS.map(c => {
            const isActive = filter === c.k
            return (
              <button
                key={c.k}
                className="rail-cat-tile"
                onClick={() => setFilter(c.k)}
                style={{
                  background: isActive ? c.color : c.bg,
                  color: isActive ? '#0A0A0A' : 'var(--ink)',
                  borderColor: isActive ? c.color : 'transparent',
                  transform: isActive ? 'scale(1.04)' : '',
                  boxShadow: isActive ? `0 4px 14px ${c.color}44` : '',
                }}
              >
                <span className="rail-cat-tile-icon" style={{ color: isActive ? '#0A0A0A' : c.color }}>{c.icon}</span>
                <span className="rail-cat-tile-label">{c.l}</span>
                {isActive && <span className="rail-cat-tile-badge">{postCount}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {member && (
        <button
          className="rail-logout-btn"
          onClick={() => { logout(); navigate('/') }}
          style={{ marginTop: 4 }}
        >
          log out →
        </button>
      )}
    </aside>
  )
}

// ─── Right rail ───────────────────────────────────────────────────────────────

const EVENT_COLORS = ['#00E5A0', '#FFC700', '#FF6BD6', '#3DA9FC', '#FF7A1A']

type AQEvent = { id: string; day: string; mon: string; title: string; host: string; color: string }

function EventEditModal({ event, onSave, onDelete, onClose }: {
  event: AQEvent | null; onSave: (e: AQEvent) => void; onDelete?: (id: string) => void; onClose: () => void
}) {
  const isNew = !event
  const [day, setDay] = useState(event?.day || '')
  const [mon, setMon] = useState(event?.mon || '')
  const [title, setTitle] = useState(event?.title || '')
  const [host, setHost] = useState(event?.host || '')
  const [color, setColor] = useState(event?.color || EVENT_COLORS[0])

  const labelSt: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 5 }
  const inputSt: React.CSSProperties = { width: '100%', padding: '8px 10px', background: 'var(--bg-2)', border: '1.5px solid var(--line-2)', borderRadius: 10, color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--card)', borderRadius: 20, padding: 22, border: '2px solid var(--ink)' }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, marginBottom: 18 }}>
          {isNew ? 'add event' : 'edit event'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><label style={labelSt}>Day (DD)</label><input style={inputSt} maxLength={2} value={day} onChange={e => setDay(e.target.value)} placeholder="08" /></div>
          <div><label style={labelSt}>Month (MMM)</label><input style={inputSt} maxLength={3} value={mon} onChange={e => setMon(e.target.value.toUpperCase())} placeholder="JUN" /></div>
        </div>
        <div style={{ marginBottom: 10 }}><label style={labelSt}>Event title</label><input style={inputSt} value={title} onChange={e => setTitle(e.target.value)} placeholder="Cleanup drive, Park Street..." /></div>
        <div style={{ marginBottom: 14 }}><label style={labelSt}>Host / team</label><input style={inputSt} value={host} onChange={e => setHost(e.target.value)} placeholder="Welfare team" /></div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelSt}>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {EVENT_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', transition: 'border 0.1s, transform 0.1s', transform: color === c ? 'scale(1.2)' : '' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
            disabled={!day || !mon || !title}
            onClick={() => { if (day && mon && title) onSave({ id: event?.id || Date.now().toString(), day: day.padStart(2,'0'), mon, title, host, color }) }}>
            {isNew ? 'add event' : 'save changes'}
          </button>
          {!isNew && onDelete && (
            <button className="btn btn-sm" style={{ color: '#e05c5c', borderColor: '#e05c5c44' }}
              onClick={() => onDelete(event!.id)}>delete</button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  )
}

const CAT_COLORS_NB: Record<string, string> = {
  events: '#FF6BD6', welfare: '#00E5A0', labs: '#FFC700', operations: '#3DA9FC', content: '#7E5BFF',
}

function NoticeBoardEditModal({ notices, onSave, onClose }: {
  notices: NoticeItem[]
  onSave: (items: NoticeItem[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<NoticeItem[]>(notices.map(n => ({ ...n })))
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [addingTitle, setAddingTitle] = useState<{ post: any; title: string } | null>(null)

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '8px 10px', background: 'var(--bg-2)',
    border: '1.5px solid var(--line-2)', borderRadius: 10, color: 'var(--ink)',
    fontFamily: 'var(--eina)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  const handleSearch = async (q: string) => {
    setSearchQ(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const result = await feedService.getFeed({ page: 1, limit: 8 })
      if (result.success) {
        const filtered = result.data.filter((p: any) =>
          p.body?.toLowerCase().includes(q.toLowerCase()) ||
          p.authorName?.toLowerCase().includes(q.toLowerCase())
        )
        setSearchResults(filtered.slice(0, 5))
      }
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  const pickPost = (post: any) => {
    setAddingTitle({ post, title: post.body?.slice(0, 60) || '' })
    setSearchQ('')
    setSearchResults([])
  }

  const confirmAdd = () => {
    if (!addingTitle || !addingTitle.title.trim()) return
    const item: NoticeItem = {
      id: Date.now().toString(),
      title: addingTitle.title.trim(),
      postUuid: addingTitle.post.uuid,
      postBody: addingTitle.post.body?.slice(0, 100) || '',
      authorName: addingTitle.post.authorName || '',
      category: addingTitle.post.category || 'welfare',
      pinnedAt: new Date().toISOString(),
    }
    setDraft(prev => [...prev, item])
    setAddingTitle(null)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--card)', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--ink)', maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ background: 'var(--mint)', padding: '16px 20px', color: '#0A0A0A', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 18 }}>edit notice board</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 2, opacity: 0.7 }}>pin up to 3 posts — visible to all members</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Current pinned posts */}
          {draft.length === 0 ? (
            <div style={{ padding: '12px 0', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
              no posts pinned yet — search below to add one.
            </div>
          ) : (
            draft.map((item, idx) => {
              const accent = CAT_COLORS_NB[item.category] || '#00E5A0'
              return (
                <div key={item.id} style={{ border: '2px solid var(--ink)', borderRadius: 14, overflow: 'hidden', boxShadow: '2px 2px 0 0 var(--ink)' }}>
                  {/* Accent bar */}
                  <div style={{ height: 4, background: accent }} />
                  <div style={{ padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        style={{ ...inputSt, padding: '6px 8px', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}
                        value={item.title}
                        onChange={e => setDraft(prev => prev.map(n => n.id === item.id ? { ...n, title: e.target.value } : n))}
                        placeholder="Custom title…"
                        maxLength={80}
                      />
                      <div style={{ fontFamily: 'var(--eina)', fontSize: 11, color: 'var(--ink-3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.postBody.slice(0, 70)}{item.postBody.length > 70 ? '…' : ''}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                        by {item.authorName} · <span style={{ color: accent }}>{item.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDraft(prev => prev.filter(n => n.id !== item.id))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16, lineHeight: 1, padding: '4px 6px', borderRadius: 6, transition: 'color 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05c5c')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
                    >×</button>
                  </div>
                </div>
              )
            })
          )}

          {/* Add a post — search */}
          {draft.length < 3 && !addingTitle && (
            <div style={{ borderTop: draft.length > 0 ? '1px dashed var(--line-2)' : 'none', paddingTop: draft.length > 0 ? 12 : 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>
                search posts to pin
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  style={inputSt}
                  value={searchQ}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="search by keyword or author…"
                />
                {searching && (
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>…</span>
                )}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: 6, border: '1.5px solid var(--line-2)', borderRadius: 10, overflow: 'hidden' }}>
                  {searchResults.map((p: any) => {
                    const ac = CAT_COLORS_NB[p.category] || '#00E5A0'
                    const alreadyPinned = draft.some(d => d.postUuid === p.uuid)
                    return (
                      <button
                        key={p.uuid}
                        disabled={alreadyPinned}
                        onClick={() => pickPost(p)}
                        style={{
                          width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '10px 12px',
                          background: alreadyPinned ? 'var(--bg-3)' : 'transparent',
                          border: 'none', borderBottom: '1px solid var(--line)',
                          cursor: alreadyPinned ? 'not-allowed' : 'pointer', opacity: alreadyPinned ? 0.5 : 1,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!alreadyPinned) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ width: 3, background: ac, borderRadius: 2, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.body?.slice(0, 60)}{(p.body?.length || 0) > 60 ? '…' : ''}
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                            {p.authorName} · <span style={{ color: ac }}>{p.category}</span>
                            {alreadyPinned && ' · already pinned'}
                          </div>
                        </div>
                        {!alreadyPinned && <span style={{ color: 'var(--mint)', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: 'center' }}>pin +</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Title entry after picking post */}
          {addingTitle && (
            <div style={{ border: '2px solid var(--mint)', borderRadius: 14, padding: 14, background: 'rgba(0,229,160,0.05)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--mint)', marginBottom: 8 }}>set a title for this notice</div>
              <div style={{ fontFamily: 'var(--eina)', fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                → {addingTitle.post.body?.slice(0, 70)}
              </div>
              <input
                style={{ ...inputSt, marginBottom: 10 }}
                value={addingTitle.title}
                onChange={e => setAddingTitle(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="e.g. Sundarbans relief recap"
                maxLength={80}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') confirmAdd() }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={confirmAdd} disabled={!addingTitle.title.trim()} style={{ background: 'var(--mint)', borderColor: 'var(--mint)', color: '#0A0A0A' }}>add to board ✓</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setAddingTitle(null)}>cancel</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-sm btn-ghost">cancel</button>
          <button onClick={() => { onSave(draft); onClose() }} className="btn btn-sm btn-primary">save board</button>
        </div>
      </div>
    </div>
  )
}

function RightRail({ isDirector = false }: { isDirector?: boolean }) {
  const [events, setEvents] = useState<AQEvent[]>(loadEvents)
  const [editingEvent, setEditingEvent] = useState<AQEvent | null | 'new'>(null)
  const [railOpenRoles, setRailOpenRoles] = useState<any[]>([])
  const [notices, setNotices] = useState<NoticeItem[]>(loadNotices)
  const [editingNotices, setEditingNotices] = useState(false)

  useEffect(() => {
    jobOpenings.getOpen().then(roles => setRailOpenRoles(roles.slice(0, 3))).catch(() => setRailOpenRoles([]))
  }, [])

  const saveAndClose = (evt: AQEvent) => {
    setEvents(prev => {
      const next = prev.find(e => e.id === evt.id)
        ? prev.map(e => e.id === evt.id ? evt : e)
        : [...prev, evt]
      saveEvents(next); return next
    })
    setEditingEvent(null)
  }
  const deleteEvent = (id: string) => {
    setEvents(prev => { const next = prev.filter(e => e.id !== id); saveEvents(next); return next })
    setEditingEvent(null)
  }

  return (
    <aside className="home-right">

      {/* ── NOTICE BOARD ── */}
      <div className="rail-card" style={{ padding: '16px 16px 14px' }}>
        <div className="rail-h" style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 13 }}>notice board</span>
          {isDirector && (
            <button
              onClick={() => setEditingNotices(true)}
              style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
            >
              edit →
            </button>
          )}
        </div>
        {notices.length === 0 ? (
          <div style={{ padding: '8px 0', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            {isDirector ? 'nothing pinned yet — click edit to add posts.' : 'nothing posted yet.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notices.map((item, idx) => {
              const accent = CAT_COLORS_NB[item.category] || '#00E5A0'
              return (
                <Link
                  key={item.id}
                  to={`/post/${item.postUuid}`}
                  style={{ textDecoration: 'none', display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--line)', transition: 'border-color 0.14s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = accent}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--line)'}
                >
                  {/* Numbered accent stripe */}
                  <div style={{ width: 28, background: accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color: accent }}>{idx + 1}</span>
                  </div>
                  <div style={{ padding: '9px 11px', flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontFamily: 'var(--eina)', fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.postBody.slice(0, 55)}{item.postBody.length > 55 ? '…' : ''}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingNotices && (
        <NoticeBoardEditModal
          notices={notices}
          onSave={items => { setNotices(items); saveNotices(items) }}
          onClose={() => setEditingNotices(false)}
        />
      )}

      {/* ── OPEN ROLES ── */}
      <div className="rail-card" style={{ padding: '16px 16px 14px' }}>
        <div className="rail-h" style={{ marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 13 }}>open roles</span>
          <Link to="/opportunities" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mint)', textDecoration: 'none' }}>all →</Link>
        </div>
        {railOpenRoles.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
            no openings right now
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {railOpenRoles.map(op => {
              const accent = JOB_CAT_COLORS[op.category] || '#00E5A0'
              return (
                <Link
                  key={op.id}
                  to="/opportunities"
                  style={{ textDecoration: 'none', display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--line)', transition: 'border-color 0.14s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = accent}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = ''}
                >
                  {/* Accent stripe */}
                  <div style={{ width: 4, background: accent, flexShrink: 0 }} />
                  <div style={{ padding: '10px 12px', flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {op.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{op.category}</span>
                      {op.teamName && <span className="mono xs muted">· {op.teamName}</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        <Link
          to="/opportunities"
          className="btn btn-sm"
          style={{ width: '100%', marginTop: 10, justifyContent: 'center', textDecoration: 'none', fontSize: 11, fontFamily: 'var(--mono)' }}
        >
          view all openings →
        </Link>
      </div>

      {/* ── UPCOMING EVENTS — redesigned ── */}
      <div className="rail-card" style={{ padding: '16px 16px 14px' }}>
        <div className="rail-h" style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 13 }}>upcoming</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isDirector && (
              <button
                onClick={() => setEditingEvent('new')}
                style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mint)', background: 'rgba(0,229,160,0.12)', border: 'none', borderRadius: 999, padding: '3px 9px', cursor: 'pointer', fontWeight: 700 }}
              >
                + add
              </button>
            )}
            <span className="mono xs muted">{events.length}</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11 }}>no events yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map((evt) => (
              <div
                key={evt.id}
                style={{ display: 'flex', gap: 0, borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--line)', cursor: isDirector ? 'pointer' : 'default', transition: 'border-color 0.14s, transform 0.14s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = evt.color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
                onClick={() => isDirector && setEditingEvent(evt)}
              >
                {/* Date column */}
                <div style={{ background: evt.color, padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 52, flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 24, color: '#0A0A0A', lineHeight: 1 }}>{evt.day}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#0A0A0A', letterSpacing: '0.08em', marginTop: 1, opacity: 0.7 }}>{evt.mon}</div>
                </div>
                {/* Info column */}
                <div style={{ flex: 1, padding: '10px 12px', minWidth: 0, background: 'var(--bg-2)' }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 3 }}>
                    {evt.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: evt.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>{evt.host || 'AquaTerra'}</span>
                  </div>
                </div>
                {isDirector && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', background: 'var(--bg-2)', color: 'var(--ink-3)', fontSize: 12 }}>✎</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="rail-foot mono xs muted">
        <span>aquaterra · open access</span>
        <span>· v6 ·</span>
        <span>made with care</span>
      </div>

      {/* Event edit modal */}
      {editingEvent !== null && (
        <EventEditModal
          event={editingEvent === 'new' ? null : editingEvent}
          onSave={saveAndClose}
          onDelete={editingEvent !== 'new' ? deleteEvent : undefined}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </aside>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated, member } = useAuth()
  const [posts, setPosts] = useState<(Post | SamplePost)[]>([])
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('latest')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const isActive = isAuthenticated && member?.status === 'active'

  const fetchPosts = useCallback(async (pageNum: number, cat: string, append = false) => {
    if (append) setIsLoadingMore(true)
    else setLoading(true)
    try {
      const result = await feedService.getFeed({ page: pageNum, limit: 20, category: cat || undefined })
      if (result.success) {
        if (append) setPosts(prev => [...prev, ...result.data])
        else setPosts(result.data)
        setHasMore(result.pagination.hasNextPage)
      } else if (!append) {
        setPosts(applySampleLikes(SAMPLE_POSTS)); setHasMore(false)
      }
    } catch {
      if (!append) { setPosts(applySampleLikes(SAMPLE_POSTS)); setHasMore(false) }
    } finally {
      setLoading(false); setIsLoadingMore(false)
    }
  }, [])

  const fetchPublicPosts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await feedService.getFeed({ page: 1, limit: 10 })
      if (result.success && result.data.length > 0) setPosts(result.data)
      else setPosts(applySampleLikes(SAMPLE_POSTS))
    } catch {
      setPosts(applySampleLikes(SAMPLE_POSTS))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isActive) fetchPosts(1, filter)
    else fetchPublicPosts()
  }, [isActive, filter, fetchPosts, fetchPublicPosts])

  const handleFilterClick = (k: string) => {
    setPage(1); setFilter(k)
  }

  const handlePostCreated = () => { setPage(1); if (isActive) fetchPosts(1, filter) }

  // Client-side sort
  let displayed = [...posts]
  if (filter) displayed = displayed.filter(p => (p as any).category === filter)
  if (sort === 'trending') displayed = displayed.sort((a, b) => ((b as any).likeCount || 0) - ((a as any).likeCount || 0))

  const avatarColor = hashColor(member?.full_name || member?.uuid || '')
  const memberInitials = getInitials(member?.full_name || 'U')

  return (
    <div className="route-enter">
      <ParadoxBanner />
      <div className="home-shell">
        {/* LEFT RAIL */}
        <LeftRail
          member={isActive ? member : null}
          filter={filter}
          setFilter={handleFilterClick}
          postCount={displayed.length}
        />

        {/* CENTER FEED */}
        <main className="home-center">
          <header className="home-feed-head">
            <div>
              <h1 className="h-display home-feed-title">
                the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>feed</span>.
              </h1>
              <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                {filter || 'everything'} · {sort} · {displayed.length} posts
              </p>
            </div>
            <div className="row gap-2">
              <button className={'chip ' + (sort === 'latest' ? 'chip-active' : '')} onClick={() => setSort('latest')}><I.pulse /> latest</button>
              <button className={'chip ' + (sort === 'trending' ? 'chip-active' : '')} onClick={() => setSort('trending')}><I.fire /> trending</button>
              <Link to="/opportunities" className="chip" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <I.star /> openings
              </Link>
            </div>
          </header>

          {/* compose */}
          {isActive && (
            <div className="card home-compose">
              <div className="avatar" style={{ background: avatarColor, overflow: 'hidden', flexShrink: 0 }}>
                {member?.avatar_url
                  ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : memberInitials}
              </div>
              <button className="input home-compose-input" onClick={() => setShowCreateModal(true)}>
                what did you make today?
              </button>
              <div className="row gap-1">
                <button className="btn btn-sm btn-ghost" onClick={() => setShowCreateModal(true)} title="photo"><I.camera /></button>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowCreateModal(true)} title="link"><I.link /></button>
                <button className="btn btn-sm btn-primary" onClick={() => setShowCreateModal(true)}><I.plus /> Post</button>
              </div>
            </div>
          )}

          {/* mobile category chips */}
          <div className="home-mobile-cats row gap-2">
            {CATS.map(c => (
              <button key={c.k} className={'chip ' + (filter === c.k ? 'chip-active' : '')} onClick={() => handleFilterClick(c.k)}>{c.l}</button>
            ))}
          </div>

          {/* feed list */}
          <div className="home-feed-list">
            {loading && displayed.length === 0 ? (
              [0, 1, 2].map(i => (
                <div key={i} className="feed-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--line)', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ width: '60%', height: 13, background: 'var(--line)', borderRadius: 4 }} />
                      <div style={{ width: '40%', height: 11, background: 'var(--line)', borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ height: 160, background: 'var(--line)', borderRadius: 12 }} />
                </div>
              ))
            ) : displayed.length === 0 ? (
              <div className="card" style={{ padding: 50, textAlign: 'center' }}>
                <span className="sticker sticker-pink wobble">★ empty</span>
                <div className="h-display" style={{ fontSize: 32, marginTop: 14 }}>nothing here yet.</div>
                <p className="muted" style={{ marginTop: 6 }}>try another filter — or post the first one.</p>
              </div>
            ) : (
              displayed.map((post, i) => (
                <FeedPostCard
                  key={(post as any).uuid || i}
                  post={post as AnyPost}
                  seed={i}
                  onLike={() => { if (isActive) fetchPosts(1, filter) }}
                />
              ))
            )}

            {!loading && hasMore && isActive && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={isLoadingMore}
                  onClick={() => {
                    const p = page + 1
                    setPage(p)
                    fetchPosts(p, filter, true)
                  }}
                  style={{ width: '100%' }}
                >
                  {isLoadingMore ? 'loading…' : 'load more →'}
                </button>
              </div>
            )}

            {!loading && displayed.length > 0 && !hasMore && (
              <div style={{ textAlign: 'center', padding: '30px 0 0' }}>
                <span className="sticker sticker-ghost">★ that's all for now</span>
                <p className="mono xs muted" style={{ marginTop: 10 }}>more posts coming · refresh in a sec</p>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT RAIL */}
        <RightRail isDirector={isAuthenticated && hasLeaderAccess(member?.role)} />
      </div>

      {isActive && (
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  )
}
