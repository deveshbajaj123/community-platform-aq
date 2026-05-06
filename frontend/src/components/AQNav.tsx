import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/* SVG icon helpers — inline so no extra deps */
const IconFeed = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
)
const IconStar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
  </svg>
)
const IconCollab = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconHeart = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const IconTeams = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)

const MEMBER_LINKS = [
  { label: 'Feed',   path: '/feed',   IconEl: IconFeed },
  { label: 'Teams',  path: '/teams',  IconEl: IconTeams },
  { label: 'Search', path: '/search', IconEl: IconSearch },
]

const PUBLIC_LINKS = [
  { label: 'Feed',             path: '/',                 IconEl: IconFeed },
  { label: 'Everything We Do', path: '/everything-we-do', IconEl: IconStar },
  { label: 'Collaborations',   path: '/collaborations',   IconEl: IconCollab },
  { label: 'Support AQ',       path: '/support',          IconEl: IconHeart },
]

const EXPLORE_ITEMS = [
  { label: 'Everything We Do', sub: 'Departments & impact', path: '/everything-we-do', emoji: '✦', bg: 'rgba(109,53,181,0.08)' },
  { label: 'Collaborations',   sub: 'Partner with us',     path: '/collaborations',   emoji: '⇌', bg: 'rgba(109,53,181,0.08)' },
  { label: 'Support AQ',       sub: 'Donate & volunteer',  path: '/support',          emoji: '♥', bg: 'var(--accent-bg)' },
  { label: 'FAQ',              sub: 'Common questions',    path: '/faq',              emoji: '?', bg: 'rgba(15,102,120,0.08)' },
]

