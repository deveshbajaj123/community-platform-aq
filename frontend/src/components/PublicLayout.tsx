import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AQNav from './AQNav'
import AQFooter from './AQFooter'
import MobileMenuBar from './MobileMenuBar'
import CreatePostModal from '../feed/CreatePostModal'

const PublicLayout = () => {
  const [showCompose, setShowCompose] = useState(false)

  return (
    <div style={{ background: 'var(--bg)' }}>
      <AQNav onCompose={() => setShowCompose(true)} />
      <main id="main-content" tabIndex={-1} style={{ outline: 'none', paddingTop: 'var(--nav-h, 70px)' }}>
        <Outlet />
      </main>
      <AQFooter />
      <MobileMenuBar onCompose={() => setShowCompose(true)} />
      <CreatePostModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onPostCreated={() => setShowCompose(false)}
      />
    </div>
  )
}

export default PublicLayout
