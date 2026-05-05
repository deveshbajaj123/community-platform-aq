import { SearchResults } from '../services/searchService'

interface SearchFiltersProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  results: SearchResults | null
}

const SearchFilters = ({ activeFilter, onFilterChange, results }: SearchFiltersProps) => {
  const filters = [
    { id: 'all', label: 'All Results', count: results ?
      results.people.length + results.projects.length + results.teams.length + results.schools.length : 0 },
    { id: 'people', label: 'People', count: results?.people.length || 0 },
    { id: 'projects', label: 'Projects', count: results?.projects.length || 0 },
    { id: 'teams', label: 'Teams', count: results?.teams.length || 0 },
    { id: 'schools', label: 'Schools', count: results?.schools.length || 0 },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeFilter === filter.id
              ? 'bg-forest-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.label}
          {filter.count > 0 && (
            <span className={`ml-2 ${
              activeFilter === filter.id ? 'text-forest-100' : 'text-gray-500'
            }`}>
              ({filter.count})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default SearchFilters
