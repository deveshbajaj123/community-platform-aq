import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, MagnifyingGlassIcon, EnvelopeIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import directorService, { DirectoryMember } from '../services/directorService'
import { useDebounce } from '../hooks/useDebounce'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Spinner from '../components/Spinner'

const MemberDirectory = () => {
  const [members, setMembers] = useState<DirectoryMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalMembers, setTotalMembers] = useState(0)

  const debouncedSearch = useDebounce(search, 300)

  const fetchMembers = useCallback(async (pageNum: number, searchQuery: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await directorService.getMemberDirectory({
        page: pageNum,
        limit: 20,
        search: searchQuery
      })
      if (result.success) {
        if (append) {
          setMembers(prev => [...prev, ...result.data])
        } else {
          setMembers(result.data)
        }
        setHasMore(result.pagination.hasNextPage)
        setTotalMembers(result.pagination.totalItems)
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchMembers(1, debouncedSearch)
  }, [debouncedSearch, fetchMembers])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMembers(nextPage, debouncedSearch, true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/director"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Directory</h1>
          <p className="text-gray-500">
            {totalMembers} active member{totalMembers !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
        />
      </div>

      {/* Members Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : members.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No members found' : 'No active members yet'}
            </h3>
            <p className="text-gray-500">
              {search
                ? 'Try a different search term'
                : 'Approved members will appear here'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map(member => (
              <Link
                key={member.member_id}
                to={`/profile/${member.uuid}`}
              >
                <Card hover className="h-full">
                  <Card.Body>
                    <div className="flex items-start gap-4">
                      <Avatar
                        src={member.avatar_url}
                        name={member.full_name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {member.full_name}
                          </h3>
                          {member.role === 'director' && (
                            <Badge variant="forest" size="sm">Director</Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-500">
                          <div className="flex items-center gap-1 truncate">
                            <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.class_grade && (
                            <div className="flex items-center gap-1">
                              <AcademicCapIcon className="w-4 h-4 flex-shrink-0" />
                              <span>{member.class_grade}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-2">
                          Joined {formatDate(member.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
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
    </div>
  )
}

export default MemberDirectory
