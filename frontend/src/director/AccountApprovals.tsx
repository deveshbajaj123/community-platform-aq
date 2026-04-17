import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon, XMarkIcon, EnvelopeIcon, PhoneIcon, AcademicCapIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import directorService, { PendingMember } from '../services/directorService'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Modal from '../components/Modal'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'
import { useAuth } from '../auth/AuthContext'

const AccountApprovals = () => {
  const { member: currentMember } = useAuth()
  const isSuperAdmin = currentMember?.isSuperAdmin || false

  const [hasAccess, setHasAccess] = useState<boolean | null>(null) // null = loading
  const [members, setMembers] = useState<PendingMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Rejection modal state
  const [rejectingMember, setRejectingMember] = useState<PendingMember | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check category access on mount
  useEffect(() => {
    if (isSuperAdmin) {
      setHasAccess(true)
      return
    }
    directorService.getMyCategories()
      .then(result => {
        const cats = result.success ? result.data.categories.map((c: any) => c.category) : []
        setHasAccess(cats.includes('operations'))
      })
      .catch(() => setHasAccess(false))
  }, [isSuperAdmin])

  const fetchMembers = async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await directorService.getPendingApprovals({ page: pageNum, limit: 20 })
      if (result.success) {
        if (append) {
          setMembers(prev => [...prev, ...result.data])
        } else {
          setMembers(result.data)
        }
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (err) {
      setError('Failed to load pending approvals')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    if (hasAccess === true) {
      fetchMembers(1)
    } else if (hasAccess === false) {
      setIsLoading(false)
    }
  }, [hasAccess])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMembers(nextPage, true)
  }

  const handleApprove = async (member: PendingMember) => {
    setActionLoading(member.memberId)
    setError(null)

    try {
      const result = await directorService.approveMember(member.memberId)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.memberId !== member.memberId))
        setSuccess(`${member.fullName} has been approved`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to approve member')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingMember || !rejectionNote.trim()) return

    setIsRejecting(true)
    setError(null)

    try {
      const result = await directorService.rejectMember(rejectingMember.memberId, rejectionNote)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.memberId !== rejectingMember.memberId))
        setSuccess(`${rejectingMember.fullName}'s application has been rejected`)
        setTimeout(() => setSuccess(null), 3000)
        closeRejectModal()
      }
    } catch (err) {
      setError('Failed to reject member')
    } finally {
      setIsRejecting(false)
    }
  }

  const openRejectModal = (member: PendingMember) => {
    setRejectingMember(member)
    setRejectionNote('')
  }

  const closeRejectModal = () => {
    setRejectingMember(null)
    setRejectionNote('')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Still checking access
  if (hasAccess === null || (hasAccess === true && isLoading)) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  // Access denied
  if (hasAccess === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/director"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Member Approvals</h1>
            <p className="text-gray-500">Review and approve new member applications</p>
          </div>
        </div>
        <Card>
          <Card.Body className="text-center py-16">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <LockClosedIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Only <span className="font-medium text-gray-700">Operations directors</span> and super admins can review member applications.
            </p>
          </Card.Body>
        </Card>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">Member Approvals</h1>
          <p className="text-gray-500">Review and approve new member applications</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">
              <CheckIcon className="w-12 h-12 mx-auto text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">There are no pending member applications to review.</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map(member => (
            <Card key={member.memberId} className="animate-fade-in">
              <Card.Body>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Member Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar
                      src={member.avatarUrl}
                      name={member.fullName}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.fullName}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-4 h-4" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="w-4 h-4" />
                            {member.phone}
                          </span>
                        )}
                        {member.classGrade && (
                          <span className="flex items-center gap-1">
                            <AcademicCapIcon className="w-4 h-4" />
                            {member.classGrade}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Applied {formatDate(member.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2">
                    <Button
                      onClick={() => handleApprove(member)}
                      loading={actionLoading === member.memberId}
                      disabled={actionLoading !== null}
                      className="flex-1 sm:flex-initial bg-forest-500 hover:bg-forest-600 text-white"
                      size="sm"
                    >
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => openRejectModal(member)}
                      disabled={actionLoading !== null}
                      variant="danger"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                    >
                      <XMarkIcon className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>

                {/* Join Reason */}
                {member.joinReason && (
                  <div className="mt-4 pt-4 border-t border-cream-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Why they want to join:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {member.joinReason}
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}

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
        </div>
      )}

      {/* Rejection Modal */}
      <Modal
        isOpen={!!rejectingMember}
        onClose={closeRejectModal}
        title="Reject Application"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to reject <strong>{rejectingMember?.fullName}</strong>'s application?
          </p>

          <TextArea
            label="Rejection reason"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            rows={3}
            placeholder="Please provide a reason for rejection (visible to the applicant)..."
            required
          />

          <Modal.Footer>
            <Button variant="secondary" onClick={closeRejectModal}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              loading={isRejecting}
              disabled={!rejectionNote.trim()}
              variant="danger"
            >
              Reject Application
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  )
}

export default AccountApprovals
