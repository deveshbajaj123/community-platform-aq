import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  HomeIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import Avatar from './Avatar'

const DashboardLayout = () => {
  const { member, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/feed', label: 'Feed', icon: HomeIcon },
    { path: '/teams', label: 'Teams', icon: UserGroupIcon },
    { path: '/search', label: 'Search', icon: MagnifyingGlassIcon },
    { path: '/profile/me', label: 'Profile', icon: UserCircleIcon },
  ]

  // Add director tab if user is a director
  if (member?.role === 'director') {
    navItems.push({ path: '/director', label: 'Director', icon: ShieldCheckIcon })
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-cream-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/feed" className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-forest-500 rounded-full flex items-center justify-center">
                <span className="text-base text-white font-bold">A</span>
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">AquaTerra</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-forest-50 text-forest-600'
                      : 'text-gray-600 hover:bg-cream-200'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-2" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <Avatar
                src={member?.avatarUrl}
                name={member?.fullName || 'User'}
                size="sm"
              />
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-cream-200 px-4 py-2 z-40">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                location.pathname.startsWith(item.path)
                  ? 'text-forest-600'
                  : 'text-gray-500'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  )
}

export default DashboardLayout
