import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion'
import { Star, I, Marquee } from '../components/v6Shared'
import { useIsMobile } from '../hooks/useMobile'

// ── Decorative SVG arrows ──────────────────────────────────────
const ArrowMint = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--mint)', stroke: 'currentColor', overflow: 'visible' }} fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10,90 C 10,40 40,20 60,50 C 70,65 80,75 95,70" />
    <path d="M80,55 L95,70 L85,85" />
  </svg>
)
const ArrowLemon = () => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--lemon)', stroke: 'currentColor', overflow: 'visible' }} fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M90,10 C 80,60 60,80 40,60 C 20,40 40,20 60,30 C 80,40 70,70 50,80" />
    <path d="M65,75 L50,80 L55,65" />
  </svg>
)

// ── Spinning circular badge ────────────────────────────────────
const SpinBadge = () => (
  <div style={{
    position: 'relative', width: 128, height: 128,
    background: 'var(--mint)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '5px 5px 0 var(--ink)', border: '2px solid rgba(255,255,255,0.2)',
    transform: 'rotate(12deg)', flexShrink: 0,
  }}>
    <div style={{ position: 'absolute', inset: 4, animation: 'badge-spin 12s linear infinite' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <path id="badgePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
        <text style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em' }} fill="#0A0A0A">
          <textPath href="#badgePath" startOffset="0%">EST. JUNE 2021 • KOLKATA NGO • EST. JUNE 2021 • KOLKATA NGO •</textPath>
        </text>
      </svg>
    </div>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Star size={40} color="#0A0A0A" />
    </div>
  </div>
)

// ── Scroll sections ────────────────────────────────────────────

function HeroSection({ scrollYProgress }: { scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const shouldReduce = useReducedMotion()
  const isMobile = useIsMobile(768)
  const scale  = useTransform(scrollYProgress, [0, 1], [1, 0.82])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -4])

  return (
    <motion.section
      style={{
        ...(isMobile || shouldReduce ? {} : { scale, rotate }),
        position: 'sticky', top: 0, height: '100vh', overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: '#0A0A0A' }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 5,
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}>
        {/* Sticker row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28, padding: '0 24px' }}>
          <span className="sticker sticker-mint sticker-float">★ EST. JUNE 2021</span>
          <span className="sticker sticker-pink wobble">student-run</span>
          <span className="sticker sticker-ghost">DARPAN certified</span>
        </div>

        {/* Stacked typography */}
        <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 'clamp(5%,12%,160px)' }}>
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 900,
              fontSize: 'clamp(52px,10vw,130px)', lineHeight: 0.88,
              letterSpacing: '-0.04em', margin: 0, color: 'var(--mint)',
              textTransform: 'uppercase',
              textShadow: '3px 3px 0 rgba(0,229,160,0.15)',
            }}>STUDENT</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-8px' }}>
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 900,
              fontSize: 'clamp(72px,17vw,220px)', lineHeight: 0.85,
              letterSpacing: '-0.05em', margin: 0, color: '#ffffff',
              textTransform: 'uppercase',
              WebkitTextStroke: '1px rgba(255,255,255,0.1)',
            }}>KOLKATA</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 'clamp(5%,14%,180px)', marginTop: '-6px' }}>
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 900,
              fontSize: 'clamp(52px,10vw,130px)', lineHeight: 0.88,
              letterSpacing: '-0.04em', margin: 0, color: 'var(--lemon)',
              textTransform: 'uppercase',
              textShadow: '3px 3px 0 rgba(111,215,255,0.15)',
            }}>NGO.</h1>
          </div>
        </div>

        {/* Floating cards */}
        <motion.div
          {...(isMobile || shouldReduce ? {} : { animate: { y: [0, -16, 0] }, transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' } })}
          style={{ position: 'absolute', bottom: '8%', left: 'clamp(20px,6%,80px)', zIndex: 20 }}
        >
          <div style={{
            width: 'clamp(148px,18vw,192px)',
            background: 'rgba(255,255,255,0.09)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            borderRadius: 24, padding: '20px 18px',
            transform: 'rotate(-10deg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Active Members</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 44, lineHeight: 1, color: 'var(--mint)', letterSpacing: '-0.03em' }}>850+</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>across 8 departments</div>
          </div>
        </motion.div>

        <motion.div
          {...(isMobile || shouldReduce ? {} : { animate: { y: [0, -20, 0] }, transition: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 } })}
          style={{ position: 'absolute', top: '14%', right: 'clamp(20px,7%,90px)', zIndex: 20 }}
        >
          <div style={{
            width: 'clamp(148px,18vw,192px)',
            background: 'rgba(255,255,255,0.09)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            borderRadius: 24, padding: '20px 18px',
            transform: 'rotate(10deg)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Paradox 3.0</div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 34, lineHeight: 1, color: 'var(--lemon)', letterSpacing: '-0.03em' }}>₹1L+</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>300 attendees · Jun 2025</div>
          </div>
        </motion.div>

        {/* Zero donations chip */}
        <motion.div
          {...(isMobile || shouldReduce ? {} : { animate: { y: [0, -10, 0] }, transition: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 } })}
          style={{ position: 'absolute', bottom: '22%', right: 'clamp(20px,4%,60px)', zIndex: 15 }}
        >
          <div style={{
            background: 'var(--mint)', border: '2px solid rgba(0,0,0,0.2)',
            borderRadius: 16, padding: '12px 16px',
            transform: 'rotate(6deg)',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: '#0A0A0A', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>₹0 donations</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(0,0,0,0.55)', marginTop: 3 }}>self-funded. always.</div>
          </div>
        </motion.div>

        {/* Spinning badge */}
        <div style={{ position: 'absolute', bottom: '-2%', right: 'clamp(80px,16%,200px)', zIndex: 30 }}>
          <SpinBadge />
        </div>

        {/* Decorative arrows */}
        <div style={{ position: 'absolute', bottom: '2%', left: 'clamp(160px,22%,280px)', width: 80, height: 80, zIndex: 15 }}>
          <ArrowMint />
        </div>
        <div style={{ position: 'absolute', top: '8%', right: 'clamp(200px,26%,360px)', width: 80, height: 80, zIndex: 15 }}>
          <ArrowLemon />
        </div>

        {/* Tagline + CTAs */}
        <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 24px' }}>
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 'clamp(15px,2vw,20px)', color: 'rgba(255,255,255,0.55)', margin: 0, textAlign: 'center', maxWidth: 460 }}>
            850 members. 512 projects. still student-run. still Kolkata.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="mono xs muted" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block', animation: 'badge-spin 0s' }} />
              scroll to explore
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function ImpactSection({ scrollYProgress }: { scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress'] }) {
  const shouldReduce = useReducedMotion()
  const isMobile = useIsMobile(768)
  const scale  = useTransform(scrollYProgress, [0, 1], [0.85, 1])
  const rotate = useTransform(scrollYProgress, [0, 1], [4, 0])

  const stats = [
    { k: '850+', v: 'active members',    c: 'var(--mint)' },
    { k: '512+', v: 'projects completed', c: 'var(--lemon)' },
    { k: '3,500+', v: 'kids in workshops', c: '#FF6BD6' },
    { k: '15,000', v: 'bananas distributed', c: '#FF7A1A' },
  ]


  return (
    <motion.section
      style={{
        ...(isMobile || shouldReduce ? {} : { scale, rotate }),
        position: 'relative', minHeight: '100vh', overflow: 'hidden'
      }}
    >
      {/* Dark base + subtle gradient */}
      <div style={{ position: 'absolute', inset: 0, background: '#06080C' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 60% at 50% 100%, rgba(0,229,160,0.08) 0%, transparent 60%)',
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '54px 54px',
      }} />

      <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(48px,7vw,80px) clamp(24px,5vw,48px)', maxWidth: 1200, margin: '0 auto' }}>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'var(--display)', fontWeight: 900,
          fontSize: 'clamp(40px,7vw,88px)', lineHeight: 0.9,
          letterSpacing: '-0.04em', margin: '0 0 12px',
          color: '#ffffff', textTransform: 'uppercase',
        }}>
          real work.<br />
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)', textTransform: 'none', fontSize: '0.85em' }}>
            real impact.
          </span>
        </h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 48 }}>
          since june 2021 · kolkata
        </p>

        {/* Stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px,100%), 1fr))',
          gap: 14,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: s.c, color: '#0A0A0A',
              borderRadius: 16, padding: '18px 20px',
              border: '2px solid rgba(0,0,0,0.15)',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.2)',
              transform: `rotate(${i % 2 ? '0.8deg' : '-0.8deg'})`,
              position: 'relative',
            }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 36, lineHeight: 1, letterSpacing: '-0.03em' }}>{s.k}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginTop: 6, opacity: 0.65 }}>{s.v}</div>
              {i === 3 && (
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                  background: '#0A0A0A', color: '#fff',
                  padding: '2px 8px', borderRadius: 999,
                }}>not a typo</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function AboutPage() {
  const navigate = useNavigate()
  const scrollContainer = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: scrollContainer,
    offset: ['start start', 'end end'],
  })

  const principles = [
    { t: 'ownership first', s: 'students own execution. not just participation. real responsibility, not just titles.', c: 'var(--mint)' },
    { t: 'real impact only', s: 'every initiative creates tangible, real-world results. time is the resource. impact is the output.', c: 'var(--lemon)' },
    { t: 'fun is mandatory', s: 'participation is designed to feel social and energising, not obligation-driven. if it is boring we fix it.', c: 'var(--pink)' },
    { t: 'community is the point', s: 'friendships and shared experiences are not a bonus. they are the retention mechanism and the whole point.', c: 'var(--sky)' },
  ]

  const milestones = [
    { y: '2021', t: '16 students, a WhatsApp group, and a Sundarbans relief trip with no budget' },
    { y: '2022', t: '200 members, first leadership handover, certificates as currency' },
    { y: '2023', t: 'dipped. recovered. original team stepped back in and rebuilt' },
    { y: '2024', t: 'Disco Diwali. Starry Nights. both crossed 6-digit revenue. ROOTS launched.' },
    { y: '2025', t: '1,100 members. 500+ projects. AQ.Ventures and ShikshAQ in the ecosystem.' },
    { y: '2026', t: '850 active members. ShikshAQ live. still student-run. still Kolkata.' },
  ]

  const team = [
    { n: 'Events', r: 'paradox, disco diwali, starry nights', c: '#FF7A1A' },
    { n: 'Welfare', r: '3,500+ kids reached', c: '#00E5A0' },
    { n: 'Social', r: 'content, reels, instagram', c: '#FF6BD6' },
    { n: 'Collabs', r: 'schools, colleges, ngos', c: '#FFE94A' },
    { n: 'ROOTS', r: 'streetwear, merchandise', c: '#7E5BFF' },
    { n: 'ShikshAQ', r: 'tuition discovery platform', c: '#3DA9FC' },
  ]

  return (
    <div className="route-enter">

      {/* ══════════════════════════════════════════
          SCROLL ANIMATION — 200vh container
          Section 1 (sticky): hero type + cards
          Section 2 (reveals): impact + photos
      ══════════════════════════════════════════ */}
      <div ref={scrollContainer} style={{ position: 'relative', height: '200vh', background: '#0A0A0A' }}>
        <HeroSection scrollYProgress={scrollYProgress} />
        <ImpactSection scrollYProgress={scrollYProgress} />
      </div>

      {/* ── MARQUEE BAND ── */}
      <section style={{ padding: '18px 0', background: 'var(--mint)', color: '#0A0A0A', overflow: 'hidden', borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }}>
        <Marquee items={['★ KOLKATA BORN', '850 ACTIVE MEMBERS', '★ ZERO DONATIONS EVER', '512+ PROJECTS', '★ DARPAN CERTIFIED', '4,000+ SAPLINGS', '★ STUDENT RUN', '15,000 BANANAS']} color="ink" />
      </section>

      {/* ── THE STORY ── */}
      <section className="container" style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))', gap: 56, alignItems: 'start' }}>
          <div>
            <span className="sticker sticker-mint" style={{ marginBottom: 16 }}>★ the story</span>
            <p className="serif" style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', lineHeight: 1.2, margin: '16px 0 0' }}>
              AquaTerra launched on <span style={{ fontStyle: 'italic', color: 'var(--pink)' }}>11 June 2021</span>. 16 students. COVID lockdowns. nowhere to put the energy.
            </p>
            <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', lineHeight: 1.65, marginTop: 20 }}>
              The first project was a relief trip to the Sundarbans. Nobody really knew what they were doing. It worked anyway. That became the pattern.
            </p>
            <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', lineHeight: 1.65, marginTop: 14 }}>
              Four years later, AquaTerra is not a traditional NGO. It is a student ecosystem: impact work, a streetwear brand, a tuition discovery platform, and a free marketing agency for student businesses. All run by teenagers in Kolkata.
            </p>
            <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', lineHeight: 1.65, marginTop: 14 }}>
              The core logic has not changed: <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', color: 'var(--mint)' }}>students learn best when trusted with real work</span>. Not simulations. Not worksheets. Actual execution, with actual stakes.
            </p>
          </div>
          <div className="col gap-3">
            {[
              { k: '850+', v: 'active members', c: 'var(--mint)' },
              { k: '512+', v: 'projects completed', c: 'var(--lemon)' },
              { k: '3,500+', v: 'kids in workshops', c: 'var(--pink)' },
              { k: '15,000', v: 'bananas distributed', c: 'var(--sky)' },
            ].map((s, i) => (
              <div key={i} className="stat" style={{ background: s.c, color: '#0A0A0A', transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`, position: 'relative' }}>
                <div className="stat-num">{s.k}</div>
                <div className="mono upper xs" style={{ fontWeight: 700, marginTop: 4 }}>{s.v}</div>
                {i === 3 && <span className="sticker sticker-ink" style={{ position: 'absolute', top: -10, right: -10, fontSize: 10, padding: '3px 8px' }}>not a typo</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WE ACTUALLY ARE ── */}
      <section className="container" style={{ padding: '0 24px 80px' }}>
        <div className="card" style={{ padding: 32, background: 'var(--bg-2)', borderLeft: '6px solid var(--mint)' }}>
          <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 12 }}>★ what AquaTerra actually is</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
            {[
              { label: 'NGO (DARPAN certified)', detail: 'cleanup drives, Sundarbans relief, tree planting, animal welfare, educational workshops for underprivileged kids' },
              { label: 'ROOTS', detail: 'a student-run streetwear brand. profits fund NGO activities. members design, produce, and sell.' },
              { label: 'AQ.Ventures', detail: 'a free marketing agency built by AQ members, for student businesses. real clients, real work.' },
              { label: 'ShikshAQ', detail: 'a tuition discovery platform built by students, for students across Kolkata.' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--display)', marginBottom: 6 }}>{item.label}</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRINCIPLES ── */}
      <section className="container" style={{ padding: '20px 24px 80px' }}>
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="h-display" style={{ fontSize: 'clamp(40px, 6vw, 64px)', margin: 0, lineHeight: 0.95 }}>
            four <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>values</span>.
          </h2>
          <span className="sticker sticker-pink wobble">★ non-negotiable</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
          {principles.map((p, i) => (
            <div key={i} className="card" style={{ padding: 28, background: p.c, color: '#0A0A0A', position: 'relative', transform: `rotate(${i % 2 ? 0.4 : -0.4}deg)` }}>
              <div className="mono xs upper" style={{ fontWeight: 800, opacity: 0.55 }}>0{i + 1} / 04</div>
              <h3 className="h-display" style={{ fontSize: 'clamp(22px, 3vw, 32px)', margin: '10px 0 8px', lineHeight: 1 }}>{p.t}</h3>
              <p style={{ fontSize: 'clamp(13px, 1.4vw, 15px)', lineHeight: 1.55, margin: 0 }}>{p.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section style={{ padding: '60px 24px', background: 'var(--bg-2)', borderTop: '1px dashed var(--line)', borderBottom: '1px dashed var(--line)' }}>
        <div className="container">
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <h2 className="h-display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', margin: 0, lineHeight: 0.95 }}>
              five <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--pink)' }}>years</span>, six chapters.
            </h2>
            <span className="sticker sticker-mint sticker-float">★ since 2021</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 14 }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className="h-display" style={{ display: 'inline-grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: ['var(--mint)','var(--lemon)','var(--pink)','var(--sky)','var(--mint)','var(--lemon)'][i], fontSize: 14, fontWeight: 800, color: '#0A0A0A' }}>{m.y}</div>
                <p className="mono xs" style={{ marginTop: 12, lineHeight: 1.4, color: 'var(--ink-2)' }}>{m.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAMS ── */}
      <section className="container" style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)' }}>
        <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="h-display" style={{ fontSize: 'clamp(36px, 5vw, 64px)', margin: 0, lineHeight: 0.95 }}>
            the <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>departments</span>.
          </h2>
          <span className="sticker sticker-ghost">+ 850 members behind them</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 18 }}>
          {team.map((t, i) => (
            <div key={i} className="card card-hover" style={{ padding: 22, cursor: 'pointer', transform: `translateY(${i % 2 ? 8 : 0}px)` }} onClick={() => navigate('/teams')}>
              <div className="avatar" style={{ background: t.c, width: 56, height: 56, fontSize: 16, margin: '0 0 14px', border: 'none', boxShadow: 'none', color: '#0A0A0A' }}>
                {t.n.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'var(--display)' }}>{t.n}</div>
              <div className="mono xs muted upper" style={{ fontWeight: 700, marginTop: 4 }}>{t.r}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="container" style={{ padding: '20px 24px 100px' }}>
        <div className="card" style={{ padding: 'clamp(40px, 6vw, 72px) clamp(24px, 4vw, 48px)', background: 'var(--ink)', color: 'var(--bg)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <Star size={120} color="var(--mint)" style={{ position: 'absolute', top: -30, left: -30, opacity: 0.12 }} className="spin-slow" />
          <Star size={90} color="var(--lemon)" style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.18, transform: 'rotate(15deg)' }} />
          <span className="sticker sticker-mint sticker-float">★ free. always.</span>
          <h2 className="h-display" style={{ fontSize: 'clamp(48px, 7vw, 80px)', margin: '16px 0', lineHeight: 0.9 }}>
            come <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>build</span> with us.
          </h2>
          <p style={{ fontSize: 18, opacity: 0.7, maxWidth: 520, margin: '0 auto 28px' }}>2 minutes to apply. 24 hours to hear back. zero rupees. forever.</p>
          <button className="btn btn-lg btn-primary" onClick={() => navigate('/register')}>
            <I.rocket /> START YOUR APPLICATION
          </button>
        </div>
      </section>

      <style>{`
        @keyframes hero-float-a {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          50% { transform: translateY(-16px) rotate(-10deg); }
        }
        @keyframes badge-spin { to { transform: rotate(360deg); } }

        /* Mobile: collapse photo grid to 2 cols */
        @media (max-width: 640px) {
          .about-photo-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
