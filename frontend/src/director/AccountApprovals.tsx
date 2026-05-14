import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import directorService, { PendingMember } from '../services/directorService'
import { useAuth } from '../auth/AuthContext'
import { I } from '../components/v6Shared'

const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'unknown'
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return 'invalid date' }
}
const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
const hashColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] }

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
      .then(r => { const cats = r.success ? r.data.categories.map((c: any) => c.category) : []; setHasAccess(cats.includes('operations')) })
      .catch(() => setHasAccess(false))
  }, [isSuperAdmin])

  const fetchMembers = async (pageNum: number, append = false) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true)
    try {
      const result = await directorService.getPendingApprovals({ page: pageNum, limit: 20 })
      if (result.success) {
        if (append) setMembers(prev => [...prev, ...result.data]); else setMembers(result.data)
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (err: any) {
      const msg = err?.message || err?.error_description || JSON.stringify(err)
      setError(`Could not load pending approvals — ${msg}`)
      console.error('[AccountApprovals] fetchMembers error:', err)
    }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }

  useEffect(() => {
    if (hasAccess === true) fetchMembers(1)
    else if (hasAccess === false) setIsLoading(false)
  }, [hasAccess])

  const handleApprove = async (member: PendingMember) => {
    setActionLoading(member.memberId); setError(null)
    try {
      const result = await directorService.approveMember(member.memberId)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.memberId !== member.memberId))
        setSuccess(`${member.fullName} approved.`); setTimeout(() => setSuccess(null), 3000)
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
        setSuccess(`${rejectingMember.fullName}'s application rejected.`); setTimeout(() => setSuccess(null), 3000)
        setRejectingMember(null); setRejectionNote('')
      }
    } catch { setError('Failed to reject member') }
    finally { setIsRejecting(false) }
  }

  if (hasAccess === null || (hasAccess === true && isLoading)) {
    return (
      <div className="dir-page">
        <div className="sk-group">
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
              <div className="v6-skeleton sk-circle" style={{ width: 44, height: 44 }} />
              <div style={{ flex: 1 }}>
                <div className="v6-skeleton" style={{ width: '35%', height: 14, marginBottom: 7 }} />
                <div className="v6-skeleton" style={{ width: '55%', height: 11 }} />
              </div>
              <div className="v6-skeleton sk-pill" style={{ width: 90, height: 34 }} />
              <div className="v6-skeleton sk-pill" style={{ width: 70, height: 34 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (hasAccess === false) {
    return (
      <div className="route-enter dir-page" style={{ textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 40 }}>access restricted.</div>
        <p className="muted" style={{ marginTop: 12 }}>only operations HoDs and super admins can review member applications.</p>
        <Link to="/director" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="route-enter dir-page">
      <div className="row gap-2" style={{ marginBottom: 24, alignItems: 'center' }}>
        <Link to="/director" className="btn btn-sm">← back</Link>
        <div>
          <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', margin: 0, lineHeight: 1 }}>
            account approvals<span style={{ color: 'var(--lemon)' }}>.</span>
          </h1>
          <p className="mono xs muted" style={{ marginTop: 4 }}>{members.length} pending</p>
        </div>
      </div>

      {success && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--mint)' }}>
          <span style={{ color: 'var(--mint)', fontWeight: 700 }}>✓ {success}</span>
        </div>
      )}
      {error && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', borderLeft: '4px solid #FF4D2E' }}>
          <span style={{ color: '#FF4D2E' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D2E' }}>✕</button>
        </div>
      )}

      {members.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>all caught up.</div>
          <p className="muted" style={{ marginTop: 8 }}>no pending applications to review.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {members.map((member, i) => (
            <div key={member.memberId} style={{ padding: 20, borderBottom: i < members.length - 1 ? '1px dashed var(--line)' : 'none' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="avatar" style={{ background: hashColor(member.fullName), flexShrink: 0, overflow: 'hidden' }}>
                  {member.avatarUrl
                    ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : getInitials(member.fullName)}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{member.fullName}</div>
                  <div className="mono xs muted">{member.email}</div>
                  {member.phone && <div className="mono xs muted">{member.phone}</div>}
                  {member.classGrade && <div className="mono xs muted">{member.classGrade}</div>}
                  <div className="mono xs muted" style={{ marginTop: 4 }}>applied {formatDate(member.createdAt)}</div>
                  {member.joinReason && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 10 }}>
                      <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 6 }}>why they want to join</div>
                      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>{member.joinReason}</p>
                    </div>
                  )}
                </div>
                <div className="col gap-2" style={{ flexShrink: 0 }}>
                  <button onClick={() => handleApprove(member)} disabled={actionLoading !== null} className="btn btn-sm btn-primary">
                    {actionLoading === member.memberId ? '...' : <><I.check /> approve</>}
                  </button>
                  <button onClick={() => { setRejectingMember(member); setRejectionNote('') }} disabled={actionLoading !== null} className="btn btn-sm" style={{ color: '#FF4D2E', borderColor: '#FF4D2E' }}>
                    ✕ reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <button onClick={() => { const p = page + 1; setPage(p); fetchMembers(p, true) }} disabled={isLoadingMore} className="btn btn-sm">
                {isLoadingMore ? 'loading...' : 'load more →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rejection modal */}
      {rejectingMember && (
        <div className="modal-back" onClick={() => { setRejectingMember(null); setRejectionNote('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="sticker sticker-pink">✕ REJECT APPLICATION</span>
              <button className="btn btn-sm" onClick={() => { setRejectingMember(null); setRejectionNote('') }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, color: 'var(--ink-2)' }}>
                reject <strong style={{ color: 'var(--ink)' }}>{rejectingMember.fullName}</strong>? they will be notified with the reason below.
              </p>
              <label htmlFor="rej-note" className="mono xs upper muted" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>rejection reason *</label>
              <textarea
                id="rej-note"
                className="textarea"
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                rows={3}
                placeholder="be specific. the applicant will see this."
              />
              <div className="row gap-2" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button onClick={() => { setRejectingMember(null); setRejectionNote('') }} className="btn btn-sm">cancel</button>
                <button onClick={handleReject} disabled={!rejectionNote.trim() || isRejecting} className="btn btn-sm" style={{ background: '#FF4D2E', color: '#fff', border: 'none' }}>
                  {isRejecting ? '...' : 'confirm rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountApprovals
