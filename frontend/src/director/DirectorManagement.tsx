import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, MagnifyingGlassIcon, UserPlusIcon, UserMinusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import directorService, { Director, EligibleMember } from '../services/directorService'
import { useDebounce } from '../hooks/useDebounce'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'

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
      if (result.success) {
        setDirectors(result.data.directors)
      }
    } catch (err) {
      setError('Failed to load directors')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEligibleMembers = useCallback(async (searchQuery: string) => {
    setIsLoadingEligible(true)
    try {
      const result = await directorService.getEligibleMembers({
        search: searchQuery,
        limit: 50
      })
      if (result.success) {
        setEligibleMembers(result.data)
      }
    } catch (err) {
      console.error('Failed to load eligible members:', err)
    } finally {
      setIsLoadingEligible(false)
    }
  }, [])

  useEffect(() => {
    fetchDirectors()
  }, [])

  useEffect(() => {
    if (showEligible) {
      fetchEligibleMembers(debouncedSearch)
    }
  }, [debouncedSearch, showEligible, fetchEligibleMembers])

  const handlePromote = async (memberId: number, memberName: string) => {
    if (!confirm(`Promote ${memberName} to director?`)) return

    setIsPromoting(true)
    setError(null)
    try {
      const result = await directorService.promoteToDirector(memberId)
      if (result.success) {
        setSuccess(`${memberName} has been promoted to director`)
        await fetchDirectors()
        await fetchEligibleMembers(debouncedSearch)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to promote member')
    } finally {
      setIsPromoting(false)
    }
  }

  const handleDemote = async (memberId: number, memberName: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) {
      setError('Cannot demote a super admin')
      return
    }

    if (!confirm(`Remove ${memberName} as a director? This will also remove all their category assignments.`)) return

    setIsDemoting(true)
    setError(null)
    try {
      const result = await directorService.demoteToMember(memberId)
      if (result.success) {
        setSuccess(`${memberName} has been demoted to member`)
        await fetchDirectors()
        if (showEligible) {
          await fetchEligibleMembers(debouncedSearch)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to demote director')
    } finally {
      setIsDemoting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/director"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Director Management</h1>
            <p className="text-gray-500">Promote members to directors or remove director access</p>
          </div>
        </div>
        <Button onClick={() => setShowEligible(!showEligible)}>
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Add Director
        </Button>
      </div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Add Director Panel */}
      {showEligible && (
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold">Select Member to Promote</h2>
          </Card.Header>
          <Card.Body>
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />
            </div>

            {isLoadingEligible ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-cream-200">
                {eligibleMembers.map(member => (
                  <div key={member.memberId} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={member.avatarUrl} name={member.fullName} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePromote(member.memberId, member.fullName)}
                      disabled={isPromoting}
                      loading={isPromoting}
                    >
                      Promote
                    </Button>
                  </div>
                ))}
                {eligibleMembers.length === 0 && (
                  <p className="py-4 text-center text-gray-500">
                    {search ? 'No members found matching your search' : 'No eligible members found'}
                  </p>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Current Directors List */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Current Directors ({directors.length})</h2>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="divide-y divide-cream-200">
            {directors.map(director => (
              <div key={director.memberId} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={director.avatarUrl} name={director.fullName} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{director.fullName}</h3>
                      {director.isSuperAdmin && (
                        <Badge variant="coral" size="sm">
                          <ShieldCheckIcon className="w-3 h-3 mr-1" />
                          Super Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{director.email}</p>
                    {director.categories.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Categories: {director.categories.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {!director.isSuperAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDemote(director.memberId, director.fullName, director.isSuperAdmin || false)}
                    disabled={isDemoting}
                    loading={isDemoting}
                  >
                    <UserMinusIcon className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {directors.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No directors found
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default DirectorManagement
