import { Star, Burst } from './v6Shared'
import AnimatedGradientBackground, { AQ_GRADIENT_LOGIN } from './AnimatedGradientBackground'

// ── Inline emoji helper ──────────────────────────────────────────
const Em = ({ e, label }: { e: string; label?: string }) => (
  <span
    role="img"
    aria-label={label}
    style={{ display: 'inline-block', margin: '0 4px', fontSize: '1em', lineHeight: 1, verticalAlign: 'middle' }}
  >
    {e}
  </span>
)

// ── Feature lines per mode ───────────────────────────────────────
type Line = React.ReactNode

const LOGIN_LINES: Line[] = [
  <>Your <Em e="👥" label="team" /> team has been waiting.</>,
  <>Events <Em e="🎭" /> welfare <Em e="🌿" /> streetwear <Em e="👕" /></>,
  <>Certificates <Em e="📜" label="certificates" /> that actually matter.</>,
  <>Zero rupees. <span style={{ color: 'var(--lemon)', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>forever.</span></>,
  <>Still student-run. <Em e="🌊" label="Kolkata" /> Still Kolkata.</>,
]

const REGISTER_LINES: Line[] = [
  <>Join <span style={{ color: 'var(--mint)', fontWeight: 900 }}>850+ students</span> <Em e="⭐" label="star" /></>,
  <>Run real welfare <Em e="🌿" label="welfare" /> events and trips.</>,
  <>Build ROOTS <Em e="👕" label="streetwear" /> — our streetwear brand.</>,
  <>Earn your <Em e="📜" label="certificate" /> Director certificate.</>,
  <>Zero rupees. <span style={{ color: 'var(--lemon)', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>forever.</span></>,
]

// ── Props ────────────────────────────────────────────────────────
interface AuthFeaturePanelProps {
  mode: 'login' | 'register'
}

// ── Component ────────────────────────────────────────────────────
export default function AuthFeaturePanel({ mode }: AuthFeaturePanelProps) {
  const lines = mode === 'login' ? LOGIN_LINES : REGISTER_LINES
  const heading = mode === 'login' ? <>welcome<br />back.</> : <>join the<br />community.</>
  const sub = mode === 'login'
    ? '850+ members. 6 departments. still student-run.'
    : '2 minutes to apply. 24 hours to hear back.'

  return (
    <div style={{
      background: '#060606',
      color: '#ffffff',
      padding: 'clamp(40px, 6vw, 72px) clamp(32px, 5vw, 56px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Animated radial gradient */}
      <AnimatedGradientBackground
        {...AQ_GRADIENT_LOGIN}
        startingGap={130}
        breathing
        animationSpeed={0.007}
        breathingRange={4}
        topOffset={20}
      />

      {/* Fine grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Decorative background elements */}
      <Star
        size={110}
        color="var(--mint)"
        style={{ position: 'absolute', top: 32, right: 40, opacity: 0.1, transform: 'rotate(-12deg)', zIndex: 1 }}
        className="spin-slow"
      />
      <Burst
        size={80}
        color="#6FD7FF"
        style={{ position: 'absolute', bottom: 48, right: 60, opacity: 0.08, transform: 'rotate(20deg)', zIndex: 1 }}
      />

      {/* Content — above gradient (z: 2) */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* Badge sticker */}
        <span
          className="sticker sticker-mint"
          style={{ marginBottom: 20, display: 'inline-flex', animation: 'feature-fade-up 0.5s ease both' }}
        >
          ★ AQUATERRA
        </span>

        {/* Heading */}
        <h1
          className="h-display"
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            margin: 0,
            lineHeight: 0.95,
            color: 'var(--bg)',
            animation: 'feature-fade-up 0.5s 0.1s ease both',
          }}
        >
          {heading}
        </h1>

        {/* Subline */}
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.35)',
            margin: '14px 0 32px',
            animation: 'feature-fade-up 0.5s 0.2s ease both',
          }}
        >
          {sub}
        </p>

        {/* Feature lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 'clamp(15px, 1.8vw, 19px)',
                lineHeight: 1.45,
                color: 'rgba(255,255,255,0.78)',
                fontFamily: 'var(--eina)',
                animation: `feature-fade-up 0.5s ${0.3 + i * 0.1}s ease both`,
                display: 'flex',
                alignItems: 'center',
                gap: 0,
              }}
            >
              {/* Leading dash */}
              <span style={{
                display: 'inline-block',
                width: 20,
                height: 2,
                background: 'var(--mint)',
                borderRadius: 1,
                flexShrink: 0,
                marginRight: 10,
                marginTop: 1,
              }} />
              <span>{line}</span>
            </div>
          ))}
        </div>

        {/* Bottom badge */}
        <div
          style={{
            marginTop: 36,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: '8px 16px',
            animation: `feature-fade-up 0.5s ${0.3 + lines.length * 0.1 + 0.1}s ease both`,
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--mint)',
            boxShadow: '0 0 0 3px rgba(0,229,160,0.25)',
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.06em' }}>
            DARPAN CERTIFIED · KOLKATA · EST. 2021
          </span>
        </div>

      </div>

      <style>{`
        @keyframes feature-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
