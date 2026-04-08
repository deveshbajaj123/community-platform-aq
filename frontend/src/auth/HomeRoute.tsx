import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import PublicFeedPage from '../feed/PublicFeedPage'
import Spinner from '../components/Spinner'

/**
 * HomeRoute handles conditional routing for the root path ("/"):
 * - Authenticated active users are redirected to /feed
 * - Pending/rejected users are redirected to their respective pages
 * - Unauthenticated users see the public feed
 */
const HomeRoute = () => {
  const { member, isLoading, isAuthenticated } = useAuth()

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  // Redirect authenticated users based on their status
  if (isAuthenticated && member) {
    switch (member.status) {
      case 'active':
        return <Navigate to="/feed" replace />
      case 'pending_approval':
        return <Navigate to="/pending" replace />
      case 'rejected':
        return <Navigate to="/rejected" replace />
      default:
        // For any other status, show public feed
        break
    }
  }

  // Show public feed for unauthenticated users
  return <PublicFeedPage />
}

export default HomeRoute
