import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import directorService, { DirectoryMember } from '../services/directorService'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../auth/AuthContext'
import { I } from '../components/v6Shared'

const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'unknown'
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }
  catch { return '' }
}
const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
const hashColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] }

const MemberDirectory = () => {
  const { member: currentMember } = useAuth()
  const isSuperAdmin = currentMember?.role === 'super_admin'

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
        if (append) setMembers(prev => [...prev, ...result.data]); else setMembers(result.data)
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
      setDeleteSuccess(result.message || `${deleteTarget.fullName} deleted.`)
      setDeleteTarget(null); setPage(1); fetchMembers(1, debouncedSearch)
    } catch (error: any) { setDeleteError(error.response?.data?.message || 'Failed to delete member') }
    finally { setIsDeleting(false) }
  }

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(24px,5vw,40px)', paddingBottom: 80, maxWidth: 900 }}>
      <div className="row gap-2" style={{ marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/director" className="btn btn-sm">← back</Link>
        <div>
          <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', margin: 0, lineHeight: 1 }}>
            member directory<span style={{ color: 'var(--sky)' }}>.</span>
          </h1>
          <p className="mono xs muted" style={{ marginTop: 4 }}>{totalMembers} active members</p>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <label htmlFor="dir-search" className="sr-only">Search members</label>
        <I.search />
        <input
          id="dir-search"
          className="input"
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search by name or email..."
          style={{ border: 'none', padding: 0, fontSize: 16, background: 'transparent', boxShadow: 'none', flex: 1 }}
          autoComplete="off"
        />
        {search && <button className="btn btn-sm" onClick={() => setSearch('')} aria-label="Clear search"><I.close /></button>}
      </div>

      {deleteError && <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid #FF4D2E', display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#FF4D2E' }}>{deleteError}</span><button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D2E' }}>✕</button></div>}
      {deleteSuccess && <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: '4px solid var(--mint)' }}><span style={{ color: 'var(--mint)', fontWeight: 700 }}>✓ {deleteSuccess}</span></div>}

      {isLoading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><div className="mono xs upper muted">loading...</div></div>
      ) : members.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>{search ? 'no results.' : 'no members yet.'}</div>
          <p className="muted" style={{ marginTop: 8 }}>{search ? 'try different keywords.' : 'approved members will appear here.'}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12, marginBottom: 20 }}>
            {members.map(member => (
              <div key={member.memberId} style={{ position: 'relative' }}>
                <Link to={`/profile/${member.uuid}`} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover" style={{ padding: 16 }}>
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <div className="avatar" style={{ background: hashColor(member.fullName), overflow: 'hidden', flexShrink: 0 }}>
                        {member.avatarUrl
                          ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          : getInitials(member.fullName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row gap-2" style={{ marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.fullName}</span>
                          {member.role === 'super_admin' && <span className="role role-director" style={{ fontSize: 9, background: '#e05c5c', color: '#fff' }}>Super Admin</span>}
                          {member.role === 'hod' && <span className="role role-director" style={{ fontSize: 9 }}>HoD</span>}
                          {member.role === 'director' && <span className="role role-director" style={{ fontSize: 9, background: 'var(--sky)', color: '#0A0A0A' }}>Director</span>}
                        </div>
                        <div className="mono xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                        {member.classGrade && <div className="mono xs muted">{member.classGrade}</div>}
                        <div className="mono xs muted" style={{ marginTop: 3 }}>joined {formatDate(member.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                </Link>
                {isSuperAdmin && (
                  <button
                    onClick={() => setDeleteTarget({ memberId: member.memberId, fullName: member.fullName, email: member.email })}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14, padding: 4 }}
                    title="Delete account"
                    aria-label={`Delete ${member.fullName}'s account`}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => { const p = page + 1; setPage(p); fetchMembers(p, debouncedSearch, true) }} disabled={isLoadingMore} className="btn btn-sm">
                {isLoadingMore ? 'loading...' : 'load more →'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="modal-back" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="sticker sticker-pink">⚠ DELETE ACCOUNT</span>
              <button className="btn btn-sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 10 }}>delete <strong>{deleteTarget.fullName}</strong>'s account ({deleteTarget.email})?</p>
              <p className="mono xs" style={{ color: '#FF4D2E', lineHeight: 1.6, marginBottom: 16 }}>
                this permanently deletes their account, posts, comments, likes, and session data. this cannot be undone.
              </p>
              {deleteError && <div style={{ color: '#FF4D2E', fontSize: 13, marginBottom: 12 }}>{deleteError}</div>}
              <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="btn btn-sm">cancel</button>
                <button onClick={handleDelete} disabled={isDeleting} className="btn btn-sm" style={{ background: '#FF4D2E', color: '#fff', border: 'none' }}>
                  {isDeleting ? '...' : 'delete account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDirectory
