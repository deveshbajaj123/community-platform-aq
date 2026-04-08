import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UserGroupIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckBadgeIcon,
  TagIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../auth/AuthContext'
import directorService, { DashboardStats } from '../services/directorService'
import Card from '../components/Card'
import Spinner from '../components/Spinner'

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: 'forest' | 'orange' | 'blue' | 'purple'
  highlight?: boolean
}

const StatCard = ({ title, value, icon: Icon, href, color, highlight = false }: StatCardProps) => {
  const colorClasses = {
    forest: 'bg-forest-50 text-forest-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600'
  }

  return (
    <Link to={href}>
      <Card hover className={highlight && value > 0 ? 'ring-2 ring-orange-400' : ''}>
        <Card.Body>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
          {highlight && value > 0 && (
            <p className="text-sm text-orange-600 mt-2 font-medium">
              Requires attention
            </p>
          )}
        </Card.Body>
      </Card>
    </Link>
  )
}

const DirectorDashboard = () => {
  const { member } = useAuth()
  const isSuperAdmin = member?.isSuperAdmin || false

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await directorService.getDashboardStats()
        if (result.success) {
          setStats(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Director Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage member approvals and post moderation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingMemberApprovals || 0}
          icon={UserGroupIcon}
          href="/director/approvals"
          color="orange"
          highlight
        />
        <StatCard
          title="Posts to Review"
          value={stats?.pendingPostReviews || 0}
          icon={DocumentTextIcon}
          href="/director/posts"
          color="forest"
          highlight
        />
        <StatCard
          title="Active Members"
          value={stats?.totalActiveMembers || 0}
          icon={UsersIcon}
          href="/director/members"
          color="blue"
        />
        <StatCard
          title="Published Posts"
          value={stats?.totalPublishedPosts || 0}
          icon={CheckBadgeIcon}
          href="/feed"
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </Card.Header>
        <Card.Body className="space-y-2">
          <Link
            to="/director/approvals"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream-100 transition-colors"
          >
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Review Member Applications</p>
              <p className="text-sm text-gray-500">
                {stats?.pendingMemberApprovals || 0} pending approval{stats?.pendingMemberApprovals !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>

          <Link
            to="/director/posts"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream-100 transition-colors"
          >
            <div className="p-2 bg-forest-100 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-forest-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Moderate Posts</p>
              <p className="text-sm text-gray-500">
                {stats?.pendingPostReviews || 0} post{stats?.pendingPostReviews !== 1 ? 's' : ''} awaiting review
              </p>
            </div>
          </Link>

          <Link
            to="/director/members"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream-100 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Member Directory</p>
              <p className="text-sm text-gray-500">
                View and search all {stats?.totalActiveMembers || 0} active members
              </p>
            </div>
          </Link>

          <Link
            to="/director/categories"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream-100 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <TagIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Category Management</p>
              <p className="text-sm text-gray-500">
                {isSuperAdmin
                  ? 'Assign directors to categories for post moderation'
                  : 'View category assignments'}
              </p>
            </div>
          </Link>

          {isSuperAdmin && (
            <Link
              to="/director/directors"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream-100 transition-colors"
            >
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Directors</p>
                <p className="text-sm text-gray-500">
                  Add or remove directors (Super Admin only)
                </p>
              </div>
            </Link>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default DirectorDashboard
