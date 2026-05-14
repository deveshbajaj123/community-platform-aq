import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService, { MemberProfile } from '../services/profileService'
import { Post, Achievement } from '../services/api'
import achievementService from '../services/achievementService'
import FeedPostCard from '../feed/FeedPostCard'
import AchievementsList from './AchievementsList'
import { Star, Burst } from '../components/v6Shared'
import { getRoleLabel, getRoleClass } from '../lib/roles'
import { useIsMobile } from '../hooks/useMobile'

interface ProfilePageProps {
  isOwn?: boolean
}

type Tab = 'posts' | 'achievements' | 'about'

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']

function getAvatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const ProfilePage = ({ isOwn: isOwnProp = false }: ProfilePageProps) => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const isMobile = useIsMobile()

  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achievementCount, setAchievementCount] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
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
        // Eagerly fetch achievement count for the stat card
        const acResult = await achievementService.getMemberAchievements(profileUuid, { page: 1, limit: 50 })
        if (acResult.success) setAchievementCount(acResult.data.length)
      } catch (error) { console.error('Failed to fetch profile:', error) }
      finally { setIsLoading(false) }
    }
    fetchProfile()
  }, [profileUuid, isOwn])

  useEffect(() => {
    const fetchContent = async () => {
      if (!profileUuid) return
      setIsLoadingContent(true)
      try {
        if (activeTab === 'achievements') {
          const result = await achievementService.getMemberAchievements(profileUuid, { page: 1, limit: 20 })
          if (result.success) {
            setAchievements(result.data)
            setAchievementCount(result.data.length)
            setHasMore(result.pagination.hasNextPage)
            setPage(1)
          }
        } else if (activeTab === 'posts') {
          const result = await profileService.getMemberPosts(profileUuid, { page: 1, limit: 20 })
          if (result.success) { setPosts(result.data); setHasMore(result.pagination.hasNextPage); setPage(1) }
        }
      } catch (error) { console.error('Failed to fetch content:', error) }
      finally { setIsLoadingContent(false) }
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

  const handleShareProfile = async () => {
    const targetUuid = profile?.uuid
    if (!targetUuid) return
    const url = `${window.location.origin}/member/${targetUuid}`
    try { await navigator.clipboard.writeText(url) } catch {
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
      <div className="route-enter">
        {/* Hero */}
        <div style={{ background: 'var(--bg-2)', padding: 'clamp(28px,5vw,52px) var(--page-px,24px)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="v6-skeleton sk-circle" style={{ width: 88, height: 88 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="v6-skeleton" style={{ width: 200, height: 28, marginBottom: 10 }} />
                <div className="v6-skeleton" style={{ width: 140, height: 13, marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 18 }}>
                  {[44, 44, 44].map((w, i) => <div key={i} className="v6-skeleton" style={{ width: w, height: 18 }} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Tabs + cards */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(20px,4vw,28px) var(--page-px,24px) 80px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[80, 120, 70].map((w, i) => <div key={i} className="v6-skeleton sk-pill" style={{ width: w, height: 34 }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }} className="sk-group">
            {[1,2,3].map(i => <div key={i} className="v6-skeleton" style={{ height: 260, borderRadius: 20 }} />)}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(44px, 8vw, 80px)', paddingBottom: 'clamp(44px, 8vw, 80px)', textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 40 }}>profile not found.</div>
        <Link to="/feed" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>← back to feed</Link>
      </div>
    )
  }

  const avatarColor = getAvatarColor(profile.fullName)
  const firstName = profile.fullName.split(' ')[0]
  const lastName = profile.fullName.split(' ').slice(1).join(' ')

  const ACHIEVEMENTS = [
    { t: 'First Post', d: 'shipped your first piece of work', c: 'var(--mint)', e: '★' },
    { t: '100 Likes', d: '100 humans approve', c: 'var(--lemon)', e: '✦' },
    { t: 'Cleanup Crew', d: 'joined 3 events', c: 'var(--pink)', e: '✺' },
    { t: 'Lab Rat', d: '5 lab posts', c: '#7E5BFF', e: '✤' },
    { t: 'Zine Drop', d: 'contributed to a zine', c: '#FF4D2E', e: '✸' },
    { t: 'Tutor', d: '30+ hrs tutoring', c: 'var(--sky)', e: '✥' },
  ]

  return (
    <div className="route-enter">
      {/* HERO */}
      <section style={{ position: 'relative', padding: isMobile ? '28px 0 36px' : '40px 24px 60px', borderBottom: '2px solid var(--ink)', overflow: 'hidden' }}>
        <div className="halftone" style={{ position: 'absolute', inset: 0, color: avatarColor, opacity: 0.18 }} />
        <Star size={80} color="var(--lemon)" style={{ position: 'absolute', top: 30, right: 80, transform: 'rotate(-15deg)' }} />
        <Burst size={70} color="var(--pink)" style={{ position: 'absolute', bottom: 30, right: 200, transform: 'rotate(20deg)' }} />
        <div className="container" style={{ position: 'relative', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', justifyItems: isMobile ? 'center' : 'start', gap: isMobile ? 16 : 32, alignItems: 'center' }}>
          <div className="avatar avatar-xl" style={{ background: avatarColor, border: '4px solid var(--ink)', boxShadow: '6px 6px 0 0 var(--ink)', overflow: 'hidden', flexShrink: 0 }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              : initials(profile.fullName)
            }
          </div>
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <div className="row gap-2" style={{ marginBottom: 12, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <span className={`role ${getRoleClass(profile.role)}`}>{getRoleLabel(profile.role).toUpperCase()}</span>
              {profile.createdAt && <span className="role">JOINED {formatDate(profile.createdAt).toUpperCase()}</span>}
            </div>
            <h1 className="h-display" style={{ fontSize: 'clamp(40px, 7vw, 84px)', margin: 0, lineHeight: 0.9, textWrap: 'balance' } as React.CSSProperties}>
              {firstName}<br/>
              <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>{lastName}</span>
            </h1>
            {profile.bio && (
              <p className="truncate-2" style={{ fontSize: 17, marginTop: 12, color: 'var(--ink-2)', maxWidth: 560 }}>{profile.bio}</p>
            )}
            <div className="row gap-3 profile-stat-row" style={{ marginTop: 20, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <div className="stat" style={{ padding: '10px 16px' }}>
                <div className="stat-num" style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>{profile.postCount || posts.length || 0}</div>
                <div className="mono xs upper">posts</div>
              </div>
              <div className="stat" style={{ padding: '10px 16px', background: 'var(--lemon)', color: '#0A0A0A' }}>
                <div className="stat-num" style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>
                  {(profile as any).likeCount ?? posts.reduce((s, p) => s + (p.likeCount || 0), 0)}
                </div>
                <div className="mono xs upper">likes earned</div>
              </div>
              <div className="stat" style={{ padding: '10px 16px', background: 'var(--pink)', color: '#0A0A0A' }}>
                <div className="stat-num" style={{ fontSize: 28, fontVariantNumeric: 'tabular-nums' }}>{achievementCount}</div>
                <div className="mono xs upper">achievements</div>
              </div>
            </div>
          </div>
          <div className="col gap-2">
            {isOwn ? (
              <>
                <Link to="/profile/edit" className="btn btn-primary">edit profile</Link>
                <button className="btn" onClick={handleShareProfile}>{linkCopied ? 'copied ✓' : 'share ↗'}</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={handleShareProfile}>{linkCopied ? 'copied ✓' : 'share ↗'}</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="aq-wrap" style={{ paddingTop: 'clamp(24px,5vw,40px)', paddingBottom: 80 }}>
        <div className="tabs">
          <button className={'tab ' + (activeTab === 'posts' ? 'active' : '')} onClick={() => setActiveTab('posts')}>
            posts <span className="count">{profile.postCount || posts.length}</span>
          </button>
          <button className={'tab ' + (activeTab === 'achievements' ? 'active' : '')} onClick={() => setActiveTab('achievements')}>achievements</button>
          <button className={'tab ' + (activeTab === 'about' ? 'active' : '')} onClick={() => setActiveTab('about')}>about</button>
        </div>

        <div style={{ paddingTop: 28 }}>
          {activeTab === 'posts' && (
            isLoadingContent ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="mono xs upper muted">loading…</div></div>
            ) : posts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 18 }}>
                {posts.map((post, i) => (
                  <FeedPostCard key={post.postId} post={post} seed={i} />
                ))}
                {hasMore && (
                  <button onClick={loadMorePosts} className="btn" style={{ gridColumn: '1/-1', justifyContent: 'center' }}>load more</button>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ fontSize: 80, fontFamily: 'var(--display)' }}>¯\_(ツ)_/¯</div>
                <div className="h-display" style={{ fontSize: 32, marginTop: 12 }}>no posts yet</div>
                <p className="muted">when {isOwn ? 'you post' : `${profile.fullName} posts`}, it'll show up here.</p>
              </div>
            )
          )}
          {activeTab === 'achievements' && (
            isLoadingContent ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="mono xs upper muted">loading…</div></div>
            ) : achievements.length > 0 ? (
              <AchievementsList
                achievements={achievements}
                isLoading={false}
                isOwn={isOwn}
                profileName={profile.fullName}
                onRefresh={async () => {
                  if (!profileUuid) return
                  try {
                    const result = await achievementService.getMemberAchievements(profileUuid, { page: 1, limit: 20 })
                    if (result.success) { setAchievements(result.data); setAchievementCount(result.data.length) }
                  } catch (error) { console.error('Failed to refresh achievements:', error) }
                }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 14 }}>
                {ACHIEVEMENTS.map((a, i) => (
                  <div key={i} className="card card-hover" style={{ background: a.c, color: '#0A0A0A', padding: 22, transform: `rotate(${i % 2 === 0 ? -1 : 1.5}deg)`, opacity: 0.4 }}>
                    <div style={{ fontSize: 56, fontFamily: 'var(--display)', fontWeight: 800, lineHeight: 1 }}>{a.e}</div>
                    <div className="h-display" style={{ fontSize: 24, marginTop: 8 }}>{a.t}</div>
                    <div className="mono xs upper" style={{ marginTop: 6, fontWeight: 700 }}>{a.d}</div>
                  </div>
                ))}
              </div>
            )
          )}
          {activeTab === 'about' && (
            <div className="card" style={{ padding: 28, maxWidth: 720 }}>
              <div className="serif" style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>about.</div>
              {profile.bio ? (
                <p style={{ fontSize: 17, lineHeight: 1.6 }}>{profile.bio}</p>
              ) : isOwn ? (
                <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  No bio yet. <Link to="/profile/edit" style={{ color: 'var(--mint)', textDecoration: 'underline' }}>Add one →</Link>
                </p>
              ) : (
                <p style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-3)' }}>{profile.fullName} hasn't added a bio yet.</p>
              )}
              <div style={{ borderTop: '2px dashed var(--line-2)', margin: '20px 0', paddingTop: 16 }}>
                <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                  {profile.schoolName && <div><span className="mono xs upper muted">school</span><div style={{ fontWeight: 700 }}>{profile.schoolName}</div></div>}
                  {profile.classGrade && <div><span className="mono xs upper muted">class</span><div style={{ fontWeight: 700 }}>{profile.classGrade}</div></div>}
                  {profile.createdAt && <div><span className="mono xs upper muted">joined</span><div style={{ fontWeight: 700 }}>{formatDate(profile.createdAt)}</div></div>}
                  <div><span className="mono xs upper muted">role</span><div style={{ fontWeight: 700 }}>{profile.role}</div></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
