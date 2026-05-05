import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AQNav from './AQNav'

const DashboardLayout = () => {
  const location = useLocation()

  const navItems = [
    { to: '/feed', label: 'Feed', icon: '⌂' },
    { to: '/teams', label: 'Teams', icon: '⊞' },
    { to: '/search', label: 'Search', icon: '⌕' },
    { to: '/profile/me', label: 'Profile', icon: '◯' },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AQNav />

      {/* Main Content */}
      <main style={{ paddingBottom: 64 }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="aq-bottom-nav">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`aq-bottom-nav-item ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default DashboardLayout
