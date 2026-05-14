// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Winner } from '../lib/types'
import { fadeUp, stagger, scaleIn, SPRING } from '../lib/motion'

// Per-rank styles:
// 1st = c1 red, text bg (cream)
// 2nd = c3 purple, text ink
// 3rd = bg cream, text ink
const RANK_STYLE: Record<number, { bg: string; textCls: string; shadow: string; badgeCls: string }> = {
  1: { bg: 'var(--c1)',  textCls: 'text-bg',  shadow: '4px 4px 0 var(--ink)', badgeCls: 'text-bg' },
  2: { bg: 'var(--c3)',  textCls: 'text-ink', shadow: '4px 4px 0 var(--ink)', badgeCls: 'text-ink' },
  3: { bg: 'var(--bg)',  textCls: 'text-ink', shadow: '4px 4px 0 var(--ink)', badgeCls: 'text-ink' },
}
const RANK_LABEL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' }

// Rank badge font sizes: 1st largest, 3rd smallest
const RANK_BADGE_SIZE: Record<number, string> = {
  1: 'clamp(64px, 14vw, 108px)',
  2: 'clamp(52px, 11vw, 88px)',
  3: 'clamp(44px, 9vw, 72px)',
}

// Winner name font size scales with rank
const RANK_NAME_SIZE: Record<number, string> = {
  1: 'clamp(18px, 2.5vw, 24px)',
  2: 'clamp(16px, 2.2vw, 22px)',
  3: 'clamp(15px, 2vw, 20px)',
}

const podiumVariants = {
  first: {
    hidden: { opacity: 0, scale: 0.75, rotate: -3 },
    show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 22, delay: 0 } },
  },
  second: {
    hidden: { opacity: 0, scale: 0.78, rotate: 2 },
    show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: 0.1 } },
  },
  third: {
    hidden: { opacity: 0, scale: 0.78, rotate: -2 },
    show: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: 0.2 } },
  },
}

