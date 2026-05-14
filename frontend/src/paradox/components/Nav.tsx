// @ts-nocheck
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING, MotionLink } from '../lib/motion'
import { supabase } from '../lib/supabase'

type Phase = 'pre_event' | 'live' | 'post_event'

const NAV = [
  { href: '/paradox',           label: 'Home',        n: '01', phases: ['pre_event', 'live', 'post_event'] },
  { href: '/paradox/events',     label: 'Events',      n: '02', phases: ['pre_event', 'live', 'post_event'] },
  { href: '/paradox/updates',    label: 'Updates',     n: '03', phases: ['live'] },
  { href: '/paradox/scores',     label: 'Scores',      n: '04', phases: ['live', 'post_event'] },
  { href: '/paradox/sponsor',    label: 'Sponsor',     n: '05', phases: ['pre_event'] },
  { href: '/paradox/afterparty', label: 'After Party', n: '06', phases: ['pre_event', 'live'] },
  { href: '/paradox/team',       label: 'Team',        n: '07', phases: ['pre_event'] },
  { href: '/paradox/blog',       label: 'Blog',        n: '08', phases: ['pre_event', 'live', 'post_event'] },
  { href: '/paradox/legacy',     label: 'Paradox 3.0', n: '09', phases: ['post_event'] },
  { href: '/paradox/contact',    label: 'Contact',     n: '10', phases: ['pre_event', 'live', 'post_event'] },
  { href: '/paradox/winners',    label: 'Winners',     n: '11', phases: ['post_event'] },
]

// Desktop pill — 2 links per side of the logo. Paths must match the
// hrefs declared in NAV above (which are /paradox/* prefixed).
const LEFT_LINKS  = ['/paradox/events', '/paradox/contact']
const RIGHT_LINKS = ['/paradox/afterparty', '/paradox/sponsor']

// Overlay menu hover colors
const HOVER_BG    = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c1)']
const HOVER_COLOR = ['var(--bg)', 'var(--ink)', 'var(--ink)', 'var(--bg)']

// ─── Cursor position state ─────────────────────────────────────────────────
type CursorPos = { left: number; width: number; opacity: number }

// Spring config — snappy, not bouncy
const CURSOR_SPRING = { type: 'spring', stiffness: 600, damping: 42 } as const

// ─── Single tab item inside the pill ──────────────────────────────────────
function NavTab({
  href, label, isActive, setPosition,
}: {
  href: string
  label: string
  isActive: boolean
  setPosition: React.Dispatch<React.SetStateAction<CursorPos>>
}) {
  const ref = useRef<HTMLAnchorElement>(null)

  return (
    <Link
      ref={ref}
      to={href}
      onMouseEnter={() => {
        if (!ref.current) return
        const { width } = ref.current.getBoundingClientRect()
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft })
      }}
      className="relative z-10 block px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] select-none whitespace-nowrap"
      style={{
        // white + mix-blend-difference:
        //   over ink cursor  → 255-18  = 237 ≈ cream (readable ✓)
        //   over cream bg    → 255-251 = 4   ≈ near-black (readable ✓)
        color: 'white',
        mixBlendMode: 'difference' as const,
        fontWeight: isActive ? 700 : 400,
        letterSpacing: isActive ? '0.12em' : '0.1em',
      }}
    >
      {label}
    </Link>
  )
}

// ─── NavTab with optional activeRef forwarding ────────────────────────────
function NavTabWithRef({
  href, label, isActive, setPosition, activeRef,
}: {
  href: string
  label: string
  isActive: boolean
  setPosition: React.Dispatch<React.SetStateAction<CursorPos>>
  activeRef?: React.MutableRefObject<HTMLAnchorElement | null>
}) {
  const ref = useRef<HTMLAnchorElement>(null)

  // sync ref to parent activeRef when this is the active tab
  useEffect(() => {
    if (isActive && activeRef) activeRef.current = ref.current
  })

  return (
    <Link
      ref={ref}
      to={href}
      onMouseEnter={() => {
        if (!ref.current) return
        const { width } = ref.current.getBoundingClientRect()
        setPosition({ width, opacity: 1, left: ref.current.offsetLeft })
      }}
      className="relative z-10 block px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] select-none whitespace-nowrap"
      style={{
        color: 'white',
        mixBlendMode: 'difference' as const,
        fontWeight: isActive ? 700 : 400,
        letterSpacing: isActive ? '0.12em' : '0.1em',
      }}
    >
      {label}
    </Link>
  )
}

// ─── Active pill — always visible, c1 red, slides on route change ──────────
function ActiveCursor({ left, width }: { left: number; width: number }) {
  if (width === 0) return null
  return (
    <motion.div
      layoutId="nav-active-pill"
      animate={{ left, width, opacity: 1 }}
      transition={CURSOR_SPRING}
      className="absolute top-1 bottom-1 z-0 rounded-full pointer-events-none"
      style={{ background: 'var(--c1)' }}
    />
  )
}

