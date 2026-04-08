import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import searchService, { SearchResults } from '../services/searchService'
import Card from '../components/Card'
import Spinner from '../components/Spinner'
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

  // Perform search when URL params change
  useEffect(() => {
    const q = searchParams.get('q')
    const type = searchParams.get('type') || 'all'

    if (q && q.trim().length >= 2) {
      setQuery(q)
      setActiveFilter(type)
      performSearch(q, type)
    }
  }, [searchParams])

  const performSearch = async (searchQuery: string, type: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) return

    setLoading(true)
    setHasSearched(true)
    try {
      const response = await searchService.search(searchQuery, type, 50)
      if (response.success) {
        setResults(response.data.results)
        setTotalCount(response.data.totalCount)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults({ people: [], projects: [], teams: [], schools: [] })
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length >= 2) {
      setSearchParams({ q: query.trim(), type: activeFilter })
    }
  }

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    if (query.trim().length >= 2) {
      setSearchParams({ q: query.trim(), type: filter })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
        <p className="text-gray-600">
          Search for people, projects, teams, and schools across the AquaTerra community
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <Card.Body>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for people, projects, teams..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-forest-500 focus:border-forest-500 text-base"
                autoFocus
              />
            </div>
            {query.trim().length > 0 && query.trim().length < 2 && (
              <p className="mt-2 text-sm text-red-600">
                Please enter at least 2 characters to search
              </p>
            )}
          </form>
        </Card.Body>
      </Card>

      {/* Filters */}
      {query.trim().length >= 2 && (
        <SearchFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          results={results}
        />
      )}

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : hasSearched && results ? (
        totalCount === 0 ? (
          <Card>
            <Card.Body className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">
                Try searching with different keywords or check your spelling.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <SearchResultsList results={results} activeFilter={activeFilter} />
        )
      ) : (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-gray-500">
              Enter a search term above to find people, projects, teams, and schools.
            </p>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

export default SearchPage
