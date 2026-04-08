import { useState, useEffect } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import directorService, { Director, CategoryAssignments } from '../services/directorService'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Spinner from '../components/Spinner'
import Alert from '../components/Alert'

const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  events: { label: 'Events', emoji: '🎪', color: 'bg-purple-100 text-purple-800' },
  welfare: { label: 'Welfare', emoji: '💚', color: 'bg-green-100 text-green-800' },
  content: { label: 'Content', emoji: '📝', color: 'bg-blue-100 text-blue-800' },
  operations: { label: 'Operations', emoji: '⚙️', color: 'bg-orange-100 text-orange-800' },
  labs: { label: 'Labs', emoji: '🔬', color: 'bg-pink-100 text-pink-800' }
}

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

      if (directorsRes.success) {
        setDirectors(directorsRes.data.directors)
      }
      if (assignmentsRes.success) {
        setCategories(assignmentsRes.data.categories)
        setAssignments(assignmentsRes.data.assignments)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAssign = async (memberId: number, category: string) => {
    setIsAssigning(true)
    setError(null)
    try {
      const result = await directorService.assignCategory(memberId, category)
      if (result.success) {
        setSuccess(`Assigned ${CATEGORY_INFO[category]?.label || category} successfully`)
        await fetchData()
      }
    } catch (err) {
      setError('Failed to assign category')
    } finally {
      setIsAssigning(false)
      setSelectedDirector(null)
    }
  }

  const handleUnassign = async (memberId: number, category: string) => {
    if (!confirm(`Remove ${CATEGORY_INFO[category]?.label || category} assignment?`)) return

    setError(null)
    try {
      const result = await directorService.unassignCategory(memberId, category)
      if (result.success) {
        setSuccess(`Removed ${CATEGORY_INFO[category]?.label || category} assignment`)
        await fetchData()
      }
    } catch (err) {
      setError('Failed to remove assignment')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin
              ? 'Assign directors to categories for post moderation'
              : 'View category assignments (only Super Admin can make changes)'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>
      )}

      {/* Directors List */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Directors & Assignments</h2>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="divide-y divide-cream-200">
            {directors.map(director => (
              <div key={director.memberId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={director.avatarUrl}
                      name={director.fullName}
                      size="md"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{director.fullName}</h3>
                      <p className="text-sm text-gray-500">{director.email}</p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedDirector(selectedDirector === director.memberId ? null : director.memberId)}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Assign
                    </Button>
                  )}
                </div>

                {/* Current assignments */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {director.categories.length === 0 ? (
                    <span className="text-sm text-gray-400 italic">No categories assigned</span>
                  ) : (
                    director.categories.map(cat => (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_INFO[cat]?.color || 'bg-gray-100 text-gray-800'}`}
                      >
                        {CATEGORY_INFO[cat]?.emoji} {CATEGORY_INFO[cat]?.label || cat}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleUnassign(director.memberId, cat)}
                            className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>

                {/* Assignment dropdown */}
                {selectedDirector === director.memberId && (
                  <div className="mt-3 p-3 bg-cream-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Select category to assign:</p>
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter(cat => !director.categories.includes(cat))
                        .map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleAssign(director.memberId, cat)}
                            disabled={isAssigning}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${CATEGORY_INFO[cat]?.color || 'bg-gray-100 text-gray-800'} hover:opacity-80 disabled:opacity-50`}
                          >
                            {CATEGORY_INFO[cat]?.emoji} {CATEGORY_INFO[cat]?.label || cat}
                          </button>
                        ))}
                      {director.categories.length === categories.length && (
                        <span className="text-sm text-gray-500 italic">All categories assigned</span>
                      )}
                    </div>
                  </div>
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

      {/* Categories Overview */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold">Categories Overview</h2>
        </Card.Header>
        <Card.Body>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(cat => (
              <div key={cat} className="p-4 border border-cream-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{CATEGORY_INFO[cat]?.emoji}</span>
                  <h3 className="font-semibold text-gray-900">{CATEGORY_INFO[cat]?.label || cat}</h3>
                </div>
                <div className="space-y-2">
                  {assignments[cat]?.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No directors assigned</p>
                  ) : (
                    assignments[cat]?.map(director => (
                      <div key={director.memberId} className="flex items-center gap-2">
                        <Avatar
                          src={director.avatarUrl}
                          name={director.fullName}
                          size="sm"
                        />
                        <span className="text-sm text-gray-700">{director.fullName}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

export default CategoryManagement
