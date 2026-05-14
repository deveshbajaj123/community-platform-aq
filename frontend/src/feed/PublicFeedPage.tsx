import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Post } from '../services/api'
import feedService from '../services/feedService'
import PostCard from './PostCard'
import CategoryFilter from './CategoryFilter'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

const PublicFeedPage = () => {
  const { member } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Banner for non-authenticated users — outer rounded-2xl=16px, no nested radii here */}
      {!member && (
        <div className="bg-gradient-to-r from-forest-500 to-forest-600 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-3">Welcome to AquaTerra Community</h1>
          <p className="text-white/90 mb-6 max-w-2xl">
            Discover student initiatives, share achievements, and connect with fellow changemakers.
            Join our community to post, like, and engage with others.
          </p>
          <div className="flex gap-3">
            <Link to="/login">
              <Button className="bg-white text-forest-600 hover:bg-cream-100">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" className="border-white text-white hover:bg-white/10">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Feed</h2>
        {member && (
          <Link to="/feed">
            <Button className="bg-forest-500 hover:bg-forest-600 text-white">
              Go to Dashboard
            </Button>
          </Link>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <CategoryFilter selected={category} onChange={handleCategoryChange} />
      </div>

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
                ? 'No posts in this category yet.'
                : 'The community feed is empty. Check back soon!'}
            </p>
            {!member && (
              <Link to="/login">
                <Button className="bg-forest-500 hover:bg-forest-600 text-white">
                  Sign in to Post
                </Button>
              </Link>
            )}
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.postId}
              post={post}
              onDelete={() => {}}
              isPublicView={!member}
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
    </div>
  )
}

export default PublicFeedPage
