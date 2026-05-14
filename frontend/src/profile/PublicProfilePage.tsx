import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import profileService, { MemberProfile } from '../services/profileService'
import { Post, Achievement } from '../services/api'
import achievementService from '../services/achievementService'
import FeedPostCard from '../feed/FeedPostCard'
import { Star } from '../components/v6Shared'
import { getRoleLabel, getRoleClass } from '../lib/roles'
import { useIsMobile } from '../hooks/useMobile'

const getInitials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function PublicProfilePage() {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const isMobile = useIsMobile()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'achievements' | 'about'>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [linkCopied, setLinkCopied] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followPop, setFollowPop] = useState(false)
  const isOwn = currentMember?.uuid === uuid

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
      .then(r => { if (r.success) { setPosts(r.data); setHasMore(r.pagination.hasNextPage); setPage(1) } })
      .catch(() => {})
      .finally(() => setIsLoadingPosts(false))
  }, [uuid])

  useEffect(() => {
    if (!uuid) return
    achievementService.getMemberAchievements(uuid, { limit: 50 })
      .then(r => { if (r.success) setAchievements(r.data) })
      .catch(() => {})
  }, [uuid])

  useEffect(() => {
    if (!currentMember || !uuid || isOwn) return
    const key = `aq_follow_${currentMember.uuid}_${uuid}`
    setIsFollowing(localStorage.getItem(key) === '1')
  }, [currentMember, uuid, isOwn])

  const handleFollow = () => {
    if (!currentMember || !uuid || isOwn) return
    const key = `aq_follow_${currentMember.uuid}_${uuid}`
    const next = !isFollowing
    setIsFollowing(next)
    if (next) { localStorage.setItem(key, '1'); setFollowPop(true); setTimeout(() => setFollowPop(false), 300) }
    else localStorage.removeItem(key)
  }

  const loadMore = async () => {
    if (!uuid || !hasMore) return
    const next = page + 1
    try {
      const r = await profileService.getMemberPosts(uuid, { page: next, limit: 20 })
      if (r.success) { setPosts(prev => [...prev, ...r.data]); setHasMore(r.pagination.hasNextPage); setPage(next) }
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%),1fr))', gap: 16 }} className="sk-group">
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
        <Link to="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>back to home</Link>
      </div>
    )
  }

  const avatarColor = hashColor(profile.fullName)
  const firstName = profile.fullName.split(' ')[0]
  const lastName = profile.fullName.split(' ').slice(1).join(' ')

  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(40px, 6vw, 60px)', borderBottom: '2px solid var(--ink)', overflow: 'hidden' }}>
        <div className="halftone" style={{ position: 'absolute', inset: 0, color: avatarColor, opacity: 0.14 }} />
        <Star size={70} color="var(--lemon)" style={{ position: 'absolute', top: 24, right: 80, transform: 'rotate(-15deg)', opacity: 0.6 }} />
        <div className="container" style={{ position: 'relative', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto', justifyItems: isMobile ? 'center' : 'start', gap: isMobile ? 16 : 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="avatar avatar-xl" style={{ background: avatarColor, border: '4px solid var(--ink)', boxShadow: '6px 6px 0 0 var(--ink)', overflow: 'hidden', flexShrink: 0 }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt={profile.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              : getInitials(profile.fullName)}
          </div>
          <div>
            <div className="row gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
              <span className={`role ${getRoleClass(profile.role)}`}>{getRoleLabel(profile.role).toUpperCase()}</span>
              {profile.createdAt && <span className="role">JOINED {formatDate(profile.createdAt).toUpperCase()}</span>}
            </div>
            <h1 className="h-display" style={{ fontSize: 'clamp(40px, 7vw, 72px)', margin: 0, lineHeight: 0.9 }}>
              {firstName}<br />
              <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>{lastName}</span>
            </h1>
            {profile.bio && (
              <p className="truncate-2" style={{ fontSize: 16, marginTop: 10, color: 'var(--ink-2)', maxWidth: 500 }}>{profile.bio}</p>
            )}
            <div className="row gap-3" style={{ marginTop: 16, flexWrap: 'wrap' }}>
              <div className="stat" style={{ padding: '8px 14px' }}>
                <div className="stat-num" style={{ fontSize: 24 }}>{profile.postCount || 0}</div>
                <div className="mono xs upper">posts</div>
              </div>
              <div className="stat" style={{ padding: '8px 14px', background: 'var(--lemon)', color: '#0A0A0A' }}>
                <div className="stat-num" style={{ fontSize: 24 }}>{achievements.length}</div>
                <div className="mono xs upper">achievements</div>
              </div>
            </div>
          </div>
          <div className="col gap-2">
            {isOwn
              ? <Link to="/profile/edit" className="btn btn-primary">edit profile</Link>
              : !currentMember
                ? <Link to="/login" className="btn btn-primary">log in to follow</Link>
                : <button
                    className="btn btn-primary"
                    onClick={handleFollow}
                    style={{
                      background: isFollowing ? 'var(--bg-3)' : undefined,
                      color: isFollowing ? 'var(--ink-2)' : undefined,
                      transition: 'background 0.15s, color 0.15s',
                      transform: followPop ? 'scale(1.06)' : 'scale(1)',
                    }}
                  >
                    {isFollowing ? '✓ following' : '+ follow'}
                  </button>
            }
            <button className="btn" onClick={handleShare}>{linkCopied ? 'copied ✓' : 'share ↗'}</button>
          </div>
        </div>
      </section>

      {/* Join banner for unauthenticated visitors */}
      {!currentMember && (
        <div style={{ background: 'var(--lemon)', color: '#0A0A0A', padding: '14px var(--page-px,24px)', borderBottom: '2px solid var(--ink)' }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>join AquaTerra to interact with {profile.fullName} and 850+ members.</span>
            <div className="row gap-2">
              <Link to="/login" className="btn btn-sm" style={{ background: '#0A0A0A', color: 'var(--lemon)' }}>log in</Link>
              <Link to="/register" className="btn btn-sm" style={{ background: 'transparent' }}>apply to join</Link>
            </div>
          </div>
        </div>
      )}

      <div className="aq-wrap" style={{ paddingTop: 'clamp(20px,4vw,28px)', paddingBottom: 80 }}>
        <div className="tabs">
          <button className={'tab ' + (activeTab === 'posts' ? 'active' : '')} onClick={() => setActiveTab('posts')}>
            posts <span className="count">{profile.postCount || 0}</span>
          </button>
          <button className={'tab ' + (activeTab === 'achievements' ? 'active' : '')} onClick={() => setActiveTab('achievements')}>
            achievements <span className="count">{achievements.length}</span>
          </button>
          <button className={'tab ' + (activeTab === 'about' ? 'active' : '')} onClick={() => setActiveTab('about')}>about</button>
        </div>

        <div style={{ paddingTop: 24 }}>
          {activeTab === 'posts' && (
            isLoadingPosts ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="mono xs upper muted">loading...</div></div>
            ) : posts.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 18 }}>
                {posts.map((post, i) => <FeedPostCard key={post.postId} post={post} seed={i} />)}
                {hasMore && (
                  <button onClick={loadMore} className="btn" style={{ gridColumn: '1/-1', justifyContent: 'center' }}>load more</button>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div className="h-display" style={{ fontSize: 28 }}>no posts yet.</div>
                <p className="muted" style={{ marginTop: 8 }}>{profile.fullName} hasn't posted anything yet.</p>
              </div>
            )
          )}

          {activeTab === 'achievements' && (
            achievements.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {achievements.map(a => (
                  <div key={a.uuid} className="card" style={{ padding: 20 }}>
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--lemon)', display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>
                        {a.achievementType === 'leadership' ? '🏆' : a.achievementType === 'academic' ? '📚' : a.achievementType === 'competition' ? '🥇' : '★'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{a.title}</div>
                        {a.description && <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 8px' }}>{a.description}</p>}
                        <div className="row gap-2 flex-wrap">
                          <span className="chip">{a.achievementType?.replace('_', ' ')}</span>
                          <span className="mono xs muted">{new Date(a.achievementDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          {a.proofUrl && <a href={a.proofUrl} target="_blank" rel="noopener noreferrer" className="mono xs" style={{ color: 'var(--mint)' }}>view proof →</a>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div className="h-display" style={{ fontSize: 28 }}>no achievements yet.</div>
              </div>
            )
          )}

          {activeTab === 'about' && (
            <div className="card" style={{ padding: 28, maxWidth: 680 }}>
              <div className="serif" style={{ fontSize: 40, lineHeight: 1, marginBottom: 16 }}>about.</div>
              <p style={{ fontSize: 16, lineHeight: 1.65 }}>{profile.bio || `${profile.fullName} hasn't added a bio yet.`}</p>
              <div style={{ borderTop: '2px dashed var(--line-2)', margin: '20px 0', paddingTop: 16 }}>
                <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
                  {profile.schoolName && <div><span className="mono xs upper muted">school</span><div style={{ fontWeight: 700 }}>{profile.schoolName}</div></div>}
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
