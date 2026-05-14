import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AQNav from './AQNav'
import MobileMenuBar from './MobileMenuBar'
import CreatePostModal from '../feed/CreatePostModal'

const DashboardLayout = () => {
  const [showCompose, setShowCompose] = useState(false)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AQNav onCompose={() => setShowCompose(true)} />

      {/* Main content */}
      <main id="main-content" tabIndex={-1} style={{ outline: 'none', paddingTop: 'var(--nav-h, 70px)' }}>
        <Outlet />
      </main>

      {/* Animated bottom tab bar — mobile only */}
      <MobileMenuBar onCompose={() => setShowCompose(true)} />

      {/* Compose modal */}
      <CreatePostModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onPostCreated={() => setShowCompose(false)}
      />
    </div>
  )
}

export default DashboardLayout
