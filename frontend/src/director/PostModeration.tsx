import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import directorService from '../services/directorService'
import { Post } from '../services/api'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Modal from '../components/Modal'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'
import { getCategoryInfo } from '../feed/CategoryFilter'

const PostModeration = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Rejection modal state
  const [rejectingPost, setRejectingPost] = useState<Post | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  // Action states
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async (pageNum: number, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await directorService.getPendingPosts({ page: pageNum, limit: 20 })
      if (result.success) {
        if (append) {
          setPosts(prev => [...prev, ...result.data])
        } else {
          setPosts(result.data)
        }
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (err) {
      setError('Failed to load pending posts')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchPosts(1)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, true)
  }

  const handleApprove = async (post: Post) => {
    setActionLoading(post.postId)
    setError(null)

    try {
      const result = await directorService.approvePost(post.postId)
      if (result.success) {
        setPosts(prev => prev.filter(p => p.postId !== post.postId))
        setSuccess('Post has been approved and published')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to approve post')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingPost || !rejectionNote.trim()) return

    setIsRejecting(true)
    setError(null)

    try {
      const result = await directorService.rejectPost(rejectingPost.postId, rejectionNote)
      if (result.success) {
        setPosts(prev => prev.filter(p => p.postId !== rejectingPost.postId))
        setSuccess('Post has been rejected')
        setTimeout(() => setSuccess(null), 3000)
        closeRejectModal()
      }
    } catch (err) {
      setError('Failed to reject post')
    } finally {
      setIsRejecting(false)
    }
  }

  const openRejectModal = (post: Post) => {
    setRejectingPost(post)
    setRejectionNote('')
  }

  const closeRejectModal = () => {
    setRejectingPost(null)
    setRejectionNote('')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
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
      <div className="flex items-center gap-4">
        <Link
          to="/director"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post Moderation</h1>
          <p className="text-gray-500">Review and approve member posts before publishing</p>
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

      {/* Posts List */}
      {posts.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">
              <CheckIcon className="w-12 h-12 mx-auto text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All posts reviewed!</h3>
            <p className="text-gray-500">There are no pending posts to moderate.</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const categoryInfo = getCategoryInfo(post.category)

            return (
              <Card key={post.postId} className="animate-fade-in">
                <Card.Body>
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${post.authorUuid}`}>
                        <Avatar
                          src={post.authorAvatar}
                          name={post.authorName}
                          size="md"
                        />
                      </Link>
                      <div>
                        <Link
                          to={`/profile/${post.authorUuid}`}
                          className="font-medium text-gray-900 hover:text-forest-600"
                        >
                          {post.authorName}
                        </Link>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{formatDate(post.createdAt)}</span>
                          <span>·</span>
                          <Badge variant="default" size="sm">
                            {categoryInfo.emoji} {categoryInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(post)}
                        loading={actionLoading === post.postId}
                        disabled={actionLoading !== null}
                        className="bg-forest-500 hover:bg-forest-600 text-white"
                        size="sm"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openRejectModal(post)}
                        disabled={actionLoading !== null}
                        variant="danger"
                        size="sm"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{post.body}</p>
                  </div>

                  {/* Tagged Members */}
                  {post.taggedMembers && post.taggedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.taggedMembers.map((member: { uuid: string; fullName: string }) => (
                        <Link
                          key={member.uuid}
                          to={`/profile/${member.uuid}`}
                          className="text-sm text-forest-600 hover:text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full"
                        >
                          @{member.fullName}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Images */}
                  {post.images && post.images.length > 0 && (
                    <div className={`grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {post.images.map((img, i) => (
                        <img
                          key={i}
                          src={img.blobUrl}
                          alt=""
                          className="w-full rounded-lg object-cover max-h-64"
                        />
                      ))}
                    </div>
                  )}

                  {/* Link Preview */}
                  {post.linkUrl && (
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 p-3 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
                    >
                      {post.linkImage && (
                        <img
                          src={post.linkImage}
                          alt=""
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      {post.linkTitle && (
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {post.linkTitle}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">{post.linkUrl}</p>
                    </a>
                  )}
                </Card.Body>
              </Card>
            )
          })}

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
        isOpen={!!rejectingPost}
        onClose={closeRejectModal}
        title="Reject Post"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to reject this post by <strong>{rejectingPost?.authorName}</strong>?
          </p>

          {rejectingPost && (
            <div className="p-3 bg-cream-100 rounded-lg">
              <p className="text-sm text-gray-600 line-clamp-3">{rejectingPost.body}</p>
            </div>
          )}

          <TextArea
            label="Rejection reason"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            rows={3}
            placeholder="Please provide a reason for rejection (visible to the author)..."
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
              Reject Post
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  )
}

export default PostModeration
