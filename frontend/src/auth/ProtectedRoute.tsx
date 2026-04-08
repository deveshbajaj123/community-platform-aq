import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Spinner from '../components/Spinner'

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
      <div className="min-h-screen flex items-center justify-center bg-cream-100">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated || !member) {
    return <Navigate to="/login" state={{ from: location }} replace />
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

  // Check director role - return 404-style page for non-directors
  if (requireDirector || requireSuperAdmin) {
    if (member.role !== 'director') {
      // Redirect to feed instead of showing forbidden
      // This hides the existence of director routes
      return <Navigate to="/feed" replace />
    }
  }

  // Check super admin role
  if (requireSuperAdmin) {
    if (!member.isSuperAdmin) {
      // Redirect to director dashboard for non-super-admins
      return <Navigate to="/director" replace />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
