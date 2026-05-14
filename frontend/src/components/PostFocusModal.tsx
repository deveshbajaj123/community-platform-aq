import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import { I, LikeButton } from './v6Shared'

const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
function hashColor(s: string) { let h=0; for(let i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length] }
function timeAgo(iso: string) {
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000)
  if(d<60) return 'just now'; if(d<3600) return `${Math.floor(d/60)}m`
  if(d<86400) return `${Math.floor(d/3600)}h`; return `${Math.floor(d/86400)}d ago`
}
const CAT_COLORS: Record<string,string> = { events:'#FF6BD6', welfare:'#00E5A0', labs:'#FFC700', operations:'#3DA9FC', content:'#7E5BFF' }

interface PostFocusModalProps {
  post: Post
  onClose: () => void
}

export default function PostFocusModal({ post, onClose }: PostFocusModalProps) {
  const navigate = useNavigate()
  const { member, isAuthenticated } = useAuth()
  const [liked, setLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const accent = CAT_COLORS[post.category] || '#00E5A0'
  const authorColor = hashColor(post.authorName || '')
  const initials = (post.authorName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const profilePath = member ? `/profile/${post.authorUuid}` : `/member/${post.authorUuid}`

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleLike = async () => {
    if (!isAuthenticated) { navigate('/login'); onClose(); return }
    if (isLiking) return
    const wasLiked = liked
    setLiked(!wasLiked); setLikeCount(c => wasLiked ? c-1 : c+1); setIsLiking(true)
    try {
      const r = await feedService.toggleLike(post.uuid)
      if (r.success) { setLiked(r.data.liked); setLikeCount(r.data.likeCount) }
    } catch { setLiked(wasLiked); setLikeCount(c => wasLiked ? c+1 : c-1) }
    setIsLiking(false)
  }

  return createPortal(
    <>
      {/* Blurred backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          animation: 'focusBgIn 0.22s cubic-bezier(0.2,0,0,1)',
        }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 560,
            background: 'var(--card)',
            borderRadius: 20,
            border: '2px solid var(--ink)',
            boxShadow: '6px 6px 0 0 var(--ink)',
            maxHeight: '88dvh',
            overflowY: 'auto',
            animation: 'focusCardIn 0.24s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Accent bar */}
          <div style={{ height: 4, background: accent, borderRadius: '18px 18px 0 0' }} />

          {/* Header */}
          <div style={{ padding: '16px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to={profilePath} onClick={e => { e.stopPropagation(); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div className="avatar" style={{ background: authorColor, width: 38, height: 38, fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
                {post.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} referrerPolicy="no-referrer" /> : initials}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{post.authorName}</div>
                <div className="mono xs muted">{timeAgo(post.createdAt)}</div>
              </div>
            </Link>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={'chip cat-' + post.category} style={{ fontSize: 10 }}>{post.category}</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20, lineHeight: 1, padding: '6px 8px', borderRadius: 8 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
              >✕</button>
            </div>
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div style={{ margin: '14px 0 0', overflow: 'hidden' }}>
              {post.images.length === 1 ? (
                <img
                  src={(post.images[0] as any).blobUrl || (post.images[0] as any).url}
                  alt=""
                  style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                  onClick={() => setLightboxSrc((post.images![0] as any).blobUrl || (post.images![0] as any).url)}
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {post.images.slice(0, 4).map((img: any, i: number) => (
                    <img key={i} src={img.blobUrl || img.url} alt=""
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', cursor: 'zoom-in' }}
                      onClick={() => setLightboxSrc(img.blobUrl || img.url)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '16px 18px' }}>
            <p style={{ fontFamily: 'var(--eina)', fontSize: 15, lineHeight: 1.78, color: 'var(--ink)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {post.body}
            </p>
            {(post as any).linkUrl && (
              <a href={(post as any).linkUrl} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="feed-link-cta"
                style={{ marginTop: 14, display: 'inline-flex' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                {(post as any).linkTitle || (post as any).linkUrl.replace(/^https?:\/\//,'').slice(0,40)}
              </a>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <LikeButton liked={liked} count={likeCount} onToggle={handleLike} />
            <button className="btn btn-sm btn-ghost" onClick={() => { onClose(); navigate(`/post/${post.uuid}#comments`) }}>
              <I.comment />
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{post.commentCount || 0}</span>
            </button>
            <span style={{ flex: 1 }} />
            <button className="btn btn-sm btn-ghost" onClick={() => { onClose(); navigate(`/post/${post.uuid}`) }}
              style={{ fontFamily: 'var(--mono)', fontSize: 11, color: accent }}>
              full post →
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="aq-lightbox-overlay" onClick={() => setLightboxSrc(null)} style={{ zIndex: 500 }}>
          <img src={lightboxSrc} alt="" className="aq-lightbox-img" onClick={e => e.stopPropagation()} />
          <button className="aq-lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
        </div>
      )}
    </>,
    document.body
  )
}
