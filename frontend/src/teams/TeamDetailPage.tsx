import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  UsersIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  ClipboardDocumentListIcon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import teamService, { TeamDetails, PendingTeamPost } from '../services/teamService'
import Card from '../components/Card'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import Avatar from '../components/Avatar'
import Alert from '../components/Alert'
import AddMemberModal from './AddMemberModal'
import CreateTeamPostModal from './CreateTeamPostModal'
import { useAuth } from '../auth/AuthContext'

const TeamDetailPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'members' | 'pending'>('about')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [memberMenuOpen, setMemberMenuOpen] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [updatingMember, setUpdatingMember] = useState<number | null>(null)
  // Pending posts state
  const [pendingPosts, setPendingPosts] = useState<PendingTeamPost[]>([])
  const [pendingPostsLoading, setPendingPostsLoading] = useState(false)
  const [pendingPostsCount, setPendingPostsCount] = useState(0)
  const [approvingPost, setApprovingPost] = useState<number | null>(null)
  const [rejectingPost, setRejectingPost] = useState<number | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [pendingPostsError, setPendingPostsError] = useState<string | null>(null)

  // Permission checks
  const isSuperAdmin = currentMember?.isSuperAdmin || false
  const isGlobalDirector = currentMember?.role === 'director'
  const isTeamCreator = team?.createdByUuid === currentMember?.uuid
  const isTeamLead = team?.members?.some(
    m => m.uuid === currentMember?.uuid && m.role === 'lead'
  )

  // Check if current user is a member of this team
  const isTeamMember = team?.members?.some(
    m => m.uuid === currentMember?.uuid
  )

  // Permission flags
  const canManageMembers = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canChangeRoles = isSuperAdmin || isTeamCreator
  const canApprovePosts = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead

  const fetchTeam = async () => {
    if (!uuid) return

    setIsLoading(true)
    try {
      const result = await teamService.getTeam(uuid)
      if (result.success) {
        setTeam(result.data.team)
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [uuid])

  // Fetch pending posts when tab is active and user can approve posts
  const fetchPendingPosts = async () => {
    if (!uuid) return

    setPendingPostsLoading(true)
    setPendingPostsError(null)
    try {
      const result = await teamService.getPendingPosts(uuid, { limit: 50 })
      if (result.success) {
        setPendingPosts(result.data)
        setPendingPostsCount(result.pagination?.totalItems || result.data.length)
      }
    } catch (error: any) {
      console.error('Failed to fetch pending posts:', error)
      setPendingPostsError(error.response?.data?.message || 'Failed to load pending posts')
    } finally {
      setPendingPostsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'pending' && canApprovePosts) {
      fetchPendingPosts()
    }
  }, [uuid, activeTab, canApprovePosts])

  // Also fetch pending posts count on initial load for badge
  useEffect(() => {
    if (uuid && canApprovePosts) {
      teamService.getPendingPosts(uuid, { limit: 1 }).then(result => {
        if (result.success) {
          setPendingPostsCount(result.pagination?.totalItems || result.data.length)
        }
      }).catch(() => {
        // Silently fail for badge count
      })
    }
  }, [uuid, canApprovePosts])

  const handleApprovePost = async (postId: number) => {
    if (!uuid) return

    setApprovingPost(postId)
    try {
      const result = await teamService.approvePost(uuid, postId)
      if (result.success) {
        // Remove from pending list
        setPendingPosts(prev => prev.filter(p => p.postId !== postId))
        setPendingPostsCount(prev => Math.max(0, prev - 1))
      }
    } catch (error: any) {
      console.error('Failed to approve post:', error)
      setPendingPostsError(error.response?.data?.message || 'Failed to approve post')
    } finally {
      setApprovingPost(null)
    }
  }

  const handleRejectPost = async (postId: number) => {
    if (!uuid || !rejectionNote.trim()) {
      setPendingPostsError('Please provide a rejection note')
      return
    }

    setApprovingPost(postId)
    try {
      const result = await teamService.rejectPost(uuid, postId, rejectionNote.trim())
      if (result.success) {
        // Remove from pending list
        setPendingPosts(prev => prev.filter(p => p.postId !== postId))
        setPendingPostsCount(prev => Math.max(0, prev - 1))
        setRejectingPost(null)
        setRejectionNote('')
      }
    } catch (error: any) {
      console.error('Failed to reject post:', error)
      setPendingPostsError(error.response?.data?.message || 'Failed to reject post')
    } finally {
      setApprovingPost(null)
    }
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!uuid || !window.confirm('Are you sure you want to remove this member from the team?')) return

    setUpdatingMember(memberId)
    try {
      const result = await teamService.removeMember(uuid, memberId)
      if (result.success) {
        fetchTeam()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setUpdatingMember(null)
      setMemberMenuOpen(null)
      setMenuPosition(null)
    }
  }

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    if (!uuid) return

    setUpdatingMember(memberId)
    try {
      const result = await teamService.updateMemberRole(uuid, memberId, newRole)
      if (result.success) {
        fetchTeam()
      }
    } catch (error) {
      console.error('Failed to update member role:', error)
    } finally {
      setUpdatingMember(null)
      setMemberMenuOpen(null)
      setMenuPosition(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!team) {
    return (
      <Card>
        <Card.Body className="text-center py-12">
          <div className="text-4xl mb-4">404</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Team not found</h3>
          <p className="text-gray-500 mb-4">The team you're looking for doesn't exist or has been removed.</p>
          <Link to="/teams">
            <Button variant="primary">Back to Teams</Button>
          </Link>
        </Card.Body>
      </Card>
    )
  }

  const existingMemberIds = team.members?.map(m => m.memberId) || []

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/teams"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-1" />
        Back to Teams
      </Link>

      {/* Header */}
      <Card>
        <Card.Body className="space-y-4">
          <div className="flex items-start gap-6">
            {/* Logo */}
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-forest-100 flex items-center justify-center">
                <span className="text-3xl font-bold text-forest-600">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              {/* Category Badge */}
              <span className={`inline-block px-2.5 py-1 text-sm font-medium rounded-full mb-2 ${teamService.getCategoryColor(team.category)}`}>
                {teamService.getCategoryLabel(team.category)}
              </span>

              {/* Name */}
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-5 h-5" />
                  <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Create Post Button (Team members only) */}
              {isTeamMember && (
                <div className="mt-4">
                  <Button onClick={() => setShowCreatePostModal(true)}>
                    <PencilSquareIcon className="w-5 h-5 mr-1.5" />
                    Create Post
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['about', 'members'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
              {tab === 'members' && ` (${team.memberCount})`}
            </button>
          ))}
          {/* Pending Posts Tab (for those who can approve posts) */}
          {canApprovePosts && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'border-forest-500 text-forest-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Pending Posts
              {pendingPostsCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                  {pendingPostsCount}
                </span>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* About Tab */}
        {activeTab === 'about' && (
          <Card>
            <Card.Body>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About this Team</h2>
              {team.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{team.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided.</p>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <Card>
            <Card.Body>
              {/* Add Member Button (for those who can manage members) */}
              {canManageMembers && (
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setShowAddMemberModal(true)}>
                    <PlusIcon className="w-5 h-5 mr-1.5" />
                    Add Member
                  </Button>
                </div>
              )}

              {team.members && team.members.length > 0 ? (
                <div className="space-y-2">
                  {team.members.map(member => (
                    <div
                      key={member.uuid}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <Link
                        to={`/profile/${member.uuid}`}
                        className="flex items-center gap-4 flex-1 min-w-0"
                      >
                        <Avatar
                          src={member.avatarUrl}
                          name={member.fullName}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.fullName}
                          </p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          {member.joinedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Joined {new Date(member.joinedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </Link>

                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${teamService.getRoleColor(member.role)}`}>
                        {teamService.getRoleLabel(member.role)}
                      </span>

                      {/* Member Actions (for those who can manage members) */}
                      {canManageMembers && member.uuid !== currentMember?.uuid && (
                        <div className="relative">
                          <button
                            ref={(el) => {
                              if (el) menuButtonRefs.current.set(member.memberId, el)
                            }}
                            onClick={() => {
                              if (memberMenuOpen === member.memberId) {
                                setMemberMenuOpen(null)
                                setMenuPosition(null)
                              } else {
                                const button = menuButtonRefs.current.get(member.memberId)
                                if (button) {
                                  const rect = button.getBoundingClientRect()
                                  const menuWidth = 192 // w-48 = 12rem = 192px
                                  const menuHeight = 200 // approximate height
                                  const viewportHeight = window.innerHeight
                                  const viewportWidth = window.innerWidth

                                  // Position menu to the left of button, below by default
                                  let left = rect.right - menuWidth
                                  let top = rect.bottom + 4

                                  // If menu would go off bottom, show above
                                  if (top + menuHeight > viewportHeight) {
                                    top = rect.top - menuHeight - 4
                                  }

                                  // If menu would go off left edge, align to left edge with padding
                                  if (left < 8) {
                                    left = 8
                                  }

                                  // If menu would go off right edge
                                  if (left + menuWidth > viewportWidth - 8) {
                                    left = viewportWidth - menuWidth - 8
                                  }

                                  setMenuPosition({ top, left })
                                }
                                setMemberMenuOpen(member.memberId)
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No members yet</p>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Pending Posts Tab (for those who can approve posts) */}
        {activeTab === 'pending' && canApprovePosts && (
          <>
            {pendingPostsError && (
              <Alert variant="error" onClose={() => setPendingPostsError(null)} className="mb-4">
                {pendingPostsError}
              </Alert>
            )}

            {pendingPostsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : pendingPosts.length > 0 ? (
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <Card key={post.postId}>
                    <Card.Body>
                      <div className="flex items-start gap-4">
                        <Link to={`/profile/${post.authorUuid}`}>
                          <Avatar
                            src={post.authorAvatar}
                            name={post.authorName}
                            size="md"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              to={`/profile/${post.authorUuid}`}
                              className="font-medium text-gray-900 hover:text-forest-600"
                            >
                              {post.authorName}
                            </Link>
                            <span className="text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.body}</p>

                          {/* Post Images */}
                          {post.images && post.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {post.images.map((img) => (
                                <img
                                  key={img.blobUrl}
                                  src={img.blobUrl}
                                  alt=""
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}

                          {/* Rejection Note Input */}
                          {rejectingPost === post.postId && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <label className="block text-sm font-medium text-red-800 mb-1">
                                Rejection Note (required)
                              </label>
                              <textarea
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                placeholder="Explain why this post is being rejected..."
                                rows={2}
                                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                              />
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleRejectPost(post.postId)}
                                  loading={approvingPost === post.postId}
                                  disabled={!rejectionNote.trim()}
                                >
                                  Confirm Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setRejectingPost(null)
                                    setRejectionNote('')
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {rejectingPost !== post.postId && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprovePost(post.postId)}
                                loading={approvingPost === post.postId}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckIcon className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setRejectingPost(post.postId)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <XMarkIcon className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Card.Body className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending posts</h3>
                  <p className="text-gray-500">
                    All posts have been reviewed. New posts from team members will appear here.
                  </p>
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={fetchTeam}
        teamUuid={uuid || ''}
        existingMemberIds={existingMemberIds}
      />

      {/* Create Post Modal */}
      {team && (
        <CreateTeamPostModal
          isOpen={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          onSuccess={() => {
            // Refresh pending posts count if user can approve posts
            if (canApprovePosts) {
              fetchPendingPosts()
            }
          }}
          teamUuid={uuid || ''}
          teamName={team.name}
          teamCategory={team.category}
          members={team.members || []}
        />
      )}

      {/* Member Actions Dropdown (Portal) */}
      {memberMenuOpen !== null && menuPosition && createPortal(
        (() => {
          const targetMember = team?.members?.find(m => m.memberId === memberMenuOpen)

          // Filter available roles based on permissions
          // - 'member' role: anyone who can manage can assign
          // - 'lead' role: only super-admin or team creator
          const availableRoles = teamService.getRoles().filter(role => {
            if (role === 'member') return true
            if (role === 'lead') return canChangeRoles
            return false
          })

          return (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => {
                  setMemberMenuOpen(null)
                  setMenuPosition(null)
                }}
              />
              {/* Dropdown Menu */}
              <div
                className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[9999]"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                {/* Change Role Section - only show if user can change roles and there are role options */}
                {canChangeRoles && availableRoles.length > 1 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                      Change Role
                    </div>
                    {availableRoles.map(role => (
                      <button
                        key={role}
                        onClick={() => handleUpdateRole(memberMenuOpen, role)}
                        disabled={updatingMember === memberMenuOpen || targetMember?.role === role}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 ${
                          targetMember?.role === role ? 'text-forest-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {teamService.getRoleLabel(role)}
                        {targetMember?.role === role && ' (current)'}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1" />
                  </>
                )}
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveMember(memberMenuOpen)}
                  disabled={updatingMember === memberMenuOpen}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove from Team
                </button>
              </div>
            </>
          )
        })(),
        document.body
      )}

    </div>
  )
}

export default TeamDetailPage
