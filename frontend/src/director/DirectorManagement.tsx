import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import directorService, { Director, EligibleMember } from '../services/directorService'
import { useDebounce } from '../hooks/useDebounce'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const DirectorManagement = () => {
  const [directors, setDirectors] = useState<Director[]>([])
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEligible, setIsLoadingEligible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showEligible, setShowEligible] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)
  const [isDemoting, setIsDemoting] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchDirectors = async () => {
    try {
      const result = await directorService.getAllDirectors()
      if (result.success) setDirectors(result.data.directors)
    } catch { setError('Failed to load directors') }
    finally { setIsLoading(false) }
  }

  const fetchEligibleMembers = useCallback(async (searchQuery: string) => {
    setIsLoadingEligible(true)
    try {
      const result = await directorService.getEligibleMembers({ search: searchQuery, limit: 50 })
      if (result.success) setEligibleMembers(result.data)
    } catch { console.error('Failed to load eligible members') }
    finally { setIsLoadingEligible(false) }
  }, [])

  useEffect(() => { fetchDirectors() }, [])
  useEffect(() => { if (showEligible) fetchEligibleMembers(debouncedSearch) }, [debouncedSearch, showEligible, fetchEligibleMembers])

  const handlePromote = async (memberId: number, memberName: string) => {
    if (!confirm(`Promote ${memberName} to director?`)) return
    setIsPromoting(true); setError(null)
    try {
      const result = await directorService.promoteToDirector(memberId)
      if (result.success) {
        setSuccess(`${memberName} has been promoted to director`)
        await fetchDirectors(); await fetchEligibleMembers(debouncedSearch)
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to promote member') }
    finally { setIsPromoting(false) }
  }

  const handleDemote = async (memberId: number, memberName: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) { setError('Cannot demote a super admin'); return }
    if (!confirm(`Remove ${memberName} as director? This removes all their category assignments.`)) return
    setIsDemoting(true); setError(null)
    try {
      const result = await directorService.demoteToMember(memberId)
      if (result.success) {
        setSuccess(`${memberName} has been demoted to member`)
        await fetchDirectors()
        if (showEligible) await fetchEligibleMembers(debouncedSearch)
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to demote director') }
    finally { setIsDemoting(false) }
  }

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/director" className="aq-nav-ghost-btn">←</Link>
            <div>
              <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)' }}>Director Management</h1>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 2 }}>Promote members or remove director access</p>
            </div>
          </div>
          <button onClick={() => setShowEligible(!showEligible)} className="aq-btn aq-btn-accent aq-btn-sm">
            {showEligible ? 'Cancel' : '+ Add Director'}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            {error}<button onClick={() => setError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(42,157,110,0.12)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16, color: 'var(--accent)', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            ✓ {success}<button onClick={() => setSuccess(null)} style={{ background: 'none', color: 'var(--accent)' }}>✕</button>
          </div>
        )}

        {/* Add Director panel */}
        {showEligible && (
          <div className="aq-post-card" style={{ marginBottom: 20, padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>Select Member to Promote</div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-4)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                  className="aq-input" style={{ paddingLeft: 38 }} />
              </div>
              {isLoadingEligible ? (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)' }}>LOADING...</div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {eligibleMembers.map(member => (
                    <div key={member.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="aq-avatar" style={{ width: 30, height: 30, fontSize: 10, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                          {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(member.fullName)}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)' }}>{member.fullName}</div>
                          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{member.email}</div>
                        </div>
                      </div>
                      <button onClick={() => handlePromote(member.memberId, member.fullName)} disabled={isPromoting}
                        className="aq-btn aq-btn-accent aq-btn-sm" style={{ fontSize: 11 }}>
                        {isPromoting ? '...' : 'Promote'}
                      </button>
                    </div>
                  ))}
                  {eligibleMembers.length === 0 && (
                    <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-4)', textAlign: 'center', padding: '20px 0' }}>
                      {search ? 'No members found' : 'No eligible members'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Directors */}
        <div className="aq-post-card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>
              Current Directors ({directors.length})
            </div>
          </div>
          {directors.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-4)' }}>No directors found.</div>
          ) : directors.map(director => (
            <div key={director.memberId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                  {director.avatarUrl ? <img src={director.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(director.fullName)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{director.fullName}</span>
                    {director.isSuperAdmin && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, color: '#e05c5c', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(224,92,92,0.4)', borderRadius: 'var(--r-pill)', padding: '1px 5px' }}>Super Admin</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{director.email}</div>
                  {director.categories.length > 0 && (
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--txt-4)', marginTop: 2 }}>
                      {director.categories.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              {!director.isSuperAdmin && (
                <button onClick={() => handleDemote(director.memberId, director.fullName, director.isSuperAdmin || false)} disabled={isDemoting}
                  style={{ background: 'rgba(224,92,92,0.1)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r)', padding: '6px 14px', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', opacity: isDemoting ? 0.5 : 1 }}>
                  {isDemoting ? '...' : '− Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DirectorManagement
