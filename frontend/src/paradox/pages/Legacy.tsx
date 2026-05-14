// @ts-nocheck
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, stagger, scaleIn, slideLeft, SPRING, SPRING_SOFT, MotionLink } from '../lib/motion'

const stats = [
  { num: '750+', label: 'participants', color: 'bg-c1 text-bg', rotate: '-rotate-[1deg]' },
  { num: '22',   label: 'schools',      color: 'bg-c3 text-ink', rotate: 'rotate-[0.5deg]' },
  { num: '10',   label: 'events',       color: 'bg-c2 text-ink', rotate: '-rotate-[0.5deg]' },
  { num: '₹8.9L', label: 'raised for charity', color: 'bg-bg text-ink border-[1.5px] border-ink', rotate: 'rotate-[1deg]' },
]

const highlights = [
  { num: '01', title: 'Business Plan Championship', desc: 'A startup pitch about urban composting walked away with ₹3,000 and a mentorship session.' },
  { num: '02', title: 'Cricket Final', desc: "A last-over thriller went to Super Over. The crowd didn't go home for 40 minutes after the match ended." },
  { num: '03', title: 'Dance Showdown', desc: '14 crews. 3 hours. The Bollywood fusion routine from Loreto is still talked about.' },
  { num: '04', title: 'Photography Walk', desc: "Theme was 'Growth.' The winning shot was a cracked footpath with a weed growing through it." },
  { num: '05', title: '₹42,000 raised', desc: "Every rupee from registrations went to AquaTerra's 2025 summer drive. 60 families received meal kits." },
]

const winners = [
  { event: 'Cricket',       team: 'Team Titans · DPS New Town' },
  { event: 'Football',      team: 'FC Nexus · La Martiniere' },
  { event: 'Debate',        team: 'Aarav Shah · South Point' },
  { event: 'Quiz',          team: 'Team Trivia · Heritage School' },
  { event: 'Painting',      team: 'Diya Sen · Loreto House' },
  { event: 'Dance',         team: 'Fusion Crew · Loreto House' },
  { event: 'Business Plan', team: "GreenRoot · St. Xavier's" },
]

// Timeline of past editions
const editions = [
  { year: '2022', name: 'Paradox 1.0', desc: 'The beginning. 120 students. 4 events. Pure scrappy energy.', color: 'bg-c2 text-ink' },
  { year: '2023', name: 'Paradox 2.0', desc: '300 participants, inter-school collaborations, first charity drive.', color: 'bg-c3 text-ink' },
  { year: '2024', name: 'Paradox 3.0', desc: '750+ participants. 22 schools. ₹8.9L raised. The one that proved it.', color: 'bg-c1 text-bg' },
  { year: '2025', name: 'Paradox 4.0', desc: 'Bigger venues. More events. The benchmark was set.', color: 'bg-c1 text-bg' },
]

