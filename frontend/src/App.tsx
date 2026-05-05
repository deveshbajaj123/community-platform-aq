import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './auth/AuthContext'

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search])
  return null
}
import ProtectedRoute from './auth/ProtectedRoute'
import HomeRoute from './auth/HomeRoute'

// Layouts
import PublicLayout from './components/PublicLayout'
import DashboardLayout from './components/DashboardLayout'

// Public Pages — existing
import PublicProfilePage from './profile/PublicProfilePage'
import LoginPage from './auth/LoginPage'
import RegisterPage from './auth/RegisterPage'
import PendingApprovalPage from './auth/PendingApprovalPage'
import RejectedPage from './auth/RejectedPage'

// Public Pages — new AQ 5.0
import EverythingWeDoPage from './public/EverythingWeDoPage'
import PublicProjectsPage from './public/PublicProjectsPage'
import PublicProjectDetailPage from './public/PublicProjectDetailPage'
import BlogListPage from './public/BlogListPage'
import BlogPostPage from './public/BlogPostPage'
import SupportPage from './public/SupportPage'
import VolunteerHandbookPage from './public/VolunteerHandbookPage'
import VolunteerApplyPage from './public/VolunteerApplyPage'
import VolunteerThankYouPage from './public/VolunteerThankYouPage'
import CollaborationsPage from './public/CollaborationsPage'
import ContactPage from './public/ContactPage'
import AboutPage from './public/AboutPage'
import FAQPage from './public/FAQPage'

// Protected Pages
import FeedPage from './feed/FeedPage'
import ProfilePage from './profile/ProfilePage'
import EditProfilePage from './profile/EditProfilePage'

// Public Entity Pages
import PostPage from './feed/PostPage'
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
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/everything-we-do" element={<EverythingWeDoPage />} />
            <Route path="/projects" element={<PublicProjectsPage />} />
            <Route path="/projects/:slug" element={<PublicProjectDetailPage />} />
            <Route path="/blog" element={<BlogListPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/volunteer" element={<VolunteerHandbookPage />} />
            <Route path="/volunteer/apply" element={<VolunteerApplyPage />} />
            <Route path="/volunteer/thank-you" element={<VolunteerThankYouPage />} />
            <Route path="/collaborations" element={<CollaborationsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/member/:uuid" element={<PublicProfilePage />} />
            <Route path="/post/:uuid" element={<PostPage />} />
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

          {/* Super Admin Routes */}
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

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
