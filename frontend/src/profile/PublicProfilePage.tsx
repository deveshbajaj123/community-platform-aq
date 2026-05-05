import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService, { MemberProfile } from '../services/profileService'
import { Post, Achievement } from '../services/api'
import achievementService from '../services/achievementService'
import PostCard from '../feed/PostCard'
import { DEPT_COLORS } from '../lib/supabase'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage() {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'achievements'>('posts')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!uuid) return
    setIsLoading(true)
    profileService.getPublicProfile(uuid)
      .then(r => { if (r.success) setProfile(r.data.profile) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [uuid])

  useEffect(() => {
    if (!uuid) return
    setIsLoadingPosts(true)
    profileService.getMemberPosts(uuid, { page: 1, limit: 20 })
      .then(r => {
        if (r.success) {
          setPosts(r.data)
          setHasMore(r.pagination.hasNextPage)
          setPage(1)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingPosts(false))
  }, [uuid])

  useEffect(() => {
    if (!uuid) return
    achievementService.getMemberAchievements(uuid, { limit: 50 })
      .then(r => { if (r.success) setAchievements(r.data) })
      .catch(() => {})
  }, [uuid])

  const loadMorePosts = async () => {
    if (!uuid || !hasMore) return
    const nextPage = page + 1
    try {
      const r = await profileService.getMemberPosts(uuid, { page: nextPage, limit: 20 })
      if (r.success) { setPosts(prev => [...prev, ...r.data]); setHasMore(r.pagination.hasNextPage); setPage(nextPage) }
    } catch {}
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/member/${uuid}`
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('input'); el.value = url
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="aq-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: 16 }}>
        <div className="aq-spinner" />
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING PROFILE</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, color: 'var(--txt)', marginBottom: 8 }}>Profile not found</div>
          <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-3)', marginBottom: 24 }}>This profile doesn't exist or has been removed.</p>
          <Link to="/" className="aq-btn aq-btn-accent aq-btn-sm">← Back to Feed</Link>
        </div>
      </div>
    )
  }

  const deptColor = DEPT_COLORS.all
  const isOwn = currentMember?.uuid === uuid

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 60px' }}>

        {/* Join banner for logged-out users */}
        {!currentMember && (
          <div style={{ margin: '24px 0', padding: '20px 24px', background: `color-mix(in oklab, ${deptColor} 8%, var(--bg-card))`, border: `1px solid color-mix(in oklab, ${deptColor} 20%, var(--line))`, borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', marginBottom: 4 }}>Join AquaTerra to interact</div>
              <div style={{ fontFamily: 'var(--f-body)', fontSize: 12, color: 'var(--txt-3)' }}>Like posts and connect with {profile.fullName}.</div>
            </div>
            <Link to="/login" className="aq-btn aq-btn-accent aq-btn-sm">Sign In →</Link>
          </div>
        )}

        {/* Profile Header */}
        <div className="aq-profile-header-card">
          <div className="aq-profile-accent-bar" style={{ background: deptColor }} />
          <div className="aq-profile-body">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div className="aq-avatar" style={{ width: 76, height: 76, fontSize: 24, background: deptColor, flexShrink: 0, color: '#0c0c0a', overflow: 'hidden' }}>
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
                  {(['director', 'super_admin'] as string[]).includes(profile.role) && (
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: deptColor, letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${deptColor}`, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>
                      Director
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 14 }}>
                  {profile.classGrade && <span>{profile.classGrade}</span>}
                  {profile.schoolName && <span>· {profile.schoolName}</span>}
                  {profile.createdAt && <span>· Joined {formatDate(profile.createdAt)}</span>}
                </div>

                {profile.bio && (
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, lineHeight: 1.7, color: 'var(--txt-2)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                    {profile.bio}
                  </p>
                )}

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  <div>
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, color: 'var(--txt)', fontVariantNumeric: 'tabular-nums' }}>{profile.postCount || 0}</span>
                    <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, color: 'var(--txt-4)', marginLeft: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Posts</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isOwn && (
                    <Link to="/profile/edit" className="aq-btn aq-btn-outline aq-btn-sm">Edit Profile</Link>
                  )}
                  <button
                    onClick={handleShare}
                    className="aq-btn aq-btn-outline aq-btn-sm"
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
        <div className="aq-profile-tabs" style={{ marginBottom: 20, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--line)' }}>
          <button className={`aq-profile-tab ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Posts</button>
          <button className={`aq-profile-tab ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>Achievements</button>
        </div>

        {/* Content */}
        {activeTab === 'achievements' ? (
          achievements.length === 0 ? (
            <div className="aq-post-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 16, color: 'var(--txt-3)' }}>No achievements yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {achievements.map(a => (
                <div key={a.uuid} className="aq-post-card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--r)', background: `color-mix(in oklab, ${deptColor} 12%, var(--bg-card))`, border: `1px solid color-mix(in oklab, ${deptColor} 20%, var(--line))`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      {a.achievementType === 'leadership' ? '🏆' : a.achievementType === 'academic' ? '📚' : a.achievementType === 'competition' ? '🥇' : a.achievementType === 'personal_project' ? '💡' : '⭐'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: 'var(--txt)', marginBottom: 4 }}>{a.title}</div>
                      {a.description && <p style={{ fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.6, marginBottom: 8 }}>{a.description}</p>}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.achievementType?.replace('_', ' ')}</span>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{new Date(a.achievementDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, color: deptColor, letterSpacing: '0.04em' }}>View proof →</a>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : isLoadingPosts ? (
          <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div className="aq-spinner" />
          </div>
        ) : posts.length === 0 ? (
          <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>
              {profile.fullName} hasn't posted anything yet.
            </p>
          </div>
        ) : (
          <div>
            {posts.map(post => (
              <PostCard key={post.postId} post={post} isPublicView={!currentMember} />
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
