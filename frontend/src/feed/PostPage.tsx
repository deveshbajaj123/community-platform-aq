import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Post } from '../services/api'
import { useAuth } from '../auth/AuthContext'
import feedService from '../services/feedService'
import PostCard from './PostCard'

const PostPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member } = useAuth()
  const navigate = useNavigate()

  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!uuid) return
    setIsLoading(true)
    feedService.getPost(uuid)
      .then(result => {
        if (result.success && result.data.post.status === 'published') {
          setPost(result.data.post)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [uuid])

  const backHref = member ? '/feed' : '/'

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px 60px' }}>
        {/* Back nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 16px' }}>
          <button
            onClick={() => navigate(-1)}
            className="aq-nav-ghost-btn"
            aria-label="Go back"
            style={{ fontFamily: 'var(--f-display)', fontSize: 13 }}
          >
            ←
          </button>
          <Link
            to={backHref}
            style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, color: 'var(--txt-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {member ? 'Back to Feed' : 'Back to Home'}
          </Link>
        </div>

        {isLoading ? (
          <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="aq-spinner" />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING POST</span>
          </div>
        ) : notFound || !post ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, color: 'var(--txt)', marginBottom: 8 }}>Post not found</div>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)', marginBottom: 24 }}>
              This post doesn't exist or may have been removed.
            </p>
            <Link to={backHref} className="aq-btn aq-btn-outline aq-btn-sm">← Go back</Link>
          </div>
        ) : (
          <PostCard post={post} isPublicView={!member} />
        )}
      </div>
    </div>
  )
}

export default PostPage
