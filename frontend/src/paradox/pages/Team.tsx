// @ts-nocheck
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, stagger, SPRING } from '../lib/motion'
import { supabase } from '../lib/supabase'
import type { TeamMember } from '../lib/types'

// Fallback data used (a) while the DB query is in flight on first paint, and
// (b) if the query fails for any reason — the public page should never go
// blank. Kept in sync with the seed in scripts/team-members-seed.sql.
const FALLBACK_LEADERSHIP: Pick<TeamMember, 'name' | 'role'>[] = [
  { name: 'Kanishka Gogwal', role: 'Event Director' },
  { name: 'Aastha', role: 'Core Team' },
]
const FALLBACK_DEPARTMENTS: Pick<TeamMember, 'name' | 'role'>[] = [
  { name: 'Design', role: 'Yutika' },
  { name: 'Marketing', role: 'Yutika' },
  { name: 'Logistics', role: 'Hiten · Devanshi' },
  { name: 'Finance', role: 'Rachit' },
  { name: 'Sponsorship', role: 'Vaibhav · Zagabo' },
  { name: 'Sports', role: 'Geetika · Raghav' },
  { name: 'After Party', role: 'Vaibhav' },
]

// Cycling bg colors for cards
const CARD_COLORS = ['bg-c2', 'bg-c3', 'bg-c1 text-bg', 'bg-c1 text-bg', 'bg-bg', 'bg-c2', 'bg-c3']
const DEPT_COLORS = ['bg-c2', 'bg-c3', 'bg-c1 text-bg', 'bg-c1 text-bg', 'bg-bg', 'bg-c2', 'bg-c3']

export function TeamPage() {
  // Roster pulled from Supabase. Start with fallback values so the first paint
  // shows real content instead of a flash of empty cards while the query runs.
  const [leadership, setLeadership] = useState<Pick<TeamMember, 'name' | 'role'>[]>(FALLBACK_LEADERSHIP)
  const [departments, setDepartments] = useState<Pick<TeamMember, 'name' | 'role'>[]>(FALLBACK_DEPARTMENTS)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('paradox_team_members')
      .select('kind, name, role, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        // If the query fails or returns nothing, keep the fallback values.
        if (cancelled || error || !data || data.length === 0) return
        setLeadership(
          data
            .filter((r) => r.kind === 'leadership')
            .map((r) => ({ name: r.name, role: r.role })),
        )
        setDepartments(
          data
            .filter((r) => r.kind === 'department')
            .map((r) => ({ name: r.name, role: r.role })),
        )
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-[100dvh] bg-bg" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Header ── */}
      <motion.header
        variants={stagger(0.07)}
        initial="hidden"
        animate="show"
        className="bg-bg px-4 sm:px-8 py-6 sm:py-14 border-b-[1.5px] border-ink"
      >
        <motion.div variants={fadeUp} className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">
          /team
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="font-display text-ink mt-2 leading-[0.92]"
          style={{
            fontSize: 'clamp(34px, 6.6vw, 76px)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          our team.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="font-body text-[15px] opacity-65 mt-2"
          style={{ textWrap: 'pretty' }}
        >
          the people behind paradox 2026.
        </motion.p>
      </motion.header>

      {/* ── Leadership ── */}
      <section className="bg-bg px-4 sm:px-8 lg:px-12 pt-6 pb-7 sm:pt-14 sm:pb-16 border-b-[1.5px] border-ink">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65 mb-5"
          >
            leadership
          </motion.div>

          {/* Grid: 2-col mobile, 3-col sm, 4-col lg */}
          <motion.div
            variants={stagger(0.07)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
          >
            {leadership.map((p, i) => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                whileHover={{ y: -3, boxShadow: '5px 5px 0 var(--ink)', transition: SPRING }}
                whileTap={{ scale: 0.97 }}
                className={`${CARD_COLORS[i % CARD_COLORS.length]} rounded-2xl border-[1.5px] border-ink p-4 min-h-[120px] flex flex-col gap-3`}
                style={{
                  boxShadow: '3px 3px 0 var(--ink)',
                  transitionProperty: 'transform, box-shadow',
                }}
              >
                <div className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">lead</div>
                <div>
                  <div
                    className="font-display leading-tight"
                    style={{
                      fontSize: 'clamp(17px, 2.4vw, 22px)',
                      letterSpacing: '-0.025em',
                      textWrap: 'balance',
                    }}
                  >
                    {p.name}
                  </div>
                  <div className="font-mono uppercase tracking-[0.1em] opacity-65 mt-1.5 text-[10px] sm:text-[11px]">
                    {p.role}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Departments ── */}
      <section className="bg-ink text-bg px-4 sm:px-8 lg:px-12 pt-6 pb-7 sm:pt-14 sm:pb-16">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65 mb-2"
          >
            departments
          </motion.div>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="font-body text-[14px] opacity-60 mb-6"
            style={{ textWrap: 'pretty' }}
          >
            the crew that makes it run.
          </motion.p>

          {/* Grid: 2-col mobile, 3-col sm, 4-col lg */}
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
          >
            {departments.map((d, i) => (
              <motion.div
                key={d.name}
                variants={fadeUp}
                whileHover={{ y: -3, boxShadow: '5px 5px 0 var(--ink)', transition: SPRING }}
                whileTap={{ scale: 0.97 }}
                className={`${DEPT_COLORS[i % DEPT_COLORS.length]} rounded-2xl border-[1.5px] border-ink p-4 min-h-[120px]`}
                style={{
                  boxShadow: '3px 3px 0 var(--ink)',
                  transitionProperty: 'transform, box-shadow',
                }}
              >
                <div className="font-mono uppercase tracking-[0.1em] opacity-65 mb-2 text-[11px]">
                  {d.name}
                </div>
                <div
                  className="font-display leading-tight"
                  style={{
                    fontSize: 'clamp(16px, 2.5vw, 22px)',
                    letterSpacing: '-0.025em',
                    textWrap: 'balance',
                  }}
                >
                  {d.role}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Join CTA ── */}
      <motion.section
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="bg-c1 text-bg px-4 sm:px-8 py-6 sm:py-14 border-t-[1.5px] border-ink"
      >
        <motion.div variants={fadeUp} className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-75 mb-2">
          [ volunteer ]
        </motion.div>
        <motion.h2
          variants={fadeUp}
          className="font-display text-bg leading-[0.92]"
          style={{
            fontSize: 'clamp(34px, 6.6vw, 76px)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          want in?
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="font-body text-[15px] opacity-80 mt-3 max-w-sm"
          style={{ textWrap: 'pretty' }}
        >
          Volunteer at Paradox 2026 — reach us on Instagram.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-6">
          <motion.a
            href="https://instagram.com/ngo.aquaterra"
            target="_blank"
            rel="noreferrer"
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -2, transition: SPRING }}
            transition={SPRING}
            className="rounded-full border-[1.5px] border-bg px-5 font-body font-semibold bg-bg text-ink inline-flex items-center gap-2"
            style={{
              minHeight: '48px',
              boxShadow: '4px 4px 0 var(--ink)',
              transitionProperty: 'transform, box-shadow',
            }}
          >
            @ngo.aquaterra →
          </motion.a>
        </motion.div>
      </motion.section>
    </div>
  )
}
