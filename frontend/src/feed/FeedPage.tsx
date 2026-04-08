import { useState, useEffect, useCallback } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Post } from '../services/api'
import feedService from '../services/feedService'
import PostCard from './PostCard'
import CategoryFilter from './CategoryFilter'
import CreatePostModal from './CreatePostModal'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import Card from '../components/Card'

const FeedPage = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchPosts = useCallback(async (pageNum: number, cat: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }

    try {
      const result = await feedService.getFeed({
        page: pageNum,
        limit: 20,
        category: cat || undefined
      })

      if (result.success) {
        if (append) {
          setPosts(prev => [...prev, ...result.data])
        } else {
          setPosts(result.data)
        }
        setHasMore(result.pagination.hasNextPage)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchPosts(1, category)
  }, [category, fetchPosts])

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage, category, true)
  }

  const handlePostCreated = () => {
    // Refresh feed
    setPage(1)
    fetchPosts(1, category)
  }

  const handlePostDelete = (postId: number) => {
    setPosts(prev => prev.filter(p => p.postId !== postId))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Community Feed</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-forest-500 hover:bg-forest-600 text-white"
        >
          <PlusIcon className="w-5 h-5 mr-1.5" />
          New Post
        </Button>
      </div>

      {/* Category Filter */}
      <CategoryFilter selected={category} onChange={handleCategoryChange} />

      {/* Posts */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">
              {category
                ? 'No posts in this category yet. Be the first to share!'
                : 'Be the first to share something with the community!'}
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-forest-500 hover:bg-forest-600 text-white"
            >
              Create Post
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4 stagger-children">
          {posts.map(post => (
            <PostCard
              key={post.postId}
              post={post}
              onDelete={handlePostDelete}
            />
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

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  )
}

export default FeedPage
