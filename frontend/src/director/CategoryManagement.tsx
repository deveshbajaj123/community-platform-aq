import { useState, useEffect } from 'react'
import directorService, { Director, CategoryAssignments } from '../services/directorService'
import { useAuth } from '../auth/AuthContext'
import { DEPT_COLORS } from '../lib/supabase'

const CATEGORY_INFO: Record<string, { label: string }> = {
  events: { label: 'Events' },
  welfare: { label: 'Welfare' },
  content: { label: 'Content' },
  operations: { label: 'Operations' },
  labs: { label: 'Labs' },
}

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const CategoryManagement = () => {
  const { member } = useAuth()
  const isSuperAdmin = member?.isSuperAdmin || false

  const [directors, setDirectors] = useState<Director[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [assignments, setAssignments] = useState<CategoryAssignments>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedDirector, setSelectedDirector] = useState<number | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const fetchData = async () => {
    try {
      const [directorsRes, assignmentsRes] = await Promise.all([
        directorService.getAllDirectors(),
        directorService.getCategoryAssignments()
      ])
      if (directorsRes.success) setDirectors(directorsRes.data.directors)
      if (assignmentsRes.success) { setCategories(assignmentsRes.data.categories); setAssignments(assignmentsRes.data.assignments) }
    } catch { setError('Failed to load data') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleAssign = async (memberId: number, category: string) => {
    setIsAssigning(true); setError(null)
    try {
      const result = await directorService.assignCategory(memberId, category)
      if (result.success) { setSuccess(`Assigned ${CATEGORY_INFO[category]?.label || category}`); await fetchData() }
    } catch { setError('Failed to assign category') }
    finally { setIsAssigning(false); setSelectedDirector(null) }
  }

  const handleUnassign = async (memberId: number, category: string) => {
    if (!confirm(`Remove ${CATEGORY_INFO[category]?.label || category} assignment?`)) return
    setError(null)
    try {
      const result = await directorService.unassignCategory(memberId, category)
      if (result.success) { setSuccess(`Removed ${CATEGORY_INFO[category]?.label || category} assignment`); await fetchData() }
    } catch { setError('Failed to remove assignment') }
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
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.03em', color: 'var(--txt)', marginBottom: 4 }}>Category Management</h1>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>
            {isSuperAdmin ? 'Assign directors to categories for post moderation' : 'View category assignments (Super Admin only)'}
          </p>
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

        {/* Directors list */}
        <div className="aq-post-card" style={{ marginBottom: 20, padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>Directors & Assignments</div>
          </div>
          {directors.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-4)' }}>No directors found.</div>
          ) : directors.map(director => (
            <div key={director.memberId} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                    {director.avatarUrl ? <img src={director.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(director.fullName)}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{director.fullName}</div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{director.email}</div>
                  </div>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => setSelectedDirector(selectedDirector === director.memberId ? null : director.memberId)}
                    className="aq-btn aq-btn-outline aq-btn-sm" style={{ fontSize: 11 }}>
                    {selectedDirector === director.memberId ? 'Cancel' : '+ Assign'}
                  </button>
                )}
              </div>

              {/* Current categories */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: selectedDirector === director.memberId ? 10 : 0 }}>
                {director.categories.length === 0 ? (
                  <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--txt-4)' }}>No categories assigned</span>
                ) : director.categories.map(cat => (
                  <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', color: DEPT_COLORS[cat] || 'var(--accent)', border: `1px solid ${DEPT_COLORS[cat] || 'var(--accent)'}`, borderRadius: 'var(--r-pill)', padding: '3px 10px' }}>
                    {CATEGORY_INFO[cat]?.label || cat}
                    {isSuperAdmin && (
                      <button onClick={() => handleUnassign(director.memberId, cat)} style={{ background: 'none', color: 'inherit', opacity: 0.7, fontSize: 11, marginLeft: 2 }}>✕</button>
                    )}
                  </span>
                ))}
              </div>

              {/* Assign panel */}
              {selectedDirector === director.memberId && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 8, letterSpacing: '0.04em' }}>Select category to assign:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categories.filter(cat => !director.categories.includes(cat)).map(cat => (
                      <button key={cat} onClick={() => handleAssign(director.memberId, cat)} disabled={isAssigning}
                        className="aq-chip"
                        style={{ color: DEPT_COLORS[cat] || 'var(--accent)', borderColor: DEPT_COLORS[cat] || 'var(--accent)', opacity: isAssigning ? 0.5 : 1 }}>
                        {CATEGORY_INFO[cat]?.label || cat}
                      </button>
                    ))}
                    {director.categories.length === categories.length && (
                      <span style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--txt-4)' }}>All categories assigned</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Categories Overview */}
        <div className="aq-post-card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--txt-3)' }}>Categories Overview</div>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {categories.map(cat => (
              <div key={cat} style={{ border: `1px solid ${DEPT_COLORS[cat] || 'var(--line-2)'}`, borderRadius: 'var(--r)', padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: DEPT_COLORS[cat] || 'var(--accent)', marginBottom: 8 }}>
                  {CATEGORY_INFO[cat]?.label || cat}
                </div>
                {assignments[cat]?.length === 0 ? (
                  <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--txt-4)' }}>No directors</p>
                ) : assignments[cat]?.map(director => (
                  <div key={director.memberId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div className="aq-avatar" style={{ width: 24, height: 24, fontSize: 9, background: DEPT_COLORS[cat] || 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                      {director.avatarUrl ? <img src={director.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(director.fullName)}
                    </div>
                    <span style={{ fontFamily: 'var(--f-display)', fontSize: 12, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{director.fullName}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryManagement
