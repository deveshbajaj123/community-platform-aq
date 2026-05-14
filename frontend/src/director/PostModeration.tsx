import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import directorService from '../services/directorService'
import { Post } from '../services/api'
import { DEPT_COLORS } from '../lib/supabase'
import { getCategoryInfo } from '../feed/CategoryFilter'
import { I } from '../components/v6Shared'

const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

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
        if (append) setPosts(prev => [...prev, ...result.data]); else setPosts(result.data)
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (err: any) {
      const msg = err?.message || err?.error_description || JSON.stringify(err)
      setError(`Could not load posts queue — ${msg}`)
      console.error('[PostModeration] fetchPosts error:', err)
    }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }

  useEffect(() => { fetchPosts(1) }, [])

  const handleApprove = async (post: Post) => {
    setActionLoading(post.postId); setError(null)
    try {
      const result = await directorService.approvePost(post.postId)
      if (result.success) {
        setPosts(prev => prev.filter(p => p.postId !== post.postId))
        setSuccess('post approved and published.'); setTimeout(() => setSuccess(null), 3000)
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
        setSuccess('post rejected.'); setTimeout(() => setSuccess(null), 3000)
        setRejectingPost(null); setRejectionNote('')
      }
    } catch { setError('Failed to reject post') }
    finally { setIsRejecting(false) }
  }

  if (isLoading) {
    return (
      <div className="dir-page">
        <div className="sk-group">
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ marginBottom: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="v6-skeleton sk-circle" style={{ width: 36, height: 36 }} />
                <div style={{ flex: 1 }}><div className="v6-skeleton" style={{ width: '40%', height: 13, marginBottom: 6 }} /><div className="v6-skeleton" style={{ width: '25%', height: 10 }} /></div>
                <div className="v6-skeleton sk-pill" style={{ width: 70, height: 22 }} />
              </div>
              <div className="v6-skeleton" style={{ height: 14, width: '90%' }} />
              <div className="v6-skeleton" style={{ height: 14, width: '70%' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <div className="v6-skeleton sk-pill" style={{ width: 80, height: 34 }} />
                <div className="v6-skeleton sk-pill" style={{ width: 80, height: 34 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="route-enter dir-page">
      <div className="row gap-2" style={{ marginBottom: 24, alignItems: 'center' }}>
        <Link to="/director" className="btn btn-sm">← back</Link>
        <div>
          <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', margin: 0, lineHeight: 1 }}>
            post moderation<span style={{ color: 'var(--pink)' }}>.</span>
          </h1>
          <p className="mono xs muted" style={{ marginTop: 4 }}>{posts.length} waiting for review</p>
        </div>
      </div>

      {success && <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--mint)' }}><span style={{ color: 'var(--mint)', fontWeight: 700 }}>✓ {success}</span></div>}
      {error && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', borderLeft: '4px solid #FF4D2E' }}>
          <span style={{ color: '#FF4D2E' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D2E' }}>✕</button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>all clear.</div>
          <p className="muted" style={{ marginTop: 8 }}>no posts pending moderation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => {
            const catInfo = getCategoryInfo(post.category)
            const catColor = (DEPT_COLORS as Record<string, string>)[post.category] || DEPT_COLORS.all
            return (
              <div key={post.postId} className="card" style={{ padding: 0, overflow: 'hidden', borderTop: `6px solid ${catColor}` }}>
                <div style={{ padding: 20 }}>
                  <div className="row gap-3" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
                    <Link to={`/profile/${post.authorUuid}`} style={{ textDecoration: 'none' }}>
                      <div className="avatar" style={{ background: catColor, overflow: 'hidden', width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
                        {post.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : getInitials(post.authorName)}
                      </div>
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                        <Link to={`/profile/${post.authorUuid}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', textDecoration: 'none' }}>{post.authorName}</Link>
                        <span className={'chip cat-' + post.category} style={{ fontSize: 10 }}>{catInfo.emoji} {catInfo.label}</span>
                        <span className="mono xs muted">{timeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', marginBottom: 14 }}>{post.body}</p>

                  {post.taggedMembers && post.taggedMembers.length > 0 && (
                    <div className="row gap-2 flex-wrap" style={{ marginBottom: 12 }}>
                      {post.taggedMembers.map((m: { uuid: string; fullName: string }) => (
                        <Link key={m.uuid} to={`/profile/${m.uuid}`} className="chip" style={{ fontSize: 11 }}>@{m.fullName}</Link>
                      ))}
                    </div>
                  )}

                  {post.images && post.images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr', gap: 4, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                      {post.images.map((img, i) => <img key={i} src={img.blobUrl} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />)}
                    </div>
                  )}

                  {post.linkUrl && (
                    <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="card" style={{ display: 'block', padding: '10px 14px', marginBottom: 14, textDecoration: 'none' }}>
                      {post.linkTitle && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{post.linkTitle}</div>}
                      <div className="mono xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.linkUrl}</div>
                    </a>
                  )}

                  <div className="row gap-2" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                    <button onClick={() => handleApprove(post)} disabled={actionLoading !== null} className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      {actionLoading === post.postId ? '...' : <><I.check /> approve</>}
                    </button>
                    <button onClick={() => { setRejectingPost(post); setRejectionNote('') }} disabled={actionLoading !== null} className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', color: '#FF4D2E', borderColor: '#FF4D2E' }}>
                      ✕ reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {hasMore && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { const p = page + 1; setPage(p); fetchPosts(p, true) }} disabled={isLoadingMore} className="btn btn-sm">
                {isLoadingMore ? 'loading...' : 'load more →'}
              </button>
            </div>
          )}
        </div>
      )}

      {rejectingPost && (
        <div className="modal-back" onClick={() => { setRejectingPost(null); setRejectionNote('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="sticker sticker-pink">✕ REJECT POST</span>
              <button className="btn btn-sm" onClick={() => { setRejectingPost(null); setRejectionNote('') }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12, color: 'var(--ink-2)' }}>
                reject this post by <strong style={{ color: 'var(--ink)' }}>{rejectingPost.authorName}</strong>? they will see the reason below.
              </p>
              <div className="card" style={{ padding: '10px 14px', marginBottom: 14, background: 'var(--bg-2)' }}>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, margin: 0 }}>{rejectingPost.body}</p>
              </div>
              <label htmlFor="pm-note" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>rejection reason *</label>
              <textarea id="pm-note" className="textarea" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={3} placeholder="be specific. the author will see this." />
              <div className="row gap-2" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button onClick={() => { setRejectingPost(null); setRejectionNote('') }} className="btn btn-sm">cancel</button>
                <button onClick={handleReject} disabled={!rejectionNote.trim() || isRejecting} className="btn btn-sm" style={{ background: '#FF4D2E', color: '#fff', border: 'none' }}>
                  {isRejecting ? '...' : 'reject post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostModeration
