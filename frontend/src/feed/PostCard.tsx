import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import { DEPT_COLORS } from '../lib/supabase'

interface Liker {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  role: 'member' | 'director'
  likedAt: string
}

interface PostCardProps {
  post: Post
  onDelete?: (postId: number) => void
  isPublicView?: boolean
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const PostCard = ({ post, onDelete, isPublicView = false }: PostCardProps) => {
  const { member } = useAuth()
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [isLiking, setIsLiking] = useState(false)
  const [justLiked, setJustLiked] = useState(false) // drives the pop animation once
  const [showMenu, setShowMenu] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const [likers, setLikers] = useState<Liker[]>([])
  const [isLoadingLikers, setIsLoadingLikers] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const catColor = DEPT_COLORS[post.category] || DEPT_COLORS.all
  const isOwner = member?.uuid === post.authorUuid
  const isDirector = member?.role === 'director'
  const getProfileLink = (uuid: string) => member ? `/profile/${uuid}` : `/member/${uuid}`

  const handleLike = async () => {
    if (isPublicView || !member) { navigate('/login'); return }
    if (isLiking) return
    setIsLiking(true)
    const prevLiked = isLiked, prevCount = likeCount
    const willLike = !isLiked
    setIsLiked(willLike)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
    if (willLike) { setJustLiked(true); setTimeout(() => setJustLiked(false), 400) }
    try {
      const result = await feedService.toggleLike(post.uuid)
      if (result.success) { setIsLiked(result.data.liked); setLikeCount(result.data.likeCount) }
    } catch { setIsLiked(prevLiked); setLikeCount(prevCount) }
    finally { setIsLiking(false) }
  }

  const openLikers = async () => {
    if (likeCount === 0) return
    setShowLikers(true); setIsLoadingLikers(true)
    try {
      const result = await feedService.getLikers(post.uuid, { limit: 100 })
      if (result.success) setLikers(result.data)
    } catch { console.error('Failed to load likers') }
    finally { setIsLoadingLikers(false) }
  }

  const handleSharePost = async () => {
    const url = `${window.location.origin}/post/${post.uuid}`
    try { await navigator.clipboard.writeText(url) }
    catch { const el = document.createElement('input'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el) }
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try { await feedService.deletePost(post.uuid); onDelete?.(post.postId) }
    catch { console.error('Failed to delete post') }
    setShowMenu(false)
  }

  const participants = [{ uuid: post.authorUuid, fullName: post.authorName, avatarUrl: post.authorAvatar }, ...(post.taggedMembers || []).map(m => ({ uuid: m.uuid, fullName: m.fullName, avatarUrl: m.avatarUrl }))]

  return (
    <>
      <article className="aq-post-card">
        {/* Left dept colour rule */}
        <div className="post-cat-rule" style={{ background: catColor }} />

        <div className="post-in">
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', marginLeft: -4 }}>
            {participants.slice(0, 3).map(p => (
              <Link key={p.uuid} to={getProfileLink(p.uuid)} style={{ marginLeft: -4 }}>
                <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: catColor, border: '2px solid var(--bg)', overflow: 'hidden' }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : (p.fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)
                  }
                </div>
              </Link>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {participants.slice(0, 3).map((p, i) => (
                <span key={p.uuid}>
                  <Link to={getProfileLink(p.uuid)} style={{ color: 'inherit', transition: 'color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt)')}
                  >{p.fullName}</Link>
                  {i < Math.min(participants.length, 3) - 1 && ', '}
                </span>
              ))}
              {participants.length > 3 && <span style={{ color: 'var(--txt-4)' }}> +{participants.length - 3} more</span>}
            </div>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 10, color: 'var(--txt-3)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {post.category && <span style={{ color: catColor }}>{post.category}</span>}
              {post.teamName && <Link to={`/teams/${post.teamUuid}`} style={{ color: 'var(--txt-3)' }}>{post.teamName}</Link>}
            </div>
            <div className="aq-mono" style={{ color: 'var(--txt-4)', marginTop: 2 }}>{timeAgo(post.createdAt)}</div>
          </div>

          {/* Menu */}
          {(isOwner || isDirector) && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setShowMenu(!showMenu)} className="aq-nav-ghost-btn" aria-label="Options">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></svg>
              </button>
              {showMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                  <div style={{ position: 'absolute', right: 0, top: 40, zIndex: 20, background: 'var(--bg-3)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-md)', padding: 6, minWidth: 140, boxShadow: 'var(--shadow-lg)', animation: 'ddIn 0.16s var(--ease)' }}>
                    <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', minHeight: 40, fontFamily: 'var(--f-display)', fontSize: 12, color: '#e05c5c', borderRadius: 'var(--r-sm)', transition: 'background 0.12s, transform 0.12s var(--ease)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,92,92,0.1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                      onMouseUp={e => (e.currentTarget.style.transform = '')}
                    >Delete</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pending badge */}
        {post.status === 'pending_review' && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 'var(--r-pill)', background: 'rgba(212,98,10,0.12)', color: 'var(--c-events)', border: '1px solid rgba(212,98,10,0.2)' }}>
              Awaiting approval
            </span>
          </div>
        )}

        {/* Body */}
        <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--txt)', marginBottom: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {post.body}
        </p>

        {/* Images — concentric: card r-md (16px) → image r-xs (6px) at ~12px effective inner padding */}
        {post.images && post.images.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            {post.images.length === 1 ? (
              <div style={{ borderRadius: 'var(--r-xs)', overflow: 'hidden', background: 'var(--bg-2)' }}>
                <img src={post.images[0].blobUrl} alt="" style={{ maxHeight: 520, width: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="aq-post-card-img-grid" style={{ gridTemplateColumns: post.images.length >= 2 ? '1fr 1fr' : '1fr' }}>
                {post.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img.blobUrl} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Link preview — concentric: card r-md (16px) → preview r-sm (10px) → inner image r-xs (6px) */}
        {post.linkUrl && (
          <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginBottom: 14, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-2)')}
          >
            {post.linkImage && <img src={post.linkImage} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--r-xs)', marginBottom: 8 }} />}
            {post.linkTitle && <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{post.linkTitle}</p>}
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.linkUrl}</p>
          </a>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <button onClick={handleLike} disabled={isLiking} className={`aq-post-action${isLiked ? ' liked' : ''}${justLiked ? ' liked' : ''}`} aria-label={isLiked ? 'Unlike' : 'Like'} style={{ fontSize: 16 }}>
            {isLiked ? '♥' : '♡'}
          </button>
          <button onClick={openLikers} disabled={likeCount === 0} className="aq-post-action" aria-label={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'} — view likers`}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{likeCount}</span> {likeCount === 1 ? 'like' : 'likes'}
          </button>
          <button onClick={handleSharePost} className="aq-post-action" style={{ marginLeft: 'auto', color: linkCopied ? 'var(--accent)' : undefined }} aria-label={linkCopied ? 'Link copied' : 'Share post — copy link'} title="Copy link">
            {linkCopied ? '✓ Copied' : '↗ Share'}
          </button>
        </div>
        </div>{/* /post-in */}
      </article>

      {/* Likers Modal */}
      {showLikers && (
        <div className="aq-modal-overlay" onClick={() => setShowLikers(false)}>
          <div className="aq-modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
              </div>
              <button onClick={() => setShowLikers(false)} className="aq-nav-ghost-btn">✕</button>
            </div>
            {isLoadingLikers ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt-3)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>LOADING...</div>
            ) : likers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--txt-3)', fontFamily: 'var(--f-serif)', fontStyle: 'italic' }}>No likes yet</p>
            ) : (
              <div>
                {likers.map(liker => (
                  <Link key={liker.memberId} to={getProfileLink(liker.uuid)} onClick={() => setShowLikers(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
                    <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: 'var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
                      {liker.avatarUrl ? <img src={liker.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (liker.fullName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {liker.fullName}
                        {liker.role === 'director' && <span style={{ marginLeft: 8, fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Director</span>}
                      </div>
                      {liker.classGrade && <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{liker.classGrade}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default PostCard
