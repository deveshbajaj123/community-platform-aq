// @ts-nocheck
import type { } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, stagger, SPRING, MotionLink } from '../lib/motion'

type TicketTier = {
  label: string
  price: string
  note: string
  bg: string
  color: string
  wide?: boolean
}

const TICKET_TIERS: TicketTier[] = [
  {
    label: 'Phase 1',
    price: '₹550',
    note: 'early bird',
    bg: 'var(--c2)',
    color: 'var(--ink)',
  },
  {
    label: 'Phase 2',
    price: '₹650',
    note: 'regular',
    bg: 'var(--c3)',
    color: 'var(--ink)',
  },
  {
    label: 'At the door',
    price: '₹700',
    note: 'walk-in',
    bg: 'var(--ink)',
    color: 'var(--bg)',
    wide: true,
  },
]

const WHAT_TO_EXPECT = [
  'DJ set + live performances',
  'photo booth & memories',
  'award ceremony for event winners',
  'networking with 200+ participants',
]

function Ticket({ tier }: { tier: TicketTier }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Ticket body */}
      <div
        style={{
          padding: '16px',
          borderRadius: '16px',
          border: '1.5px solid var(--ink)',
          position: 'relative',
          overflow: 'hidden',
          background: tier.bg,
          color: tier.color,
          boxShadow: '3px 3px 0 var(--ink)',
        }}
      >
        {/* Top punch hole */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '-10px',
            width: '20px',
            height: '20px',
            background: 'var(--ink)',
            borderRadius: '50%',
            border: '1.5px solid var(--ink)',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        />
        {/* Bottom punch hole */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '-10px',
            width: '20px',
            height: '20px',
            background: 'var(--ink)',
            borderRadius: '50%',
            border: '1.5px solid var(--ink)',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        />

        <div
          className="font-mono tracking-[0.14em] uppercase"
          style={{ fontSize: '11px', opacity: 0.65 }}
        >
          {tier.label}
        </div>
        {/* Price in Boldonse — smaller clamp */}
        <div
          className="font-display leading-[0.95] mt-2 tabular-nums"
          style={{ fontSize: 'clamp(24px, 3.5vw, 34px)' }}
        >
          {tier.price}
        </div>
        <div
          className="font-mono tracking-[0.12em] uppercase mt-2"
          style={{ fontSize: '10px', opacity: 0.65 }}
        >
          {tier.note}
        </div>
      </div>
    </div>
  )
}

export function AfterPartyPage() {
  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: 'var(--bg)', position: 'relative', zIndex: 1 }}
    >
      {/* ── Hero (ink bg) ── */}
      <motion.header
        variants={stagger(0.07)}
        initial="hidden"
        animate="show"
        className="border-b-[1.5px] border-ink pt-7 pb-6 sm:py-14 px-4 sm:px-8 lg:px-12"
        style={{ background: 'var(--ink)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70"
            style={{ color: 'var(--bg)' }}
          >
            /afterparty
          </motion.div>
          {/* "after party." in Boldonse c1 — clamped so it never overflows on mobile */}
          <motion.h1
            variants={fadeUp}
            className="font-display mt-2 leading-[0.92]"
            style={{
              fontSize: 'clamp(34px, 6vw, 66px)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
              color: 'var(--c1)',
            }}
          >
            after party.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="font-body mt-3 text-[15px]"
            style={{ opacity: 0.7, color: 'var(--bg)', textWrap: 'pretty' } as React.CSSProperties}
          >
            celebrating 5 years of aquaterra.
          </motion.p>

          {/* Detail pills: gap-2 flex-wrap. Tight stagger so 4 pills don't
              drip in over half a second on slow mobile. */}
          <motion.div
            variants={stagger(0.05)}
            className="flex flex-wrap gap-2 mt-6"
          >
            {[
              { icon: '📅', text: 'June 6, 2026' },
              { icon: '🕐', text: '8:00 PM onwards' },
              { icon: '📍', text: 'Venue TBA' },
              { icon: '👗', text: 'Dress code TBA' },
            ].map((item) => (
              <motion.span
                key={item.text}
                variants={fadeUp}
                className="rounded-full border-[1.5px] border-ink px-4 py-2 font-mono tracking-[0.1em] uppercase flex items-center gap-2"
                style={{
                  fontSize: '11px',
                  background: 'var(--c2)',
                  color: 'var(--ink)',
                  boxShadow: '2px 2px 0 rgba(251,245,230,0.25)',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </motion.span>
            ))}
          </motion.div>
        </div>
      </motion.header>

      {/* ── What to expect ── */}
      <motion.section
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="border-b-[1.5px] border-ink py-6 sm:py-14 px-4 sm:px-8 lg:px-12"
        style={{ background: 'var(--c2)', color: 'var(--ink)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70"
          >
            [ what to expect ]
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="font-display mt-2"
            style={{
              fontSize: 'clamp(28px, 5vw, 52px)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            a night to remember.
          </motion.h2>
          {/* Clean bullet-free list with dash prefix */}
          <motion.ul variants={stagger(0.07)} className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 max-w-md">
            {WHAT_TO_EXPECT.map((item) => (
              <motion.li
                key={item}
                variants={fadeUp}
                className="font-body flex items-start gap-3"
                style={{ fontSize: '15px', lineHeight: 1.6, textWrap: 'pretty' } as React.CSSProperties}
              >
                <span
                  className="font-mono text-[13px] mt-0.5 shrink-0"
                  style={{ opacity: 0.5 }}
                >
                  —
                </span>
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.section>

      {/* ── Ticket stack ── */}
      <motion.section
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="border-b-[1.5px] border-ink py-6 sm:py-14 px-4 sm:px-8 lg:px-12"
        style={{ background: 'var(--ink)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-6"
            style={{ color: 'var(--bg)' }}
          >
            [ tickets ]
          </motion.div>

          {/* Full-width on mobile — 2-col on sm+ with "at the door" spanning full */}
          <motion.div
            variants={stagger(0.07)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {TICKET_TIERS.map((tier) => (
              <motion.div
                key={tier.label}
                variants={fadeUp}
                whileHover={{ y: -4, transition: SPRING }}
                className={tier.wide ? 'col-span-1 sm:col-span-2' : ''}
              >
                <Ticket tier={tier} />
              </motion.div>
            ))}
          </motion.div>

          <p className="font-hand text-[20px] text-center mt-4 opacity-75" style={{ transform: 'rotate(-1deg)' }}>see you there 🪩</p>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="py-6 sm:py-14 px-4 sm:px-8 lg:px-12"
        style={{ background: 'var(--bg)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={fadeUp}
            className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-4"
          >
            [ get your spot ]
          </motion.div>

          {/* Full-width CTAs on mobile, row on sm+ */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2 mt-4">
            <MotionLink
              to="/paradox/contact"
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -2, transition: SPRING }}
              transition={SPRING}
              className="rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold inline-flex items-center justify-center gap-2 w-full sm:w-auto"
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                boxShadow: '4px 4px 0 var(--c1)',
              }}
            >
              Register interest →
            </MotionLink>
            <motion.a
              href="mailto:ngo.aquaterra@gmail.com"
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -2, transition: SPRING }}
              transition={SPRING}
              className="rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold inline-flex items-center justify-center w-full sm:w-auto transition-[background-color,color]"
              style={{ background: 'transparent', color: 'var(--ink)' }}
            >
              email us instead
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="font-mono text-[11px] tracking-[0.14em] uppercase mt-4"
            style={{ opacity: 0.45 }}
          >
            limited spots · first come first served
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}
