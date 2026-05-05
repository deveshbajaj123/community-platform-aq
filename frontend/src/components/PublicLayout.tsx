import { Outlet } from 'react-router-dom'
import AQNav from './AQNav'
import AQFooter from './AQFooter'

const PublicLayout = () => {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AQNav />
      <Outlet />
      <AQFooter />
    </div>
  )
}

export default PublicLayout
