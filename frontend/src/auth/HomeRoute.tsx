import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import HomePage from '../public/HomePage'

const HomeRoute = () => {
  const { member, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (isAuthenticated && member) {
    switch (member.status) {
      case 'active':
        return <HomePage />
      case 'pending_approval':
        return <Navigate to="/pending" replace />
      case 'rejected':
        return <Navigate to="/rejected" replace />
    }
  }

  return <HomePage />
}

export default HomeRoute
