import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { XCircleIcon } from '@heroicons/react/24/outline'
import Button from '../components/Button'

const RejectedPage = () => {
  const navigate = useNavigate()
  const { member, logout, isAuthenticated } = useAuth()

  // Redirect if not authenticated or not rejected
  if (!isAuthenticated || member?.status !== 'rejected') {
    navigate('/login')
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <XCircleIcon className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Application Not Approved
          </h1>

          <p className="text-gray-600 mb-6">
            We're sorry, but your application to join AquaTerra was not approved
            at this time.
          </p>

          {member?.rejectionNote && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Reason:</p>
              <p className="text-sm text-red-700">{member.rejectionNote}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            If you believe this was a mistake or have questions, please contact
            our team for assistance.
          </p>

          <Button
            onClick={handleLogout}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RejectedPage
