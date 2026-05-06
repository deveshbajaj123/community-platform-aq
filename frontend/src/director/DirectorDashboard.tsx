import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import directorService, { DashboardStats } from '../services/directorService'

const DirectorDashboard = () => {
  const { member } = useAuth()
  const isSuperAdmin = member?.role === 'super_admin'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canApproveMembers, setCanApproveMembers] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResult, catsResult] = await Promise.all([
          directorService.getDashboardStats(),
          directorService.getMyCategories()
        ])
        if (statsResult.success) setStats(statsResult.data)
        if (isSuperAdmin) {
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
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.06em' }}>LOADING...</div>
      </div>
    )
  }

  const statCards = [
    canApproveMembers && {
      title: 'Pending Approvals',
      value: stats?.pendingMemberApprovals || 0,
      href: '/director/approvals',
      accent: 'var(--c-events)',
      highlight: true,
    },
    {
      title: 'Posts to Review',
      value: stats?.pendingPostReviews || 0,
      href: '/director/posts',
      accent: 'var(--accent)',
      highlight: true,
    },
    {
      title: 'Active Members',
      value: stats?.totalActiveMembers || 0,
      href: '/director/members',
      accent: 'var(--c-labs)',
      highlight: false,
    },
    {
      title: 'Published Posts',
      value: stats?.totalPublishedPosts || 0,
      href: '/feed',
      accent: 'var(--txt-3)',
      highlight: false,
    },
  ].filter(Boolean) as { title: string; value: number; href: string; accent: string; highlight: boolean }[]

  const quickLinks = [
    canApproveMembers && {
      to: '/director/approvals',
      label: 'Review Member Applications',
      sub: `${stats?.pendingMemberApprovals || 0} pending`,
      accent: 'var(--c-events)',
    },
    {
      to: '/director/posts',
      label: 'Moderate Posts',
      sub: `${stats?.pendingPostReviews || 0} awaiting review`,
      accent: 'var(--accent)',
    },
    {
      to: '/director/members',
      label: 'Member Directory',
      sub: `${stats?.totalActiveMembers || 0} active members`,
      accent: 'var(--c-labs)',
    },
    {
      to: '/director/categories',
      label: 'Category Management',
      sub: isSuperAdmin ? 'Assign directors to categories' : 'View category assignments',
      accent: 'var(--c-content)',
    },
    isSuperAdmin && {
      to: '/director/directors',
      label: 'Manage Directors',
      sub: 'Super Admin only',
      accent: '#e05c5c',
    },
  ].filter(Boolean) as { to: string; label: string; sub: string; accent: string }[]

  return (
    <div className="aq-page">
      <div className="dir-wrap">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow"><span className="eyebrow-dot" />Admin</div>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(26px,4vw,40px)', letterSpacing: '-0.05em', marginBottom: 4 }}>
            Director Dashboard
          </h1>
          <p style={{ color: 'var(--txt-3)', fontSize: 13.5, letterSpacing: '-0.01em' }}>Manage approvals, members and moderation.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 26 }}>
          {statCards.map(card => (
            <Link key={card.href} to={card.href} style={{ textDecoration: 'none' }}>
              <div className="dir-stat">
                <div className="dir-n" style={{ color: card.highlight && card.value > 0 ? card.accent : 'var(--txt)' }}>{card.value}</div>
                <div className="dir-l">{card.title}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="dir-table">
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em' }}>Quick Actions</span>
          </div>
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="dir-row" style={{ textDecoration: 'none' }}>
              <div style={{ width: 3, height: 28, background: link.accent, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.02em' }}>{link.label}</div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 10.5, color: 'var(--txt-4)', marginTop: 1 }}>{link.sub}</div>
              </div>
              <span style={{ color: 'var(--txt-4)' }}>→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DirectorDashboard
