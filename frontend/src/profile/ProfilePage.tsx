import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService, { MemberProfile } from '../services/profileService'
import { Post, Achievement } from '../services/api'
import achievementService from '../services/achievementService'
import PostCard from '../feed/PostCard'
import AchievementsList from './AchievementsList'

interface ProfilePageProps {
  isOwn?: boolean
}

type Tab = 'posts' | 'achievements'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const ProfilePage = ({ isOwn: isOwnProp = false }: ProfilePageProps) => {
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

  const isOwn = isOwnProp || (currentMember?.uuid === uuid)
  const profileUuid = isOwnProp ? currentMember?.uuid : uuid

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileUuid) return
      setIsLoading(true)
      try {
        if (isOwn) {
          const result = await profileService.getOwnProfile()
          if (result.success) setProfile(result.data.member)
        } else {
          const result = await profileService.getPublicProfile(profileUuid)
          if (result.success) setProfile(result.data.profile)
        }
      } catch (error) { console.error('Failed to fetch profile:', error) }
      finally { setIsLoading(false) }
    }
    fetchProfile()
  }, [profileUuid, isOwn])

  useEffect(() => {
    const fetchContent = async () => {
      if (!profileUuid) return
      setIsLoadingPosts(true)
      try {
        if (activeTab === 'achievements') {
          const result = await achievementService.getMemberAchievements(profileUuid, { page: 1, limit: 20 })
          if (result.success) { setAchievements(result.data); setHasMore(result.pagination.hasNextPage); setPage(1) }
        } else {
          const result = await profileService.getMemberPosts(profileUuid, { page: 1, limit: 20 })
          if (result.success) { setPosts(result.data); setHasMore(result.pagination.hasNextPage); setPage(1) }
        }
      } catch (error) { console.error('Failed to fetch content:', error) }
      finally { setIsLoadingPosts(false) }
    }
    fetchContent()
  }, [profileUuid, activeTab])

  const loadMorePosts = async () => {
    if (!profileUuid || !hasMore) return
    const nextPage = page + 1
    try {
      const result = await profileService.getMemberPosts(profileUuid, { page: nextPage, limit: 20 })
      if (result.success) { setPosts(prev => [...prev, ...result.data]); setHasMore(result.pagination.hasNextPage); setPage(nextPage) }
    } catch (error) { console.error('Failed to load more posts:', error) }
  }

  const handlePostDelete = (postId: number) => setPosts(prev => prev.filter(p => p.postId !== postId))

  const handleShareProfile = async () => {
    const targetUuid = profile?.uuid
    if (!targetUuid) return
    const url = `${window.location.origin}/member/${targetUuid}`
    try { await navigator.clipboard.writeText(url) }
    catch {
      const el = document.createElement('input'); el.value = url
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="aq-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 320, gap: 16 }}>
        <div className="aq-spinner" />
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING PROFILE</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>Profile not found</div>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)', marginBottom: 20 }}>This profile doesn't exist or has been removed.</p>
          <Link to="/feed" className="aq-btn aq-btn-accent aq-btn-sm">Back to Feed</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 48px' }}>
        {/* Profile Header Card */}
        <div className="aq-post-card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          {/* Accent stripe */}
          <div style={{ height: 4, background: profile.role === 'director' ? 'var(--accent)' : 'var(--c-welfare)', width: '100%' }} />
          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div className="aq-avatar" style={{ width: 72, height: 72, fontSize: 22, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  : initials(profile.fullName)
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--txt)' }}>
                    {profile.fullName}
                  </h1>
                  {profile.role === 'director' && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>
                      Director
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 12 }}>
                  {profile.classGrade && <span>{profile.classGrade}</span>}
                  {profile.schoolName && <span>{profile.schoolName}</span>}
                  {profile.createdAt && <span>Joined {formatDate(profile.createdAt)}</span>}
                  {profile.postCount !== undefined && (
                    <span><strong style={{ color: 'var(--txt)', fontFamily: 'var(--f-display)' }}>{profile.postCount || 0}</strong> posts</span>
                  )}
                </div>

                {profile.bio && (
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--txt-2)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                    {profile.bio}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isOwn && (
                    <Link to="/profile/edit" className="aq-btn aq-btn-outline aq-btn-sm">
                      Edit Profile
                    </Link>
                  )}
                  <button onClick={handleShareProfile} className="aq-btn aq-btn-outline aq-btn-sm"
                    style={{ color: linkCopied ? 'var(--accent)' : undefined }}
                  >
                    {linkCopied ? '✓ Copied' : '↗ Share'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="aq-profile-tabs" style={{ marginBottom: 20 }}>
          <button className={`aq-profile-tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Posts</button>
          <button className={`aq-profile-tab ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>Achievements</button>
        </div>

        {/* Content */}
        {activeTab === 'achievements' ? (
          <AchievementsList
            achievements={achievements}
            isLoading={isLoadingPosts}
            isOwn={isOwn}
            profileName={profile.fullName}
            onRefresh={async () => {
              if (!profileUuid) return
              try {
                const result = await achievementService.getMemberAchievements(profileUuid, { page: 1, limit: 20 })
                if (result.success) setAchievements(result.data)
              } catch (error) { console.error('Failed to refresh achievements:', error) }
            }}
          />
        ) : isLoadingPosts ? (
          <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="aq-spinner" />
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)', marginBottom: 8 }}>
              {isOwn ? "You haven't posted anything yet." : `${profile.fullName} hasn't posted anything yet.`}
            </p>
          </div>
        ) : (
          <div>
            {posts.map(post => (
              <PostCard key={post.postId} post={post} onDelete={handlePostDelete} />
            ))}
            {hasMore && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <button onClick={loadMorePosts} className="aq-btn aq-btn-outline aq-btn-sm">Load more →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