export function LegacyPage() {
  return (
    <div className="min-h-[100dvh] bg-bg text-ink" style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Hero ── */}
      <motion.header
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="bg-ink text-bg px-4 sm:px-8 pt-7 pb-6 sm:pt-14 sm:pb-12"
      >
        <Link to="/paradox" className="font-mono text-[11px] tracking-[0.12em] uppercase opacity-60 hover:opacity-100 transition-opacity">
          ← back
        </Link>

        <div className="mt-4">
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">PARADOX LEGACY</span>
        </div>

        <h1
          className="font-display text-bg leading-[0.88] text-balance mt-2"
          style={{ fontSize: 'clamp(34px, 8vw, 72px)', letterSpacing: '-0.025em' }}
        >
          paradox{' '}
          <span style={{ color: 'var(--c1)' }}>3.0</span>
        </h1>

        <p className="font-body text-[15px] opacity-60 mt-4 text-pretty max-w-[440px]">
          Kolkata, June 2025 · AquaTerra's 4th edition · the one that proved it could scale.
        </p>
      </motion.header>

      {/* ── Timeline of editions ── */}
      <section className="bg-bg px-4 sm:px-8 py-6 sm:py-14" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">[ TIMELINE ]</span>
          <h2
            className="font-display text-ink mt-1 leading-tight text-balance"
            style={{ fontSize: 'clamp(28px, 5vw, 48px)', letterSpacing: '-0.025em' }}
          >
            every edition.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5"
        >
          {editions.map((ed) => (
            <motion.div
              key={ed.year}
              variants={scaleIn}
              transition={SPRING}
              whileHover={{ y: -3 }}
              className={`rounded-2xl border-[1.5px] border-ink p-4 ${ed.color}`}
              style={{ boxShadow: '4px 4px 0 var(--ink)' }}
            >
              <div
                className="font-display tabular-nums leading-[0.95]"
                style={{ fontSize: 'clamp(32px, 5vw, 48px)', letterSpacing: '-0.025em' }}
              >
                {ed.year}
              </div>
              <div className="font-body font-semibold text-[13px] mt-2 leading-snug">{ed.name}</div>
              <p className="font-body text-[11px] opacity-75 mt-1 leading-snug text-pretty">{ed.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── By the numbers ── */}
      <section className="bg-ink text-bg px-4 sm:px-8 py-6 sm:py-14" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">[ PARADOX 3.0 — BY THE NUMBERS ]</span>
        </motion.div>

        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 gap-3 mt-4"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={scaleIn}
              transition={SPRING}
              whileHover={{ rotate: 0, scale: 1.04 }}
              className={`rounded-2xl border-[1.5px] border-ink/20 p-4 ${s.color} ${s.rotate}`}
              style={{ boxShadow: '4px 4px 0 rgba(255,255,255,0.1)' }}
            >
              <div
                className="font-display tabular-nums leading-[0.95]"
                style={{ fontSize: 'clamp(32px, 6vw, 52px)', letterSpacing: '-0.025em' }}
              >
                {s.num}
              </div>
              <div className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.1em] opacity-80 mt-1.5 leading-snug">
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Highlights ── */}
      <section className="bg-bg px-4 sm:px-8 py-6 sm:py-14" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">[ HIGHLIGHTS ]</span>
          <h2
            className="font-display text-ink mt-1 leading-tight text-balance"
            style={{ fontSize: 'clamp(28px, 5vw, 48px)', letterSpacing: '-0.025em' }}
          >
            moments that mattered.
          </h2>
        </motion.div>

        <motion.ul
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-5 space-y-0"
        >
          {highlights.map((h) => (
            <motion.li
              key={h.num}
              variants={slideLeft}
              transition={SPRING}
              className="flex gap-4 py-4 border-b-[1.5px] border-ink/15 last:border-0"
            >
              <span className="font-mono text-[11px] opacity-40 w-7 shrink-0 mt-0.5">{h.num}</span>
              <div>
                <div className="font-body text-[15px] font-semibold leading-snug text-balance text-ink">{h.title}</div>
                <p className="font-body text-[13px] opacity-60 mt-1 text-pretty">{h.desc}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* ── Winners ── */}
      <section className="bg-bg px-4 sm:px-8 pt-2 pb-10 sm:pb-14" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">[ WINNERS ]</span>
          <h2
            className="font-display text-ink mt-1 leading-tight text-balance"
            style={{ fontSize: 'clamp(28px, 5vw, 48px)', letterSpacing: '-0.025em' }}
          >
            who took home the gold.
          </h2>
        </motion.div>

        <motion.ul
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-5"
        >
          {winners.map((w) => (
            <motion.li
              key={w.event}
              variants={fadeUp}
              transition={SPRING}
              className="flex justify-between items-baseline gap-3 py-3 border-b-[1.5px] border-ink"
            >
              <span className="font-display text-[18px] text-ink shrink-0" style={{ letterSpacing: '-0.015em' }}>{w.event}</span>
              <span className="font-body text-[12px] sm:text-[13px] text-ink opacity-70 text-right min-w-0 line-clamp-2">{w.team}</span>
            </motion.li>
          ))}

          {/* Best school overall — highlighted card */}
          <motion.li
            variants={scaleIn}
            transition={SPRING_SOFT}
            className="rounded-2xl border-[1.5px] border-ink bg-c2 text-ink mt-4 px-4 py-3 flex justify-between items-baseline gap-3"
            style={{ boxShadow: '4px 4px 0 var(--ink)' }}
          >
            <span className="font-body font-bold text-[14px] shrink-0">Best School Overall</span>
            <span className="font-body font-bold text-right min-w-0 line-clamp-2 text-[13px] sm:text-base">
              La Martiniere Girls' College
            </span>
          </motion.li>
        </motion.ul>
      </section>

      {/* ── Call forward ── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="bg-ink text-bg px-4 sm:px-8 pt-10 pb-14 sm:pt-14 sm:pb-20"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase opacity-65">[ WHAT'S NEXT ]</span>
        <h2
          className="font-display text-bg leading-[0.9] text-balance mt-2 tabular-nums"
          style={{ fontSize: 'clamp(34px, 7vw, 66px)', letterSpacing: '-0.025em' }}
        >
          paradox 4.0 was even better.
        </h2>
        <p className="font-body text-[15px] opacity-70 mt-3 text-pretty max-w-[440px]">
          And Paradox 2026 is bigger than both. 12 events. 6 days. Register now.
        </p>
        <MotionLink
          to="/paradox/register"
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="mt-6 rounded-full border-[1.5px] border-bg/80 bg-bg text-ink px-6 py-3.5 font-body font-semibold text-[15px] inline-flex items-center gap-2 no-underline"
          style={{ boxShadow: '4px 4px 0 var(--c1)' }}
        >
          Register for 2026 →
        </MotionLink>
      </motion.section>
    </div>
  )
}
