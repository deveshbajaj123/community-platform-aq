import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import directorService, { DashboardStats } from '../services/directorService'
import { Burst } from '../components/v6Shared'
import PostModeration from './PostModeration'
import AccountApprovals from './AccountApprovals'
import MemberDirectory from './MemberDirectory'
import CategoryManagement from './CategoryManagement'
import DirectorManagement from './DirectorManagement'
import TeamManagement from './TeamManagement'
import VolunteerApplications from './VolunteerApplications'

type Tab = 'posts' | 'approvals' | 'members' | 'categories' | 'teams' | 'hods' | 'volunteer_apps'

const DirectorDashboard = () => {
  const { member } = useAuth()
  const isSuperAdmin = member?.role === 'super_admin'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canApproveMembers, setCanApproveMembers] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('posts')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResult, catsResult] = await Promise.all([
          directorService.getDashboardStats(),
          directorService.getMyCategories()
        ])
        if (statsResult.success) setStats(statsResult.data)
        if (isSuperAdmin || member?.role === 'hod' || member?.role === 'director') {
          setCanApproveMembers(true)
        } else if (catsResult.success) {
          const cats = catsResult.data.categories.map((c: any) => c.category)
          setCanApproveMembers(cats.includes('operations'))
        }
      } catch (error) { console.error('Failed to fetch stats:', error) }
      finally { setIsLoading(false) }
    }
    fetchData()
  }, [isSuperAdmin])

  if (isLoading) {
    return (
      <div className="route-enter">
        <div style={{ background: '#0A0A0A', padding: 'clamp(28px,5vw,48px) var(--page-px,24px)', borderBottom: '2px solid var(--mint)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="v6-skeleton" style={{ width: 130, height: 22, marginBottom: 16 }} />
            <div className="v6-skeleton" style={{ width: '38%', height: 50 }} />
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(20px,4vw,28px) var(--page-px,24px) 80px' }}>
          <div className="director-stats-grid sk-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            {[1,2,3,4].map(i => <div key={i} className="v6-skeleton" style={{ height: 80, borderRadius: 16 }} />)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[130, 150, 140, 110].map((w, i) => <div key={i} className="v6-skeleton sk-pill" style={{ width: w, height: 36 }} />)}
          </div>
          <div className="card" style={{ padding: 32 }}>
            <div className="sk-group">
              {[1,2,3,4,5].map(i => <div key={i} className="v6-skeleton" style={{ height: 14, width: `${70 + i * 5}%`, marginBottom: 12 }} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pendingApprovals = stats?.pendingMemberApprovals || 0
  const pendingPosts = stats?.pendingPostReviews || 0
  const activeMembers = stats?.totalActiveMembers || 0
  const publishedPosts = stats?.totalPublishedPosts || 0

  const tabs: { key: Tab; label: string; count?: number; color?: string }[] = [
    ...(canApproveMembers ? [{ key: 'approvals' as Tab, label: 'Approvals', count: pendingApprovals || undefined, color: 'var(--lemon)' }] : []),
    { key: 'posts', label: 'Post Queue', count: pendingPosts || undefined, color: 'var(--pink)' },
    { key: 'members', label: 'Members' },
    { key: 'categories', label: 'Categories' },
    { key: 'teams', label: 'Teams' },
    ...(isSuperAdmin ? [{ key: 'hods' as Tab, label: 'Manage HoDs' }] : []),
    ...(isSuperAdmin ? [{ key: 'volunteer_apps' as Tab, label: 'Vol. Applications' }] : []),
  ]

  return (
    <div className="route-enter">
      {/* Dark header */}
      <section style={{ background: '#0A0A0A', color: '#fff', padding: 'clamp(24px,5vw,40px) var(--page-px,24px)', borderBottom: '2px solid var(--mint)', position: 'relative', overflow: 'hidden' }}>
        <Burst size={140} color="var(--pink)" style={{ position: 'absolute', top: -40, right: 100, opacity: 0.3 }} />
        <div className="container" style={{ position: 'relative' }}>
          <span className="sticker sticker-pink wobble">{isSuperAdmin ? '⚡ SUPER ADMIN' : '★ HOD MODE'}</span>
          <h1 className="h-display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: '12px 0 0', lineHeight: 0.9 }}>
            command <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>desk</span>.
          </h1>
          {isSuperAdmin && (
            <p style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, marginBottom: 0 }}>
              Full platform access · Manage HoDs, teams, roles &amp; approvals
            </p>
          )}
        </div>
      </section>

      <div className="aq-wrap-lg" style={{ paddingTop: 'clamp(20px,4vw,28px)' }}>
        {/* Stat cards — clicking activates the relevant tab */}
        <div className="director-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          {canApproveMembers && (
            <button onClick={() => setActiveTab('approvals')} style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <div className="stat" style={{ background: 'var(--lemon)', color: '#0A0A0A', cursor: 'pointer' }}>
                <div className="mono xs upper" style={{ fontWeight: 700 }}>★ pending approvals</div>
                <div className="stat-num" style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{pendingApprovals}</div>
              </div>
            </button>
          )}
          <button onClick={() => setActiveTab('posts')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <div className="stat" style={{ background: 'var(--pink)', color: '#0A0A0A', cursor: 'pointer' }}>
              <div className="mono xs upper" style={{ fontWeight: 700 }}>posts in queue</div>
              <div className="stat-num" style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{pendingPosts}</div>
            </div>
          </button>
          <button onClick={() => setActiveTab('members')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            <div className="stat" style={{ background: 'var(--mint)', color: '#0A0A0A', cursor: 'pointer' }}>
              <div className="mono xs upper" style={{ fontWeight: 700 }}>active members</div>
              <div className="stat-num" style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{activeMembers}</div>
            </div>
          </button>
          {/* published posts — informational only, no tab action */}
          <div style={{ textAlign: 'left' }}>
            <div className="stat" style={{ background: 'var(--sky)', color: '#0A0A0A' }}>
              <div className="mono xs upper" style={{ fontWeight: 700 }}>published posts</div>
              <div className="stat-num" style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{publishedPosts}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={'tab ' + (activeTab === t.key ? 'active' : '')}
              onClick={() => setActiveTab(t.key)}
              style={{ position: 'relative' }}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="count" style={{ background: t.color || 'var(--mint)', color: '#0A0A0A' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels — render inline, no sub-page navigation */}
      <div className="director-tab-panel" style={{ paddingBottom: 80 }}>
        {activeTab === 'posts' && <PostModeration />}
        {activeTab === 'approvals' && canApproveMembers && <AccountApprovals />}
        {activeTab === 'members' && <MemberDirectory />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'teams' && <TeamManagement />}
        {activeTab === 'hods' && isSuperAdmin && <DirectorManagement />}
        {activeTab === 'volunteer_apps' && isSuperAdmin && <VolunteerApplications />}
      </div>

      <style>{`
        /* Hide the "← back" buttons inside embedded tab panels */
        .director-tab-panel a.btn[href="/director"] { display: none !important; }
        /* Remove route-enter animation on embedded panels (page already animated) */
        .director-tab-panel .route-enter { animation: none !important; }
        /* Mobile: stats grid → 2 columns */
        @media (max-width: 600px) {
          .director-stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  )
}

export default DirectorDashboard
