import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import directorService, { DirectoryMember } from '../services/directorService'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../auth/AuthContext'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const MemberDirectory = () => {
  const { member: currentMember } = useAuth()
  const isSuperAdmin = currentMember?.isSuperAdmin || false

  const [members, setMembers] = useState<DirectoryMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalMembers, setTotalMembers] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ memberId: number; fullName: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const fetchMembers = useCallback(async (pageNum: number, searchQuery: string, append = false) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true)
    try {
      const result = await directorService.getMemberDirectory({ page: pageNum, limit: 20, search: searchQuery })
      if (result.success) {
        if (append) setMembers(prev => [...prev, ...result.data])
        else setMembers(result.data)
        setHasMore(result.pagination.hasNextPage)
        setTotalMembers(result.pagination.totalItems)
      }
    } catch { console.error('Failed to load members') }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }, [])

  useEffect(() => { setPage(1); fetchMembers(1, debouncedSearch) }, [debouncedSearch, fetchMembers])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true); setDeleteError(null)
    try {
      const result = await directorService.deleteMember(deleteTarget.memberId)
      setDeleteSuccess(result.message || `${deleteTarget.fullName}'s account has been deleted`)
      setDeleteTarget(null); setPage(1); fetchMembers(1, debouncedSearch)
    } catch (error: any) { setDeleteError(error.response?.data?.message || 'Failed to delete member') }
    finally { setIsDeleting(false) }
  }

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchMembers(p, debouncedSearch, true) }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown'
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return 'Invalid Date' }
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link to="/director" className="aq-nav-ghost-btn">←</Link>
          <div>
            <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Member Directory</h1>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 2 }}>{totalMembers} active member{totalMembers !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="aq-input" style={{ paddingLeft: 38 }} />
        </div>

        {/* Alerts */}
        {deleteError && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            {deleteError}<button onClick={() => setDeleteError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button>
          </div>
        )}
        {deleteSuccess && (
          <div style={{ background: 'rgba(42,157,110,0.12)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent)', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            ✓ {deleteSuccess}<button onClick={() => setDeleteSuccess(null)} style={{ background: 'none', color: 'var(--accent)' }}>✕</button>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.06em' }}>LOADING...</div>
        ) : members.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>
              {search ? 'No members found' : 'No active members yet'}
            </p>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>
              {search ? 'Try a different search term' : 'Approved members will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 20 }}>
              {members.map(member => (
                <div key={member.memberId} style={{ position: 'relative' }}>
                  <Link to={`/profile/${member.uuid}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="aq-post-card" style={{ padding: '14px 16px', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div className="aq-avatar" style={{ width: 40, height: 40, fontSize: 14, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                          {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(member.fullName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                            <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.fullName}</span>
                            {member.role === 'director' && (
                              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(42,157,110,0.4)', borderRadius: 'var(--r-pill)', padding: '1px 5px', flexShrink: 0 }}>Director</span>
                            )}
                          </div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{member.email}</div>
                          {member.classGrade && <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{member.classGrade}</div>}
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--txt-4)', marginTop: 4 }}>Joined {formatDate(member.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setDeleteTarget({ memberId: member.memberId, fullName: member.fullName, email: member.email })}
                      style={{ position: 'absolute', top: 10, right: 10, background: 'none', color: 'var(--txt-4)', fontSize: 12, padding: 4, borderRadius: 'var(--r-sm)', transition: 'color 0.12s' }}
                      title="Delete account"
                      onMouseEnter={e => (e.currentTarget.style.color = '#e05c5c')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt-4)')}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center' }}>
                <button onClick={handleLoadMore} disabled={isLoadingMore} className="aq-btn aq-btn-outline aq-btn-sm">
                  {isLoadingMore ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="aq-modal-overlay" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="aq-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Delete Account</div>
              <button onClick={() => setDeleteTarget(null)} className="aq-nav-ghost-btn" disabled={isDeleting}>✕</button>
            </div>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', marginBottom: 10 }}>
              Delete <strong style={{ color: 'var(--txt)' }}>{deleteTarget.fullName}</strong>'s account ({deleteTarget.email})?
            </p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#e05c5c', marginBottom: 20, lineHeight: 1.6 }}>
              This permanently deletes their account, posts, comments, likes, and session data. This cannot be undone.
            </p>
            {deleteError && (
              <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '8px 12px', marginBottom: 16, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12 }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ background: 'rgba(224,92,92,0.15)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '8px 18px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: isDeleting ? 0.6 : 1 }}>
                {isDeleting ? '...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDirectory
