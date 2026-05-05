import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import searchService, { SearchResults } from '../services/searchService'
import SearchFilters from './SearchFilters'
import SearchResultsList from './SearchResultsList'

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeFilter, setActiveFilter] = useState<string>(searchParams.get('type') || 'all')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const q = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    if (q && q.trim().length >= 2) {
      setQuery(q); setActiveFilter(type); performSearch(q, type)
    }
  }, [searchParams])

  const performSearch = async (searchQuery: string, type: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) return
    setLoading(true); setHasSearched(true)
    try {
      const response = await searchService.search(searchQuery, type, 50)
      if (response.success) { setResults(response.data.results); setTotalCount(response.data.totalCount) }
    } catch {
      console.error('Search failed')
      setResults({ people: [], projects: [], teams: [], schools: [] }); setTotalCount(0)
    } finally { setLoading(false) }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length >= 2) setSearchParams({ q: query.trim(), type: activeFilter })
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    if (query.trim().length >= 2) setSearchParams({ q: query.trim(), type: filter })
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div className="aq-label" style={{ marginBottom: 6 }}>Community</div>
          <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(24px, 4vw, 36px)', letterSpacing: '-0.04em', color: 'var(--txt)', marginBottom: 8 }}>Search</h1>
          <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-3)' }}>Find people, projects, teams, and schools across AquaTerra</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-4)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for people, projects, teams..."
              className="aq-input"
              style={{ paddingLeft: 42, paddingRight: 16, height: 52, fontSize: 15 }}
              autoFocus
            />
          </div>
          {query.trim().length > 0 && query.trim().length < 2 && (
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: '#e05c5c', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>Please enter at least 2 characters</p>
          )}
        </form>

        {/* Filters */}
        {query.trim().length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <SearchFilters activeFilter={activeFilter} onFilterChange={handleFilterChange} results={results} />
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="aq-spinner" />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>SEARCHING</span>
          </div>
        ) : hasSearched && results ? (
          totalCount === 0 ? (
            <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>No results found</p>
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>Try different keywords or check your spelling.</p>
            </div>
          ) : (
            <SearchResultsList results={results} activeFilter={activeFilter} />
          )
        ) : (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>Start searching</p>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)' }}>Enter a search term above to find people, projects, teams, and schools.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchPage
