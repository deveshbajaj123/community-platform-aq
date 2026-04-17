import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import teamService, { Team } from '../services/teamService'
import TeamCard from './TeamCard'
import CreateTeamModal from './CreateTeamModal'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import Input from '../components/Input'
import Button from '../components/Button'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../auth/AuthContext'

const CATEGORY_EMOJIS: Record<string, string> = {
  events: '🎪',
  welfare: '💚',
  content: '📝',
  operations: '⚙️',
  labs: '🔬',
}

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
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await teamService.getTeams({
        page: pageNum,
        limit: 12,
        category: category || undefined,
        search: debouncedSearch || undefined
      })

      if (result.success) {
        if (append) {
          setTeams(prev => [...prev, ...result.data])
        } else {
          setTeams(result.data)
        }
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [category, debouncedSearch])

  useEffect(() => {
    setPage(1)
    fetchTeams(1)
  }, [category, debouncedSearch, fetchTeams])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTeams(nextPage, true)
  }

  const categories = teamService.getCategories()

  return (
    <div className="space-y-5">
      {/* Header — stacks on mobile, row on sm+ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-0.5 text-sm sm:text-base">Explore our community teams and groups</p>
        </div>
        {isDirector && (
          <Button onClick={() => setShowCreateModal(true)} className="self-start sm:self-auto">
            <PlusIcon className="w-5 h-5 mr-1.5" />
            Add Team
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filter — scrollable pill row on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
        <button
          onClick={() => setCategory('')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
            category === ''
              ? 'bg-forest-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? '' : cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-forest-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{CATEGORY_EMOJIS[cat]}</span>
            <span>{teamService.getCategoryLabel(cat)}</span>
          </button>
        ))}
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
            <p className="text-gray-500">
              {search || category
                ? 'Try adjusting your filters or search query'
                : 'Teams will appear here once created'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {teams.map(team => (
              <TeamCard key={team.uuid} team={team} />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleLoadMore}
                loading={isLoadingMore}
                variant="secondary"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setPage(1)
          fetchTeams(1)
        }}
      />
    </div>
  )
}

export default TeamsPage
