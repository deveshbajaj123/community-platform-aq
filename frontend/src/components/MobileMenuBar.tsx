import { useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { hasLeaderAccess } from '../lib/roles'
import {
  Home, Bell, User, Compass, BookOpen, Globe, Plus, Sparkles, Zap
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  Icon: React.ElementType<{ size?: number; strokeWidth?: number }>
  exact?: boolean
}

// ── Items for authenticated members ─────────────────────────────
const AUTH_ITEMS: NavItem[] = [
  { href: '/feed',          label: 'feed',     Icon: Home,    exact: true },
  { href: '/opportunities', label: 'openings', Icon: Zap },
  { href: '/notifications', label: 'alerts', Icon: Bell },
  { href: '/teams',         label: 'teams',  Icon: User },
]

// ── Items for public visitors ────────────────────────────────────
const PUBLIC_ITEMS: NavItem[] = [
  { href: '/',         label: 'home',     Icon: Home,     exact: true },
  { href: '/projects', label: 'projects', Icon: Compass },
  { href: '/teams',    label: 'teams',    Icon: User },
  { href: '/blog',     label: 'blog',     Icon: BookOpen },
  { href: '/about',    label: 'about',    Icon: Globe },
]

// ── Single tab item ──────────────────────────────────────────────
function TabItem({
  item, isActive, onClick,
}: {
  item: NavItem; isActive: boolean; index?: number; onClick: () => void
}) {
  const textRef  = useRef<HTMLSpanElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)

  // Set --lineWidth to the text element's width so the underline matches
  useEffect(() => {
    if (!isActive) return
    const update = () => {
      if (textRef.current && btnRef.current) {
        btnRef.current.style.setProperty('--lineWidth', `${textRef.current.offsetWidth}px`)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [isActive])

  return (
    <button
      ref={btnRef}
      className={'aq-tab-item' + (isActive ? ' active' : '')}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      style={{ '--lineWidth': '0px' } as React.CSSProperties}
    >
      <span className={'aq-tab-icon' + (isActive ? ' active' : '')}>
        <item.Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
      </span>
      <span
        ref={textRef}
        className={'aq-tab-label' + (isActive ? ' active' : '')}
      >
        {item.label}
      </span>
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function MobileMenuBar({ onCompose }: { onCompose?: () => void }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { isAuthenticated, member } = useAuth()

  const isDirector = hasLeaderAccess(member?.role)

  const items = isAuthenticated
    ? isDirector
      ? AUTH_ITEMS.map(item =>
          item.href === '/notifications'
            ? ({ href: '/director', label: 'hod', Icon: Sparkles } as NavItem)
            : item
        )
      : AUTH_ITEMS
    : PUBLIC_ITEMS

  const activeIndex = useMemo(() => {
    const path = location.pathname
    const idx = items.findIndex(item =>
      item.exact ? path === item.href : path.startsWith(item.href)
    )
    return idx === -1 ? 0 : idx
  }, [location.pathname, items])

  const handleClick = (href: string) => navigate(href)

  // Don't show on auth/registration flows
  const hiddenPaths = ['/login', '/register', '/pending', '/rejected', '/volunteer']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  return (
    <>
      <nav className="aq-bottom-bar" role="navigation" aria-label="Mobile navigation">
        {/* Left tabs */}
        {items.slice(0, Math.floor(items.length / 2)).map((item, i) => (
          <TabItem
            key={item.href}
            item={item}
            isActive={i === activeIndex}
            index={i}
            onClick={() => handleClick(item.href)}
          />
        ))}

        {/* Centre FAB — only for authenticated */}
        {isAuthenticated ? (
          <button
            className="aq-tab-fab"
            onClick={onCompose}
            aria-label="New post"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        ) : (
          /* For public: render middle item normally */
          items.length % 2 === 1 && (() => {
            const midIdx = Math.floor(items.length / 2)
            const item = items[midIdx]
            return (
              <TabItem
                key={item.href}
                item={item}
                isActive={midIdx === activeIndex}
                index={midIdx}
                onClick={() => handleClick(item.href)}
              />
            )
          })()
        )}

        {/* Right tabs */}
        {items.slice(Math.ceil(items.length / 2)).map((item, i) => {
          const realIdx = Math.ceil(items.length / 2) + i
          return (
            <TabItem
              key={item.href}
              item={item}
              isActive={realIdx === activeIndex}
              index={realIdx}
              onClick={() => handleClick(item.href)}
            />
          )
        })}
      </nav>

      {/* Bottom safe-area spacer so page content isn't hidden behind the bar */}
      <div className="aq-bottom-bar-spacer" aria-hidden />
    </>
  )
}