function WinnerCard({
  w,
  rank,
  variant,
}: {
  w?: Winner
  rank: number
  variant: 'first' | 'second' | 'third'
}) {
  const style = RANK_STYLE[rank] ?? RANK_STYLE[3]
  const badgeSize = RANK_BADGE_SIZE[rank] ?? RANK_BADGE_SIZE[3]
  const nameSize = RANK_NAME_SIZE[rank] ?? RANK_NAME_SIZE[3]
  const minH = rank === 1 ? '160px' : rank === 2 ? '140px' : '120px'

  if (!w) {
    return (
      <motion.div
        variants={podiumVariants[variant]}
        whileHover={{ y: -4, transition: SPRING }}
        className={`rounded-2xl border-[1.5px] border-ink p-4 relative overflow-hidden flex flex-col justify-end`}
        style={{
          backgroundColor: style.bg,
          boxShadow: style.shadow,
          minHeight: minH,
          transitionProperty: 'transform, box-shadow',
        }}
      >
        {/* Rank badge background number */}
        <div
          className={`absolute -top-3 -left-2 font-display opacity-20 leading-none select-none ${style.badgeCls}`}
          style={{ fontSize: badgeSize, letterSpacing: '-0.025em' }}
          aria-hidden
        >
          {RANK_LABEL[rank]}
        </div>
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-40 relative z-10">tba</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={podiumVariants[variant]}
      whileHover={{ y: -4, transition: SPRING }}
      className={`${style.textCls} rounded-2xl border-[1.5px] border-ink p-4 relative overflow-hidden cursor-default`}
      style={{
        backgroundColor: style.bg,
        boxShadow: style.shadow,
        minHeight: minH,
        transitionProperty: 'transform, box-shadow',
      }}
    >
      {/* Rank badge — huge semi-transparent number in corner */}
      <div
        className={`absolute -top-3 -left-2 font-display opacity-15 leading-none select-none ${style.badgeCls}`}
        style={{ fontSize: badgeSize, letterSpacing: '-0.025em' }}
        aria-hidden
      >
        {RANK_LABEL[rank]}
      </div>

      <div className="relative z-10 pt-6">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65 mb-1">
          {RANK_LABEL[rank]} place
        </div>

        {/* Avatar + name */}
        <div className="flex items-start gap-2 min-w-0">
          {w.photo_url && (
            <img
              src={w.photo_url}
              alt={w.winner_name}
              className="w-7 h-7 shrink-0 rounded-full object-cover border border-ink mt-0.5"
            />
          )}
          <div
            className="font-display leading-tight line-clamp-2"
            style={{
              fontSize: nameSize,
              letterSpacing: '-0.025em',
              textWrap: 'balance',
            }}
          >
            {w.winner_name}
          </div>
        </div>

        {w.school && (
          <div className="font-mono text-[11px] tracking-[0.04em] opacity-65 mt-1 truncate">
            {w.school}
          </div>
        )}
        {w.prize && (
          <div
            className="font-mono text-[11px] mt-2 leading-snug line-clamp-2 opacity-80 tabular-nums"
            style={{ textWrap: 'pretty' }}
          >
            {w.prize}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('paradox_winners')
      .select('*')
      .eq('published', true)
      .order('event_name')
      .order('rank')
      .then(({ data }) => {
        setWinners((data as Winner[]) ?? [])
        setLoading(false)
      })
  }, [])

  const grouped = useMemo(() => {
    const map = new Map<string, Winner[]>()
    for (const w of winners) {
      const arr = map.get(w.event_name) ?? []
      arr.push(w)
      map.set(w.event_name, arr)
    }
    return Array.from(map.entries())
  }, [winners])

  return (
    <div className="min-h-[100dvh] bg-bg text-ink" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Hero ── */}
      <motion.section
        variants={stagger(0.07)}
        initial="hidden"
        animate="show"
        className="bg-c2 text-ink px-4 sm:px-8 py-6 sm:py-14 border-b-[1.5px] border-ink"
      >
        <motion.div variants={fadeUp} className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">
          /winners
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="font-display text-ink mt-2 leading-[0.9]"
          style={{
            fontSize: 'clamp(34px, 6.6vw, 76px)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          winners.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="font-body text-[15px] opacity-70 mt-2"
          style={{ textWrap: 'pretty' }}
        >
          the champions of paradox 2026.
        </motion.p>
      </motion.section>

      {/* ── Winners content ── */}
      {loading ? (
        <div className="px-4 sm:px-8 lg:px-12 max-w-[1280px] mx-auto py-6 sm:py-8 space-y-5 sm:space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="animate-pulse bg-ink/8 rounded-2xl h-8 w-1/2" />
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="animate-pulse bg-ink/8 rounded-2xl h-36" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-24 px-5">
          <h2
            className="font-display opacity-15 leading-[0.95]"
            style={{
              fontSize: 'clamp(34px, 6.6vw, 76px)',
              letterSpacing: '-0.025em',
              textWrap: 'balance',
            }}
          >
            no winners yet.
          </h2>
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-40 mt-4">
            winners will be announced after each event.
          </p>
        </div>
      ) : (
        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="divide-y-[1.5px] divide-ink"
        >
          {grouped.map(([eventName, ws], gi) => {
            const first = ws.find((w) => w.rank === 1)
            const second = ws.find((w) => w.rank === 2)
            const third = ws.find((w) => w.rank === 3)
            const sectionBg = gi % 2 === 0 ? 'bg-bg' : 'bg-ink'
            const sectionText = gi % 2 === 0 ? 'text-ink' : 'text-bg'

            return (
              <motion.section
                key={eventName}
                variants={scaleIn}
                className={`${sectionBg} ${sectionText} px-4 sm:px-8 py-6 sm:py-14`}
              >
                <div className="max-w-[1280px] mx-auto">
                  <motion.div
                    variants={fadeUp}
                    className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65 mb-1"
                  >
                    event
                  </motion.div>
                  <motion.h2
                    variants={fadeUp}
                    className="font-display leading-tight mb-1"
                    style={{
                      fontSize: 'clamp(24px, 4vw, 38px)',
                      letterSpacing: '-0.025em',
                      textWrap: 'balance',
                    }}
                  >
                    {eventName}
                  </motion.h2>
                  <motion.div
                    variants={fadeUp}
                    className="font-mono text-[11px] tracking-[0.12em] uppercase opacity-55 mb-5"
                  >
                    <span className="tabular-nums">{ws.length}</span> winner{ws.length === 1 ? '' : 's'}
                  </motion.div>

                  {/* Podium: silver left, gold center, bronze right */}
                  {/* items-end so taller 1st place card extends upward */}
                  <motion.div
                    variants={stagger(0.0)}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-3 gap-2.5 sm:gap-3 items-end"
                  >
                    {/* 2nd place — slightly lower */}
                    <div className="pt-6">
                      <WinnerCard w={second} rank={2} variant="second" />
                    </div>
                    {/* 1st place — center, tallest */}
                    <div>
                      <WinnerCard w={first} rank={1} variant="first" />
                    </div>
                    {/* 3rd place — lowest */}
                    <div className="pt-12">
                      <WinnerCard w={third} rank={3} variant="third" />
                    </div>
                  </motion.div>
                </div>
              </motion.section>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
