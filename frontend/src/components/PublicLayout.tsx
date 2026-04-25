import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const PublicLayout = () => {
  const { member } = useAuth()

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-forest-500 rounded-full flex items-center justify-center">
                <span className="text-lg text-white font-bold">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">AquaTerra</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/"
                className="text-sm font-medium text-gray-600 hover:text-forest-600"
              >
                Feed
              </Link>
              <Link
                to="/teams"
                className="text-sm font-medium text-gray-600 hover:text-forest-600"
              >
                Teams
              </Link>
            </nav>

            {member ? (
              <Link
                to="/feed"
                className="text-sm font-medium text-forest-600 hover:text-forest-700"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-forest-600 hover:text-forest-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-cream-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            AquaTerra Learning Community - Empowering student-led change
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
