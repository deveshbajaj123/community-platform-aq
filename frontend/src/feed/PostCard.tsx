import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Card from '../components/Card'
import { getCategoryInfo } from './CategoryFilter'
import TaggedMembersDisplay from './TaggedMembersDisplay'

interface PostCardProps {
  post: Post
  onDelete?: (postId: number) => void
  isPublicView?: boolean
}

const PostCard = ({ post, onDelete, isPublicView = false }: PostCardProps) => {
  const { member } = useAuth()
  const navigate = useNavigate()
  const [isLiked, setIsLiked] = useState(post.isLiked || false)
  const [likeCount, setLikeCount] = useState(post.likeCount)
  const [isLiking, setIsLiking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const categoryInfo = getCategoryInfo(post.category)
  const isOwner = member?.uuid === post.authorUuid
  const isDirector = member?.role === 'director'

  // Use /member/:uuid for public view, /profile/:uuid for authenticated users
  const getProfileLink = (uuid: string) => member ? `/profile/${uuid}` : `/member/${uuid}`

  const handleLike = async () => {
    // Redirect to login if not authenticated
    if (isPublicView || !member) {
      navigate('/login')
      return
    }
    if (isLiking) return
    setIsLiking(true)

    // Optimistic update
    const previousLiked = isLiked
    const previousCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

    try {
      const result = await feedService.toggleLike(post.uuid)
      if (result.success) {
        // Use the actual count from the server
        setIsLiked(result.data.liked)
        setLikeCount(result.data.likeCount)
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await feedService.deletePost(post.uuid)
      onDelete?.(post.postId)
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
    setShowMenu(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const hasTaggedMembers = post.taggedMembers && post.taggedMembers.length > 0

  return (
    <Card className="animate-fade-in">
      <Card.Body>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {hasTaggedMembers ? (
              /* Show tagged members at top when there are tags */
              <div className="flex-1 min-w-0">
                <TaggedMembersDisplay
                  members={post.taggedMembers!}
                  getProfileLink={getProfileLink}
                  showAsHeader
                />
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1.5">
                  <Badge variant="default" size="sm">
                    {categoryInfo.emoji} {categoryInfo.label}
                  </Badge>
                  {post.teamName && (
                    <Link to={`/teams/${post.teamUuid}`}>
                      <Badge variant="forest" size="sm">{post.teamName}</Badge>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* Show author when no tagged members */
              <>
                <Link to={getProfileLink(post.authorUuid)}>
                  <Avatar
                    src={post.authorAvatar}
                    name={post.authorName}
                    size="md"
                  />
                </Link>
                <div>
                  <Link
                    to={getProfileLink(post.authorUuid)}
                    className="font-medium text-gray-900 hover:text-forest-600"
                  >
                    {post.authorName}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                    <Badge variant="default" size="sm">
                      {categoryInfo.emoji} {categoryInfo.label}
                    </Badge>
                    {post.teamName && (
                      <Link to={`/teams/${post.teamUuid}`}>
                        <Badge variant="forest" size="sm">{post.teamName}</Badge>
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Menu */}
          {(isOwner || isDirector) && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-cream-200"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-cream-200 py-1 z-20">
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pending status badge */}
        {post.status === 'pending_review' && (
          <div className="mb-3">
            <Badge variant="warning">Awaiting approval</Badge>
          </div>
        )}

        {/* Body */}
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap">{post.body}</p>
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className={`mb-4 ${
            post.images.length === 1
              ? ''
              : post.images.length === 2
                ? 'grid grid-cols-2 gap-2'
                : post.images.length === 3
                  ? 'grid grid-cols-2 gap-2'
                  : 'grid grid-cols-2 gap-2'
          }`}>
            {post.images.length === 1 && (
              <img
                src={post.images[0].blobUrl}
                alt=""
                className="w-full rounded-lg object-cover max-h-[500px]"
              />
            )}
            {post.images.length === 2 && post.images.map((img) => (
              <img
                key={img.blobUrl}
                src={img.blobUrl}
                alt=""
                className="w-full h-64 rounded-lg object-cover"
              />
            ))}
            {post.images.length === 3 && (
              <>
                <img
                  key={post.images[0].blobUrl}
                  src={post.images[0].blobUrl}
                  alt=""
                  className="w-full h-80 rounded-lg object-cover row-span-2"
                />
                <img
                  key={post.images[1].blobUrl}
                  src={post.images[1].blobUrl}
                  alt=""
                  className="w-full h-[156px] rounded-lg object-cover"
                />
                <img
                  key={post.images[2].blobUrl}
                  src={post.images[2].blobUrl}
                  alt=""
                  className="w-full h-[156px] rounded-lg object-cover"
                />
              </>
            )}
            {post.images.length >= 4 && post.images.slice(0, 4).map((img) => (
              <img
                key={img.blobUrl}
                src={img.blobUrl}
                alt=""
                className="w-full h-48 rounded-lg object-cover"
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
            className="block mb-4 p-3 border border-cream-300 rounded-lg hover:bg-cream-50 transition-colors"
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

        {/* Actions */}
        <div className="flex items-center pt-3 border-t border-cream-200">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              isLiked
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-500 hover:bg-cream-200'
            }`}
          >
            {isLiked ? (
              <HeartIconSolid className="w-5 h-5" />
            ) : (
              <HeartIcon className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{likeCount}</span>
          </button>
        </div>

        {/* Date */}
        <div className="text-xs text-gray-400 mt-2 text-right">
          {formatDate(post.createdAt)}
        </div>
      </Card.Body>
    </Card>
  )
}

export default PostCard
