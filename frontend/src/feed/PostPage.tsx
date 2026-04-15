import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import PostCard from './PostCard'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import Button from '../components/Button'

const PostPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      if (!uuid) return
      setIsLoading(true)
      try {
        const result = await feedService.getPost(uuid)
        if (result.success && result.data.post.status === 'published') {
          setPost(result.data.post)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [uuid])

  const backHref = member ? '/feed' : '/'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <Link
          to={backHref}
          className="text-sm text-gray-500 hover:text-forest-600 transition-colors"
        >
          {member ? 'Back to Feed' : 'Back to Home'}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : notFound || !post ? (
        <Card>
          <Card.Body className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Post not found</h3>
            <p className="text-gray-500 mb-6">
              This post doesn't exist or may have been removed.
            </p>
            <Link to={backHref}>
              <Button variant="secondary">Go back</Button>
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <PostCard post={post} isPublicView={!member} />
      )}
    </div>
  )
}

export default PostPage
