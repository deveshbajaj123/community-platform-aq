import { useState, useEffect, useCallback } from 'react'
import teamService, { Team } from '../services/teamService'
import TeamCard from './TeamCard'
import CreateTeamModal from './CreateTeamModal'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../auth/AuthContext'
import { DEPT_COLORS } from '../lib/supabase'

const TeamsPage = () => {
  const { member } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const isDirector = member?.role === 'director'

  const fetchTeams = useCallback(async (pageNum: number, append = false) => {
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)
    try {
      const result = await teamService.getTeams({
        page: pageNum, limit: 12,
        category: category || undefined,
        search: debouncedSearch || undefined
      })
      if (result.success) {
        if (append) setTeams(prev => [...prev, ...result.data])
        else setTeams(result.data)
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (error) { console.error('Failed to fetch teams:', error) }
    finally { setIsLoading(false); setIsLoadingMore(false) }
  }, [category, debouncedSearch])

  useEffect(() => { setPage(1); fetchTeams(1) }, [category, debouncedSearch, fetchTeams])

  const handleLoadMore = () => { const p = page + 1; setPage(p); fetchTeams(p, true) }
  const categories = teamService.getCategories()

  const FILTERS = [
    { k: '', label: 'All', color: 'var(--txt-3)' },
    ...categories.map(cat => ({ k: cat, label: teamService.getCategoryLabel(cat), color: DEPT_COLORS[cat] || 'var(--accent)' }))
  ]

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" />Community</div>
            <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-0.05em' }}>Teams</h1>
          </div>
          {isDirector && (
            <button onClick={() => setShowCreateModal(true)} className="aq-btn aq-btn-accent aq-btn-sm">
              + New Team
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="aq-input"
            style={{ paddingLeft: 38 }}
          />
        </div>

        {/* Category Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {FILTERS.map(f => (
            <button key={f.k} onClick={() => setCategory(f.k)}
              className={`aq-chip ${category === f.k ? 'on' : ''}`}
              style={category === f.k ? { background: f.color, borderColor: 'transparent', color: '#fff' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="aq-spinner" />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING TEAMS</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)', marginBottom: 8 }}>
              {search || category ? 'No teams match your filters.' : 'No teams yet.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
              {teams.map(team => <TeamCard key={team.uuid} team={team} />)}
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

        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setPage(1); fetchTeams(1) }}
        />
      </div>
    </div>
  )
}

export default TeamsPage
