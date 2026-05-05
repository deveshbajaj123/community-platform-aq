import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import directorService from '../services/directorService'
import { Post } from '../services/api'
import { DEPT_COLORS } from '../lib/supabase'
import { getCategoryInfo } from '../feed/CategoryFilter'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const PostModeration = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [rejectingPost, setRejectingPost] = useState<Post | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async (pageNum: number, append = false) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true)
    try {
      const result = await directorService.getPendingPosts({ page: pageNum, limit: 20 })
      if (result.success) {
        if (append) setPosts(prev => [...prev, ...result.data])
        else setPosts(result.data)
        setHasMore(result.pagination.hasNextPage)
      }
    } catch { setError('Failed to load pending posts') }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }

  useEffect(() => { fetchPosts(1) }, [])

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchPosts(p, true) }

  const handleApprove = async (post: Post) => {
    setActionLoading(post.postId); setError(null)
    try {
      const result = await directorService.approvePost(post.postId)
      if (result.success) {
        setPosts(prev => prev.filter(p => p.postId !== post.postId))
        setSuccess('Post approved and published')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch { setError('Failed to approve post') }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectingPost || !rejectionNote.trim()) return
    setIsRejecting(true); setError(null)
    try {
      const result = await directorService.rejectPost(rejectingPost.postId, rejectionNote)
      if (result.success) {
        setPosts(prev => prev.filter(p => p.postId !== rejectingPost.postId))
        setSuccess('Post rejected')
        setTimeout(() => setSuccess(null), 3000)
        closeRejectModal()
      }
    } catch { setError('Failed to reject post') }
    finally { setIsRejecting(false) }
  }

  const openRejectModal = (post: Post) => { setRejectingPost(post); setRejectionNote('') }
  const closeRejectModal = () => { setRejectingPost(null); setRejectionNote('') }

  const formatDate = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const labelSt: React.CSSProperties = { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }

  if (isLoading) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.06em' }}>LOADING...</div>
      </div>
    )
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link to="/director" className="aq-nav-ghost-btn">←</Link>
          <div>
            <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Post Moderation</h1>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 2 }}>Review and approve posts before publishing</p>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div style={{ background: 'rgba(42,157,110,0.12)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent)', fontFamily: 'var(--f-display)', fontSize: 12 }}>✓ {success}</div>
        )}
        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            {error}<button onClick={() => setError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button>
          </div>
        )}

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 16, color: 'var(--accent)' }}>✓</div>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>All posts reviewed!</p>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>No pending posts to moderate.</p>
          </div>
        ) : (
          <>
            {posts.map(post => {
              const catInfo = getCategoryInfo(post.category)
              const catColor = DEPT_COLORS[post.category] || 'var(--accent)'
              return (
                <div key={post.postId} className="aq-post-card" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: 3, background: catColor }} />
                  <div style={{ padding: '16px 18px' }}>
                    {/* Author row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                      <Link to={`/profile/${post.authorUuid}`} style={{ flexShrink: 0 }}>
                        <div className="aq-avatar" style={{ width: 34, height: 34, fontSize: 11, background: catColor, overflow: 'hidden' }}>
                          {post.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(post.authorName)}
                        </div>
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/profile/${post.authorUuid}`} style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.authorName}</Link>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 2 }}>
                          <span>{formatDate(post.createdAt)}</span>
                          <span style={{ color: catColor }}>{catInfo.emoji} {catInfo.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--txt)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.body}</p>

                    {/* Tagged members */}
                    {post.taggedMembers && post.taggedMembers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {post.taggedMembers.map((m: { uuid: string; fullName: string }) => (
                          <Link key={m.uuid} to={`/profile/${m.uuid}`}
                            style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--accent)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r-pill)', padding: '2px 8px', textDecoration: 'none' }}>
                            @{m.fullName}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Images */}
                    {post.images && post.images.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr', gap: 6, marginBottom: 12, borderRadius: 'var(--r)', overflow: 'hidden' }}>
                        {post.images.map((img, i) => <img key={i} src={img.blobUrl} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />)}
                      </div>
                    )}

                    {/* Link preview */}
                    {post.linkUrl && (
                      <a href={post.linkUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', marginBottom: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', textDecoration: 'none' }}>
                        {post.linkImage && <img src={post.linkImage} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 'var(--r-sm)', marginBottom: 6 }} />}
                        {post.linkTitle && <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', marginBottom: 4 }}>{post.linkTitle}</p>}
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.linkUrl}</p>
                      </a>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                      <button onClick={() => handleApprove(post)} disabled={actionLoading !== null}
                        style={{ flex: 1, background: 'rgba(42,157,110,0.15)', color: 'var(--accent)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '8px 14px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: actionLoading !== null ? 0.6 : 1 }}>
                        {actionLoading === post.postId ? '...' : '✓ Approve'}
                      </button>
                      <button onClick={() => openRejectModal(post)} disabled={actionLoading !== null}
                        style={{ flex: 1, background: 'rgba(224,92,92,0.1)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r)', padding: '8px 14px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: actionLoading !== null ? 0.6 : 1 }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <div style={{ textAlign: 'center', paddingTop: 16 }}>
                <button onClick={handleLoadMore} disabled={isLoadingMore} className="aq-btn aq-btn-outline aq-btn-sm">
                  {isLoadingMore ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingPost && (
        <div className="aq-modal-overlay" onClick={closeRejectModal}>
          <div className="aq-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Reject Post</div>
              <button onClick={closeRejectModal} className="aq-nav-ghost-btn">✕</button>
            </div>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', marginBottom: 12 }}>
              Reject this post by <strong style={{ color: 'var(--txt)' }}>{rejectingPost.authorName}</strong>?
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--txt-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{rejectingPost.body}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Rejection reason *</label>
              <textarea className="aq-input" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={3}
                placeholder="Reason for rejection (visible to author)..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeRejectModal} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
              <button onClick={handleReject} disabled={!rejectionNote.trim() || isRejecting}
                style={{ background: 'rgba(224,92,92,0.15)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '8px 18px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: !rejectionNote.trim() || isRejecting ? 0.5 : 1 }}>
                {isRejecting ? '...' : 'Reject Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostModeration
