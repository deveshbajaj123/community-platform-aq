// @ts-nocheck
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Event } from '../lib/types'
import { stagger, fadeUp, SPRING, MotionLink } from '../lib/motion'

const CATEGORIES = ['All', 'Sports', 'Business', 'Creative', 'Cultural'] as const
type Category = (typeof CATEGORIES)[number]

// ── Card colour palette: ec-0 … ec-3 ────────────────────────────────────────
const CARD_STYLES = [
  { background: 'var(--c1)', color: 'var(--bg)' },   // ec-0 red
  { background: 'var(--c2)', color: 'var(--ink)' },   // ec-1 yellow
  { background: 'var(--c3)', color: 'var(--ink)' },   // ec-2 purple
  { background: 'var(--bg)', color: 'var(--ink)' },   // ec-3 cream
] as const

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [countMap, setCountMap] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase
      .from('paradox_events')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(async ({ data }) => {
        const list = (data ?? []) as Event[]
        setEvents(list)

        // Fetch registration counts for all events in one query
        if (list.length > 0) {
          const { data: counts } = await supabase
            .from('paradox_registrations')
            .select('event_id')
            .in('event_id', list.map((e) => e.id))

          const map: Record<string, number> = {}
          counts?.forEach((r) => {
            map[r.event_id] = (map[r.event_id] ?? 0) + 1
          })
          setCountMap(map)
        }

        setLoading(false)
      })
  }, [])

  const filtered =
    activeCategory === 'All'
      ? events
      : events.filter(
          (e) => (e.category ?? '').toLowerCase() === activeCategory.toLowerCase()
        )

  return (
    <div style={{ position: 'relative', zIndex: 1, background: 'var(--bg)', color: 'var(--ink)', minHeight: '100dvh' }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="px-4 sm:px-8 pt-5 pb-4 border-b-[1.5px] border-ink"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...SPRING, delay: 0.06 }}
          className="kicker"
        >
          paradox 2026 · events
        </motion.p>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.12 }}
          className="font-display text-ink mt-2"
          style={{
            fontSize: 'clamp(34px, 6.6vw, 76px)',
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
            textWrap: 'balance',
          }}
        >
          pick your poison.
        </motion.h1>

        {/* Category filter pills — horizontal scroll on mobile, no wrap */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.2 }}
          className="flex flex-nowrap overflow-x-auto gap-1.5 mt-5 pb-1 -mb-1"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory
            return (
              <motion.button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                whileTap={{ scale: 0.94 }}
                transition={SPRING}
                className="shrink-0 rounded-full border-[1.5px] border-ink px-3.5 font-mono text-[11px] tracking-[0.1em] uppercase"
                style={{
                  minHeight: '40px',
                  background: isActive ? 'var(--ink)' : undefined,
                  color: isActive ? 'var(--bg)' : undefined,
                  transitionProperty: 'background-color, color',
                  transitionDuration: '150ms',
                }}
                onMouseEnter={(ev) => {
                  if (!isActive) (ev.currentTarget as HTMLButtonElement).style.background = 'var(--c2)'
                }}
                onMouseLeave={(ev) => {
                  if (!isActive) (ev.currentTarget as HTMLButtonElement).style.background = ''
                }}
              >
                {cat}
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {loading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 sm:p-4"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl bg-ink/8 border-[1.5px] border-ink/20"
              style={{ minHeight: '150px' }}
            />
          ))}
        </div>
      ) : (
        /* ── Event grid ──────────────────────────────────────────────────────── */
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeCategory}
            variants={stagger(0.06)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3 sm:p-4"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {filtered.map((e, i) => {
              const registered = countMap[e.id] ?? 0
              const isFull = !!(e.max_participants && registered >= e.max_participants)
              const spotsLeft = e.max_participants ? e.max_participants - registered : null

              // ec-0 … ec-3 cycling
              const cardStyle = CARD_STYLES[i % 4]

              // rotation only on sm+ screens via inline style trick:
              // we keep rotate=0 on mobile, apply small rotation only at >=640px
              const rotateDeg = (i % 3 - 1) * 0.5

              return (
                <MotionLink
                  key={e.id}
                  to={`/paradox/events/${e.slug}`}
                  variants={fadeUp}
                  layout
                  whileHover={{
                    y: -3,
                    boxShadow: '5px 5px 0 var(--ink)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING}
                  className="rounded-2xl border-[1.5px] border-ink p-4 flex flex-col gap-2.5 ec-rotate"
                  style={{
                    ...cardStyle,
                    minHeight: '150px',
                    // No rotation on mobile; rotation applied at sm via CSS custom property trick
                    ['--card-rotate' as string]: `${rotateDeg}deg`,
                    boxShadow: '3px 3px 0 var(--ink)',
                    position: 'relative',
                    zIndex: 1,
                    transitionProperty: 'transform, box-shadow',
                  }}
                >
                  {/* ec-meta: category + day */}
                  <div className="ec-meta flex justify-between items-center">
                    <span
                      className="font-mono uppercase"
                      style={{ fontSize: '10px', letterSpacing: '0.12em' }}
                    >
                      {e.category || '—'}
                    </span>
                    <span
                      className="font-mono uppercase tabular-nums"
                      style={{ fontSize: '10px', letterSpacing: '0.1em' }}
                    >
                      {e.date || 'tba'}
                    </span>
                  </div>

                  {/* ec-name */}
                  <div
                    className="ec-name font-display"
                    style={{
                      fontSize: 'clamp(19px, 2.4vw, 25px)',
                      lineHeight: 0.95,
                      letterSpacing: '-0.01em',
                      marginTop: 'auto',
                      textWrap: 'balance',
                    }}
                  >
                    {e.name}
                  </div>

                  {/* ec-size: team size */}
                  {e.team_size && (
                    <div
                      className="ec-size font-body"
                      style={{ fontSize: 13, opacity: 0.8 }}
                    >
                      {e.team_size}
                    </div>
                  )}

                  {/* ec-foot: spots only (fee hidden) */}
                  <div className="ec-foot flex items-center justify-end">
                    {isFull ? (
                      <span
                        className="ec-prize font-mono uppercase rounded-full border-[1.5px] border-current px-2 py-0.5"
                        style={{ fontSize: 10, opacity: 0.85 }}
                      >
                        FULL
                      </span>
                    ) : spotsLeft !== null ? (
                      <span
                        className="ec-prize font-mono uppercase tabular-nums"
                        style={{ fontSize: 10, opacity: 0.85 }}
                      >
                        {spotsLeft} left
                      </span>
                    ) : null}
                  </div>
                </MotionLink>
              )
            })}

            {/* Empty state */}
            {filtered.length === 0 && (
              <motion.div
                variants={fadeUp}
                className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 py-20 text-center"
              >
                <p className="font-mono text-[12px] tracking-[0.16em] uppercase opacity-40">
                  no {activeCategory.toLowerCase()} events yet
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Rotation applied only at sm+ screens via a global style injection */}
      <style>{`
        @media (min-width: 640px) {
          .ec-rotate { transform: rotate(var(--card-rotate, 0deg)); }
        }
      `}</style>
    </div>
  )
}