// ─── Hover cursor — ink, fades out on mouse-leave ─────────────────────────
function SlidingCursor({ position }: { position: CursorPos }) {
  return (
    <motion.div
      animate={position}
      transition={CURSOR_SPRING}
      className="absolute top-1 bottom-1 z-0 rounded-full pointer-events-none"
      style={{ background: 'var(--ink)' }}
    />
  )
}

// ─── Desktop pill nav ──────────────────────────────────────────────────────
function DesktopPillNav({
  phase, pathname, onMenuOpen,
}: {
  phase: Phase; pathname: string; onMenuOpen: () => void
}) {
  const [position, setPosition]   = useState<CursorPos>({ left: 0, width: 0, opacity: 0 })
  const [activePos, setActivePos] = useState({ left: 0, width: 0 })
  const activeRef = useRef<HTMLAnchorElement | null>(null)

  const leftLinks  = LEFT_LINKS.filter(href => NAV.find(n => n.href === href)?.phases.includes(phase))
  const rightLinks = RIGHT_LINKS.filter(href => NAV.find(n => n.href === href)?.phases.includes(phase))

  // Measure active tab position for the persistent c1 cursor
  useEffect(() => {
    if (!activeRef.current) return
    const { width, left: absLeft } = activeRef.current.getBoundingClientRect()
    const parentLeft = activeRef.current.closest('ul')?.getBoundingClientRect().left ?? 0
    setActivePos({ left: absLeft - parentLeft, width })
  }, [pathname])

  const allLinks = [...leftLinks, ...rightLinks]

  return (
    <div className="hidden md:flex items-center gap-3">

      {/* ── Sliding pill ──────────────────────────────────────────── */}
      <ul
        className="relative flex items-center rounded-full border-[1.5px] border-ink px-1 overflow-visible"
        style={{
          height: 44,
          background: 'color-mix(in oklch, var(--bg) 92%, transparent)',
          backdropFilter: 'blur(8px)',
        }}
        onMouseLeave={() => setPosition(pv => ({ ...pv, opacity: 0 }))}
      >
        {/* Left links */}
        {leftLinks.map(href => {
          const isActive = pathname === href
          return (
            <NavTabWithRef key={href} href={href}
              label={NAV.find(n => n.href === href)!.label}
              isActive={isActive}
              setPosition={setPosition}
              activeRef={isActive ? activeRef : undefined}
            />
          )
        })}

        {/* ── Logo — centered, overflows pill ──────────────── */}
        <li className="relative z-20 mx-2 flex items-center" style={{ pointerEvents: 'none' }}>
          <Link to="/paradox" aria-label="Home" style={{ pointerEvents: 'auto' }}>
            <img
              src="/paradox/paradox-logo.png"
              alt="Paradox"
              style={{
                height: 80,                    // intentionally taller than 44px pill
                width: 'auto',
                transform: 'rotate(-4deg)',
                display: 'block',
                position: 'relative',
                zIndex: 30,
                filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.18))',
              }}
              draggable={false}
            />
          </Link>
        </li>

        {/* Right links */}
        {rightLinks.map(href => {
          const isActive = pathname === href
          return (
            <NavTabWithRef key={href} href={href}
              label={NAV.find(n => n.href === href)!.label}
              isActive={isActive}
              setPosition={setPosition}
              activeRef={isActive ? activeRef : undefined}
            />
          )
        })}

        {/* Active pill — persistent c1 red under current page */}
        <ActiveCursor left={activePos.left} width={activePos.width} />

        {/* Hover pill — ink, fades on mouse-leave */}
        <SlidingCursor position={position} />
      </ul>

      {/* All-pages — hamburger icon; same visual as the mobile button so the
          nav has a single consistent "open menu" affordance on every viewport. */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={SPRING}
        onClick={onMenuOpen}
        className="w-11 h-11 rounded-full flex items-center justify-center border-[1.5px] border-ink transition-[background-color,color]"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        aria-label="Open menu"
      >
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true">
          <rect y="0"    width="16" height="1.5" rx="0.75"/>
          <rect y="4.75" width="12" height="1.5" rx="0.75"/>
          <rect y="9.5"  width="8"  height="1.5" rx="0.75"/>
        </svg>
      </motion.button>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────
export function Nav() {
  const [open, setOpen]   = useState(false)
  const [phase, setPhase] = useState<Phase>('pre_event')
  const { pathname }      = useLocation()

  useEffect(() => {
    supabase.from('paradox_site_settings').select('value').eq('key', 'site_phase').single()
      .then(({ data }) => { if (data?.value) setPhase(data.value as Phase) })
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      <motion.header
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="sticky top-0 z-40 overflow-visible
          md:border-b-[1.5px] md:border-ink"
        style={{
          /* Desktop: frosted bg. Mobile: fully transparent — just logo + button float */
          background: 'transparent',
          position: 'sticky', zIndex: 40,
        }}
      >
        {/* Desktop-only frosted bg layer */}
        <div className="absolute inset-0 hidden md:block pointer-events-none"
          style={{
            background: 'color-mix(in oklch, var(--bg) 88%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        />
        <div className="max-w-[1280px] mx-auto flex items-center h-[72px] overflow-visible px-4 sm:px-8">

          {/* Mobile: logo left */}
          <Link to="/paradox" aria-label="Home" className="md:hidden">
            <img
              src="/paradox/paradox-logo.png" alt="Paradox"
              style={{ height: 80, width: 'auto', transform: 'rotate(-4deg)', display: 'block' }}
              draggable={false}
            />
          </Link>

          {/* Desktop: pill centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <DesktopPillNav phase={phase} pathname={pathname} onMenuOpen={() => setOpen(true)} />
          </div>

          {/* Mobile hamburger right */}
          <motion.button
            whileTap={{ scale: 0.93 }} transition={SPRING}
            onClick={() => setOpen(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center border-[1.5px] border-ink ml-auto md:hidden"
            style={{ background: 'var(--ink)', color: 'var(--bg)' }}
            aria-label="Open menu"
          >
            <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
              <rect y="0"    width="16" height="1.5" rx="0.75"/>
              <rect y="4.75" width="12" height="1.5" rx="0.75"/>
              <rect y="9.5"  width="8"  height="1.5" rx="0.75"/>
            </svg>
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && <NavOverlay current={pathname} phase={phase} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

// ─── Overlay nav link ──────────────────────────────────────────────────────
function OverlayLink({
  href, label, n, isActive, hoverBg, hoverFg, onClose,
}: {
  href: string; label: string; n: string; isActive: boolean;
  hoverBg: string; hoverFg: string; onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={href} onClick={onClose}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-end gap-2 p-3 py-4 rounded-xl border border-bg/10 min-h-[64px]"
      style={{
        background: (isActive || hovered) ? hoverBg : 'transparent',
        color:      (isActive || hovered) ? hoverFg : 'var(--bg)',
        transitionProperty: 'background-color, color',
        transitionDuration: '0.15s',
      }}
    >
      <span className="font-mono text-[9px] tracking-[0.06em] opacity-40 mb-0.5 shrink-0">{n}</span>
      <span className="font-display leading-none flex-1" style={{ fontSize: 'clamp(22px, 5vw, 28px)' }}>
        {label}
      </span>
      {isActive && <span className="font-mono text-[9px] shrink-0 mb-1 opacity-70">●</span>}
    </Link>
  )
}

// ─── Full-screen overlay ───────────────────────────────────────────────────
function NavOverlay({ current, phase, onClose }: { current: string; phase: Phase; onClose: () => void }) {
  const visibleNav = NAV.filter(it => it.phases.includes(phase))

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
      style={{ position: 'fixed', zIndex: 100, background: 'var(--ink)', color: 'var(--bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 border-b border-bg/10 sticky top-0 z-10 h-[72px]"
        style={{ background: 'var(--ink)' }}>
        <img src="/paradox/paradox-logo.png" alt="Paradox"
          style={{ height: 56, width: 'auto', transform: 'rotate(-4deg)', display: 'block' }}
          draggable={false}
        />
        <motion.button
          whileTap={{ scale: 0.9 }} transition={SPRING} onClick={onClose}
          className="w-10 h-10 rounded-full border-[1.5px] border-bg/25 flex items-center justify-center font-mono text-lg"
          style={{ color: 'var(--bg)' }} aria-label="Close menu"
        >✕</motion.button>
      </div>

      {/* Grid of nav links */}
      <div className="flex-1 grid grid-cols-2 px-4 sm:px-8 py-3 gap-2 content-start">
        {visibleNav.map((it, i) => (
          <motion.div key={it.href}
            initial={{ opacity: 0, x: i % 2 === 0 ? -18 : 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, delay: i * 0.025 }}
          >
            <OverlayLink
              href={it.href} label={it.label} n={it.n}
              isActive={current === it.href}
              hoverBg={HOVER_BG[i % 4]} hoverFg={HOVER_COLOR[i % 4]}
              onClose={onClose}
            />
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-8 pb-6 pt-4 border-t border-bg/10 space-y-2.5">
        {phase !== 'post_event' && (
          <MotionLink to="/paradox/register" onClick={onClose}
            whileTap={{ scale: 0.97 }} transition={SPRING}
            className="flex justify-between items-center px-5 py-3.5 rounded-full font-body font-bold text-base border-[1.5px] border-bg/20 min-h-[52px]"
            style={{ background: 'var(--c1)', color: 'var(--bg)', boxShadow: '4px 4px 0 rgba(255,255,255,0.15)' }}
          >
            <span>Register for Paradox →</span>
            <span className="font-mono text-[11px] opacity-75">free</span>
          </MotionLink>
        )}
        <div className="flex justify-between items-center font-mono text-[10px] tracking-[0.08em] uppercase opacity-30 pt-1">
          <span>@ngo.aquaterra</span>
          <span>jun 3–7 · kolkata</span>
          <Link to="/paradox/admin" onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">admin ↗</Link>
        </div>
      </div>
    </motion.div>
  )
}