export default function AQNav() {
  const { member, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [pill, setPill] = useState(false)
  const [progress, setProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const exploreRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('aq-theme') as 'light' | 'dark' | null
    const t = saved || 'light'
    applyTheme(t)
    setTheme(t)
  }, [])

  const applyTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t)
    const meta = document.getElementById('aq-theme-color') as HTMLMetaElement | null
    if (meta) meta.content = t === 'light' ? '#f5f2ec' : '#0c0c0a'
  }

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
    localStorage.setItem('aq-theme', next)
  }

  useEffect(() => {
    const onScroll = () => {
      setPill(window.scrollY > 80)
      const h = document.documentElement.scrollHeight - window.innerHeight
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false); setAvatarOpen(false); setExploreOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!exploreOpen && !avatarOpen) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Element
      if (exploreOpen && exploreRef.current && !exploreRef.current.contains(t)) setExploreOpen(false)
      if (avatarOpen && avatarRef.current && !avatarRef.current.contains(t)) setAvatarOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exploreOpen, avatarOpen])

  const isActive = (path: string) => {
    if (path === '/' || path === '/feed') return location.pathname === '/' || location.pathname === '/feed'
    return location.pathname.startsWith(path)
  }

  const initials = member ? (member.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : ''
  const links: { label: string; path: string; IconEl: React.FC }[] = isAuthenticated ? MEMBER_LINKS : PUBLIC_LINKS

  return (
    <>
      {/* Scroll progress bar — only visible when not pill */}
      <div
        className="aq-scroll-bar"
        style={{ width: `${progress}%`, opacity: pill ? 0 : 1, transition: 'width 0.08s linear, opacity 0.3s' }}
      />

      <nav className={`aq-nav${pill ? ' pill' : ''}`}>
        <div className="aq-nav-inner">
          {/* Wordmark */}
          <Link to={isAuthenticated ? '/feed' : '/'} className="aq-wordmark" style={{ textDecoration: 'none', color: 'var(--txt)', marginRight: pill ? 6 : 0 }}>
            <span className="aq-wdot" />
            <span className="aq-wordmark-text">AquaTerra</span>
          </Link>

          {/* Desktop nav links */}
          <div className="aq-nav-tabs">
            {links.map(l => (
              <Link
                key={l.path}
                to={l.path}
                className={`aq-nav-link${isActive(l.path) ? ' active' : ''}`}
                title={l.label}
              >
                <span className="aq-nav-link-label">{l.label}</span>
                <span className="aq-nav-link-icon" aria-hidden><l.IconEl /></span>
                {isActive(l.path) && <span className="aq-nav-link-dot" />}
              </Link>
            ))}

            {/* Explore dropdown — hidden in pill */}
            <div className="aq-explore-wrap" ref={exploreRef}>
              <button
                className={`aq-explore-btn${exploreOpen ? ' open' : ''}`}
                onClick={() => setExploreOpen(v => !v)}
              >
                Explore
                <svg className="aq-explore-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {exploreOpen && (
                <div className="aq-explore-dd">
                  {EXPLORE_ITEMS.map(item => (
                    <Link key={item.path} to={item.path} className="aq-dd-item" onClick={() => setExploreOpen(false)}>
                      <div className="aq-dd-icon" style={{ background: item.bg }}>{item.emoji}</div>
                      <div>
                        <div className="aq-dd-label">{item.label}</div>
                        <div className="aq-dd-sub">{item.sub}</div>
                      </div>
                    </Link>
                  ))}
                  <hr className="aq-dd-divider" />
                  <Link to="/login" className="aq-dd-item" onClick={() => setExploreOpen(false)}>
                    <div className="aq-dd-icon" style={{ background: 'var(--accent-bg)' }}>🔑</div>
                    <div>
                      <div className="aq-dd-label">Member Login</div>
                      <div className="aq-dd-sub">Access your feed</div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="aq-nav-r">
            {isAuthenticated && member ? (
              <div style={{ position: 'relative' }} ref={avatarRef}>
                <button
                  onClick={() => setAvatarOpen(v => !v)}
                  className="aq-avatar"
                  aria-label="Account menu"
                  style={{
                    width: 32, height: 32, fontSize: 11,
                    background: member.avatar_url ? 'transparent' : 'var(--accent)',
                    border: '2px solid var(--line-2)', cursor: 'pointer', overflow: 'hidden',
                    transition: 'transform 0.12s var(--ease), border-color 0.15s', position: 'relative',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onMouseUp={e => (e.currentTarget.style.transform = '')}
                  onMouseLeave={e => (e.currentTarget.style.transform = '')}
                >
                  <span aria-hidden style={{ position: 'absolute', inset: -4 }} />
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : initials
                  }
                </button>
                {avatarOpen && (
                  <div style={{
                    position: 'absolute', top: 44, right: 0, zIndex: 300,
                    background: 'var(--bg-card)', border: '1.5px solid var(--line)',
                    borderRadius: 'var(--r-lg)', padding: 8, minWidth: 180,
                    boxShadow: 'var(--s3)', animation: 'ddIn 0.16s var(--ease)',
                  }}>
                    {[
                      { label: 'My Profile', to: '/profile/me' },
                      ...(['director', 'super_admin'].includes(member.role)
                        ? [{ label: 'Director Panel', to: '/director' }]
                        : []),
                    ].map(item => (
                      <Link key={item.to} to={item.to} style={{
                        display: 'flex', alignItems: 'center', padding: '10px 14px', minHeight: 40,
                        fontWeight: 600, fontSize: 13, color: 'var(--txt)',
                        borderRadius: 'var(--r-md)', transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >{item.label}</Link>
                    ))}
                    <hr className="aq-hr" style={{ margin: '4px 0' }} />
                    <button onClick={async () => { await logout(); navigate('/') }} style={{
                      display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                      padding: '10px 14px', minHeight: 40, fontWeight: 600, fontSize: 13,
                      color: 'var(--txt-3)', borderRadius: 'var(--r-md)', transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="aq-btn aq-btn-accent aq-btn-sm hide-m aq-nav-join-btn">
                Join →
              </Link>
            )}

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="aq-nav-ghost-btn" aria-label="Toggle theme">
              {theme === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* Hamburger — hidden in pill state via CSS */}
            <button
              className={`aq-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="aq-mobile-drawer">
          {links.map(l => (
            <button key={l.path} className={`aq-mob-link${isActive(l.path) ? ' active' : ''}`} onClick={() => { navigate(l.path); setMenuOpen(false) }}>
              {l.label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))}
          {!isAuthenticated && EXPLORE_ITEMS.filter(i => !PUBLIC_LINKS.find(p => p.path === i.path)).map(item => (
            <button key={item.path} className={`aq-mob-link${isActive(item.path) ? ' active' : ''}`} onClick={() => { navigate(item.path); setMenuOpen(false) }}>
              {item.label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))}
          {isAuthenticated && EXPLORE_ITEMS.map(item => (
            <button key={item.path} className={`aq-mob-link${isActive(item.path) ? ' active' : ''}`} onClick={() => { navigate(item.path); setMenuOpen(false) }}>
              {item.label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          ))}
          {!isAuthenticated
            ? <button className="aq-mob-link" onClick={() => navigate('/login')}>Join / Login →
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            : <button className="aq-mob-link" onClick={async () => { await logout(); navigate('/') }}>Sign out
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
          }
        </div>
      )}
    </>
  )
}
