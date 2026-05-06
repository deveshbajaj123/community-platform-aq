import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import directorService, { PendingMember } from '../services/directorService'
import { useAuth } from '../auth/AuthContext'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const AccountApprovals = () => {
  const { member: currentMember } = useAuth()
  const isSuperAdmin = currentMember?.role === 'super_admin'

  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [members, setMembers] = useState<PendingMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [rejectingMember, setRejectingMember] = useState<PendingMember | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSuperAdmin) { setHasAccess(true); return }
    directorService.getMyCategories()
      .then(result => {
        const cats = result.success ? result.data.categories.map((c: any) => c.category) : []
        setHasAccess(cats.includes('operations'))
      })
      .catch(() => setHasAccess(false))
  }, [isSuperAdmin])

  const fetchMembers = async (pageNum: number, append = false) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true)
    try {
      const result = await directorService.getPendingApprovals({ page: pageNum, limit: 20 })
      if (result.success) {
        if (append) setMembers(prev => [...prev, ...result.data])
        else setMembers(result.data)
        setHasMore(result.pagination.hasNextPage)
      }
    } catch { setError('Failed to load pending approvals') }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }

  useEffect(() => {
    if (hasAccess === true) fetchMembers(1)
    else if (hasAccess === false) setIsLoading(false)
  }, [hasAccess])

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchMembers(p, true) }

  const handleApprove = async (member: PendingMember) => {
    setActionLoading(member.memberId); setError(null)
    try {
      const result = await directorService.approveMember(member.memberId)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.memberId !== member.memberId))
        setSuccess(`${member.fullName} has been approved`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch { setError('Failed to approve member') }
    finally { setActionLoading(null) }
  }

  const handleReject = async () => {
    if (!rejectingMember || !rejectionNote.trim()) return
    setIsRejecting(true); setError(null)
    try {
      const result = await directorService.rejectMember(rejectingMember.memberId, rejectionNote)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.memberId !== rejectingMember.memberId))
        setSuccess(`${rejectingMember.fullName}'s application has been rejected`)
        setTimeout(() => setSuccess(null), 3000)
        closeRejectModal()
      }
    } catch { setError('Failed to reject member') }
    finally { setIsRejecting(false) }
  }

  const openRejectModal = (member: PendingMember) => { setRejectingMember(member); setRejectionNote('') }
  const closeRejectModal = () => { setRejectingMember(null); setRejectionNote('') }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown'
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return 'Invalid Date' }
  }

  const labelSt: React.CSSProperties = { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'block', marginBottom: 8 }

  if (hasAccess === null || (hasAccess === true && isLoading)) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.06em' }}>LOADING...</div>
      </div>
    )
  }

  if (hasAccess === false) {
    return (
      <div className="aq-page">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <Link to="/director" className="aq-nav-ghost-btn">←</Link>
            <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Member Approvals</h1>
          </div>
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>Access Restricted</p>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>Only Operations directors and super admins can review member applications.</p>
          </div>
        </div>
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
            <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Member Approvals</h1>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 2 }}>Review and approve new member applications</p>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div style={{ background: 'rgba(42,157,110,0.12)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent)', fontFamily: 'var(--f-display)', fontSize: 12 }}>
            ✓ {success}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            {error}<button onClick={() => setError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button>
          </div>
        )}

        {/* List */}
        {members.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 36, marginBottom: 16, color: 'var(--accent)' }}>✓</div>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>All caught up!</p>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>No pending applications to review.</p>
          </div>
        ) : (
          <>
            {members.map(member => (
              <div key={member.memberId} className="aq-post-card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 240 }}>
                    <div className="aq-avatar" style={{ width: 44, height: 44, fontSize: 15, background: 'var(--c-welfare)', flexShrink: 0, overflow: 'hidden' }}>
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(member.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 4 }}>{member.fullName}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 2 }}>{member.email}</div>
                      {member.phone && <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 2 }}>{member.phone}</div>}
                      {member.classGrade && <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 2 }}>{member.classGrade}</div>}
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 4 }}>Applied {formatDate(member.createdAt)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleApprove(member)} disabled={actionLoading !== null}
                      style={{ background: 'rgba(42,157,110,0.15)', color: 'var(--c-welfare)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '8px 18px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: actionLoading !== null ? 0.6 : 1 }}>
                      {actionLoading === member.memberId ? '...' : '✓ Approve'}
                    </button>
                    <button onClick={() => openRejectModal(member)} disabled={actionLoading !== null}
                      style={{ background: 'rgba(224,92,92,0.1)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r)', padding: '8px 18px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: actionLoading !== null ? 0.6 : 1 }}>
                      ✕ Reject
                    </button>
                  </div>
                </div>

                {/* Join reason */}
                {member.joinReason && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    <label style={labelSt}>Why they want to join</label>
                    <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.65 }}>{member.joinReason}</p>
                  </div>
                )}
              </div>
            ))}

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
      {rejectingMember && (
        <div className="aq-modal-overlay" onClick={closeRejectModal}>
          <div className="aq-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Reject Application</div>
              <button onClick={closeRejectModal} className="aq-nav-ghost-btn">✕</button>
            </div>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)', marginBottom: 16 }}>
              Reject <strong style={{ color: 'var(--txt)' }}>{rejectingMember.fullName}</strong>'s application?
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Rejection reason *</label>
              <textarea className="aq-input" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={3}
                placeholder="Provide a reason (visible to the applicant)..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeRejectModal} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
              <button onClick={handleReject} disabled={!rejectionNote.trim() || isRejecting}
                style={{ background: 'rgba(224,92,92,0.15)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '8px 18px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: !rejectionNote.trim() || isRejecting ? 0.5 : 1 }}>
                {isRejecting ? '...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountApprovals
