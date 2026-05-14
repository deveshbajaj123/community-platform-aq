import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { hasLeaderAccess } from '../lib/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireActive?: boolean
  requireDirector?: boolean
  requireSuperAdmin?: boolean
}

const ProtectedRoute = ({
  children,
  requireActive = false,
  requireDirector = false,
  requireSuperAdmin = false
}: ProtectedRouteProps) => {
  const { member, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated || !member) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if profile is incomplete (needs registration step)
  if (!member.class_grade || !member.join_reason) {
    if (location.pathname !== '/register') {
      return <Navigate to="/register" replace />
    }
  }

  // Check status for active requirement
  if (requireActive) {
    if (member.status === 'pending_approval') {
      return <Navigate to="/pending" replace />
    }
    if (member.status === 'rejected') {
      return <Navigate to="/rejected" replace />
    }
    if (member.status !== 'active') {
      return <Navigate to="/login" replace />
    }
  }

  // Check director role
  if (requireDirector && !hasLeaderAccess(member.role)) {
    return <Navigate to="/feed" replace />
  }

  // Check super admin role
  if (requireSuperAdmin) {
    if (member.role !== 'super_admin') {
      return <Navigate to="/director" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
