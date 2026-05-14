import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'

import { HomePage } from './pages/Home'
import { EventsPage } from './pages/Events'
import { EventDetailPage } from './pages/EventDetail'
import { RegisterPage } from './pages/Register'
import { TicketPage } from './pages/Ticket'
import { UpdatesPage } from './pages/Updates'
import { SponsorPage } from './pages/Sponsor'
import { AfterPartyPage } from './pages/AfterParty'
import { TeamPage } from './pages/Team'
import { ScoresPage } from './pages/Scores'
import { LegacyPage } from './pages/Legacy'
import { StoryPage } from './pages/Story'
import { ContactPage } from './pages/Contact'
import { VolunteerPage } from './pages/Volunteer'
import { BlogPage } from './pages/Blog'
import { BlogDetailPage } from './pages/BlogDetail'
import { WinnersPage } from './pages/Winners'
import { AdminLoginPage } from './pages/AdminLogin'
import { AdminPage } from './pages/Admin'
import { NotFoundPage } from './pages/NotFound'

import './paradox.css'

function PageWrap({ children, withFooter = true }: { children: React.ReactNode; withFooter?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {children}
      {withFooter && <Footer />}
    </motion.div>
  )
}

function ParadoxScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function ParadoxRoutes() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/paradox/admin')

  return (
    <>
      <ParadoxScrollToTop />
      {!isAdmin && <Nav />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route index                       element={<PageWrap><HomePage /></PageWrap>} />
          <Route path="events"               element={<PageWrap><EventsPage /></PageWrap>} />
          <Route path="events/:slug"         element={<PageWrap><EventDetailPage /></PageWrap>} />
          <Route path="register"             element={<PageWrap><RegisterPage /></PageWrap>} />
          <Route path="ticket/:token"        element={<PageWrap withFooter={false}><TicketPage /></PageWrap>} />
          <Route path="updates"              element={<PageWrap><UpdatesPage /></PageWrap>} />
          <Route path="sponsor"              element={<PageWrap><SponsorPage /></PageWrap>} />
          <Route path="afterparty"           element={<PageWrap><AfterPartyPage /></PageWrap>} />
          <Route path="team"                 element={<PageWrap><TeamPage /></PageWrap>} />
          <Route path="scores"               element={<PageWrap><ScoresPage /></PageWrap>} />
          <Route path="legacy"               element={<PageWrap><LegacyPage /></PageWrap>} />
          <Route path="story"                element={<PageWrap><StoryPage /></PageWrap>} />
          <Route path="contact"              element={<PageWrap><ContactPage /></PageWrap>} />
          <Route path="volunteer"            element={<PageWrap><VolunteerPage /></PageWrap>} />
          <Route path="blog"                 element={<PageWrap><BlogPage /></PageWrap>} />
          <Route path="blog/:slug"           element={<PageWrap><BlogDetailPage /></PageWrap>} />
          <Route path="winners"              element={<PageWrap><WinnersPage /></PageWrap>} />
          <Route path="admin/login"          element={<PageWrap withFooter={false}><AdminLoginPage /></PageWrap>} />
          <Route path="admin"                element={<PageWrap withFooter={false}><AdminPage /></PageWrap>} />
          <Route path="*"                    element={<PageWrap withFooter={false}><NotFoundPage /></PageWrap>} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default function ParadoxRoot() {
  return (
    <div className="paradox-root">
      <AuthProvider>
        <ToastProvider>
          <ParadoxRoutes />
        </ToastProvider>
      </AuthProvider>
    </div>
  )
}
