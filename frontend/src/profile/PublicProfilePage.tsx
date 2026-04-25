import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CalendarIcon, AcademicCapIcon, BuildingLibraryIcon, LinkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../auth/AuthContext'
import profileService, { MemberProfile } from '../services/profileService'
import achievementService from '../services/achievementService'
import { Post, Achievement } from '../services/api'
import PostCard from '../feed/PostCard'
import AchievementsList from './AchievementsList'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Spinner from '../components/Spinner'

type Tab = 'posts' | 'achievements'

const PublicProfilePage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()

  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uuid) return
      setIsLoading(true)

      try {
        const result = await profileService.getPublicProfile(uuid)
        if (result.success) {
          setProfile(result.data.profile)
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [uuid])

  useEffect(() => {
    const fetchContent = async () => {
      if (!uuid) return
      setIsLoadingPosts(true)

      try {
        if (activeTab === 'achievements') {
          const result = await achievementService.getMemberAchievements(uuid, { page: 1, limit: 20 })
          if (result.success) {
            setAchievements(result.data)
            setHasMore(result.pagination.hasNextPage)
            setPage(1)
          }
        } else {
          const result = await profileService.getMemberPosts(uuid, { page: 1, limit: 20 })
          if (result.success) {
            setPosts(result.data)
            setHasMore(result.pagination.hasNextPage)
            setPage(1)
          }
        }
      } catch (error) {
        console.error('Failed to fetch content:', error)
      } finally {
        setIsLoadingPosts(false)
      }
    }

    fetchContent()
  }, [uuid, activeTab])

  const loadMorePosts = async () => {
    if (!uuid || !hasMore || activeTab !== 'posts') return

    const nextPage = page + 1
    try {
      const result = await profileService.getMemberPosts(uuid, { page: nextPage, limit: 20 })

      if (result.success) {
        setPosts(prev => [...prev, ...result.data])
        setHasMore(result.pagination.hasNextPage)
        setPage(nextPage)
      }
    } catch (error) {
      console.error('Failed to load more posts:', error)
    }
  }

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/member/${uuid}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <Card.Body className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
            <p className="text-gray-500 mb-4">This profile doesn't exist or has been removed.</p>
            <Link to="/">
              <Button className="bg-forest-500 hover:bg-forest-600 text-white">
                Back to Feed
              </Button>
            </Link>
          </Card.Body>
        </Card>
      </div>
    )
  }

  // Check if viewing own profile (logged in user viewing their own public profile)
  const isOwnProfile = currentMember?.uuid === uuid

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Banner for non-authenticated users */}
      {!currentMember && (
        <div className="bg-gradient-to-r from-forest-500 to-forest-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Join AquaTerra Community</h2>
          <p className="text-white/90 mb-4">
            Sign in to like posts, create your own content, and connect with {profile.fullName}.
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

      {/* Profile Header */}
      <Card>
        <Card.Body className="py-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              src={profile.avatarUrl}
              name={profile.fullName}
              size="xl"
              className="w-24 h-24"
            />

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.fullName}</h1>
                {profile.role === 'director' && (
                  <Badge variant="forest" size="md">Director</Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                {profile.classGrade && (
                  <div className="flex items-center gap-1">
                    <AcademicCapIcon className="w-4 h-4" />
                    <span>{profile.classGrade}</span>
                  </div>
                )}
                {(profile.schoolName || (profile as any).school?.name) && (
                  <div className="flex items-center gap-1">
                    <BuildingLibraryIcon className="w-4 h-4" />
                    <span>{profile.schoolName || (profile as any).school?.name}</span>
                  </div>
                )}
                {profile.createdAt && (
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Joined {formatDate(profile.createdAt)}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-semibold text-gray-900">{profile.postCount || 0}</span>
                  <span className="text-gray-500 ml-1">Posts</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4">
                {isOwnProfile && currentMember && (
                  <Link to="/profile/edit">
                    <Button variant="secondary" size="sm">
                      Edit Profile
                    </Button>
                  </Link>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShareProfile}
                  title="Copy profile link"
                >
                  {linkCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1.5 text-forest-600" />
                      <span className="text-forest-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-1.5" />
                      Share
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-cream-300">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-forest-500 text-forest-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'achievements'
              ? 'border-forest-500 text-forest-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Achievements
        </button>
      </div>

      {/* Content */}
      {activeTab === 'achievements' ? (
        <AchievementsList
          achievements={achievements}
          isLoading={isLoadingPosts}
          isOwn={false}
          profileName={profile.fullName}
          onRefresh={async () => {
            if (!uuid) return
            try {
              const result = await achievementService.getMemberAchievements(uuid, { page: 1, limit: 20 })
              if (result.success) {
                setAchievements(result.data)
              }
            } catch (error) {
              console.error('Failed to refresh achievements:', error)
            }
          }}
        />
      ) : isLoadingPosts ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-4xl mb-4">{'\u{1F4DD}'}</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500">
              {profile.fullName} hasn't posted anything yet.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.postId}
              post={post}
              onDelete={() => {}}
              isPublicView={!currentMember}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button onClick={loadMorePosts} variant="secondary">
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PublicProfilePage
