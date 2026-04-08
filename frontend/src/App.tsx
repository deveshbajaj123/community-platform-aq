import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import HomeRoute from './auth/HomeRoute'

// Layouts
import PublicLayout from './components/PublicLayout'
import DashboardLayout from './components/DashboardLayout'

// Public Pages
import PublicProfilePage from './profile/PublicProfilePage'
import LoginPage from './auth/LoginPage'
import RegisterPage from './auth/RegisterPage'
import PendingApprovalPage from './auth/PendingApprovalPage'
import RejectedPage from './auth/RejectedPage'

// Protected Pages
import FeedPage from './feed/FeedPage'
import ProfilePage from './profile/ProfilePage'
import EditProfilePage from './profile/EditProfilePage'

// Public Entity Pages
import TeamsPage from './teams/TeamsPage'
import TeamDetailPage from './teams/TeamDetailPage'
import SearchPage from './search/SearchPage'

// Director Pages
import DirectorDashboard from './director/DirectorDashboard'
import AccountApprovals from './director/AccountApprovals'
import PostModeration from './director/PostModeration'
import MemberDirectory from './director/MemberDirectory'
import CategoryManagement from './director/CategoryManagement'
import DirectorManagement from './director/DirectorManagement'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/member/:uuid" element={<PublicProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending" element={<PendingApprovalPage />} />
            <Route path="/rejected" element={<RejectedPage />} />
          </Route>

          {/* Protected Routes - Active Members */}
          <Route
            path="/feed"
            element={
              <ProtectedRoute requireActive>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<FeedPage />} />
          </Route>

          <Route
            path="/profile"
            element={
              <ProtectedRoute requireActive>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/profile/me" replace />} />
            <Route path="me" element={<ProfilePage isOwn />} />
            <Route path="edit" element={<EditProfilePage />} />
            <Route path=":uuid" element={<ProfilePage />} />
          </Route>

          {/* Authenticated Teams Routes */}
          <Route
            path="/teams"
            element={
              <ProtectedRoute requireActive>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeamsPage />} />
            <Route path=":uuid" element={<TeamDetailPage />} />
          </Route>

          {/* Search Route */}
          <Route
            path="/search"
            element={
              <ProtectedRoute requireActive>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SearchPage />} />
          </Route>

          {/* Director Routes - Returns 404 for non-directors */}
          <Route
            path="/director"
            element={
              <ProtectedRoute requireDirector>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DirectorDashboard />} />
            <Route path="approvals" element={<AccountApprovals />} />
            <Route path="posts" element={<PostModeration />} />
            <Route path="members" element={<MemberDirectory />} />
            <Route path="categories" element={<CategoryManagement />} />
          </Route>

          {/* Super Admin Routes - Returns 404 for non-super-admins */}
          <Route
            path="/director/directors"
            element={
              <ProtectedRoute requireSuperAdmin>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DirectorManagement />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
