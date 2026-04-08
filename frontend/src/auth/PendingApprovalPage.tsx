import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ClockIcon } from '@heroicons/react/24/outline'
import Button from '../components/Button'

const PendingApprovalPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { member, isAuthenticated, refreshMember, logout } = useAuth()
  const [justRegistered] = useState(() => {
    // Check if user just came from registration
    return location.state?.fromRegistration || !isAuthenticated
  })

  // Periodically check if approved (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      refreshMember()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [refreshMember, isAuthenticated])

  // Redirect if approved
  useEffect(() => {
    if (member?.status === 'active') {
      navigate('/feed', { replace: true })
    } else if (member?.status === 'rejected') {
      navigate('/rejected', { replace: true })
    }
  }, [member, navigate])

  const handleBackToLogin = () => {
    if (isAuthenticated) {
      logout()
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
          <div className="w-20 h-20 bg-orange-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ClockIcon className="w-10 h-10 text-orange-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Application Under Review
          </h1>

          <p className="text-gray-600 mb-6">
            Thanks for applying to join AquaTerra! A director will review your
            application and you'll be notified once it's approved.
          </p>

          <div className="bg-cream-100 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium text-gray-900 mb-1">What happens next?</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>A director reviews your application</li>
              <li>You'll receive access once approved</li>
              <li>This page will auto-refresh when ready</li>
            </ul>
          </div>

          <div className="mt-6 space-y-4">
            {isAuthenticated && (
              <div className="animate-pulse-soft flex items-center justify-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                Checking status...
              </div>
            )}

            <Button
              onClick={handleBackToLogin}
              variant="secondary"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage
