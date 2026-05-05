
import { Link } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'
import CountUp from '../components/shared/CountUp'
import Ticker from '../components/shared/Ticker'
import AQNodeExplorer from '../components/AQNodeExplorer'


const TICKER_ITEMS = [
  'AQUATERRA', 'KOLKATA', 'SINCE 2021', 'DARPAN CERTIFIED',
  '534 WELFARE DRIVES', '1,100+ MEMBERS', 'FEEDING DOGS', 'PLANTATION DRIVES',
  'SUNDARBANS RELIEF', 'AQ TECH', 'PRISM MEDIA', 'OLD AGE HOME VISITS',
  'DISTRIBUTION DRIVES', 'WORKSHOPS', 'FUNDRAISING', 'NGO · NGO · NGO',
]

export default function EverythingWeDoPage() {
  useReveal()

  return (
    <div className="aq-page">
      {/* Hero */}
      <section style={{ position: 'relative', padding: 'clamp(72px, 12vw, 140px) 0 clamp(48px, 8vw, 80px)', overflow: 'hidden' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--c-welfare)' }}>
            What we do
          </div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ color: 'var(--txt)', marginBottom: 24 }}>
            Everything<br />We Do
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 520 }}>
            From street-level welfare work to building technology companies — AquaTerra is many things to many people, but always rooted in the same place.
          </p>
        </div>
      </section>

      {/* Interactive node explorer */}
      <section className="aq-band-sm">
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 16 }}>Explore the structure</div>
          <div style={{ height: 520, borderRadius: 'var(--r-lg)', overflow: 'hidden' }} className="aq-reveal aq-reveal-d1">
            <AQNodeExplorer />
          </div>
          <p style={{ fontFamily: 'var(--fm)', fontSize: 11, color: 'var(--txt-4)', letterSpacing: '0.04em', marginTop: 10, textAlign: 'center', textTransform: 'uppercase' }}>
            Click any node to explore · nodes with + drill deeper
          </p>
        </div>
      </section>

      {/* Ticker */}
      <Ticker items={TICKER_ITEMS} />

      {/* Impact stats */}
      <section style={{ background: 'var(--ink)', padding: 'clamp(72px, 10vw, 120px) 0' }}>
        <div className="aq-wrap">
          <div className="aq-label aq-reveal" style={{ marginBottom: 24, color: 'var(--accent)' }}>Impact</div>
          <h2 className="aq-display aq-reveal aq-reveal-d1" style={{ color: '#f0ede4', marginBottom: 56 }}>
            Four years.<br />The numbers.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
            {[
              { to: 534, suffix: '+', label: 'Welfare Projects' },
              { to: 1100, suffix: '+', label: 'Members' },
              { to: 4, suffix: ' yrs', label: 'Running' },
              { to: 12, suffix: '', label: 'Directors' },
              { to: 40, suffix: '+', label: 'Events Held' },
              { to: 3, suffix: '', label: 'Ventures Built' },
            ].map(s => (
              <div key={s.label} className="aq-reveal">
                <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: '#f0ede4', marginBottom: 8 }}>
                  <CountUp to={s.to} suffix={s.suffix} />
                </div>
                <div className="aq-label" style={{ color: 'rgba(240,237,228,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join section */}
      <section className="aq-band">
        <div className="aq-wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <div className="aq-label aq-reveal" style={{ marginBottom: 16 }}>Join the work</div>
              <h2 className="aq-display aq-reveal aq-reveal-d1" style={{ marginBottom: 24 }}>
                Be part<br />of this.
              </h2>
              <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', marginBottom: 28 }}>
                We recruit from schools across Kolkata. If you're driven, curious, and want to do real work — you'll fit right in.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="aq-reveal aq-reveal-d3">
                <Link to="/volunteer/apply" className="aq-btn aq-btn-accent">Apply to Volunteer →</Link>
                <Link to="/collaborations" className="aq-btn aq-btn-outline">Collaborate with us</Link>
              </div>
            </div>
            <div>
              {[
                ['1,100+', 'Members across Kolkata'],
                ['15+', 'Partner schools'],
                ['4', 'Active departments'],
                ['0', 'Minimum experience needed'],
              ].map(([n, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--accent)', minWidth: 60 }}>{n}</div>
                  <div style={{ fontFamily: 'var(--f-body)', fontSize: 14, color: 'var(--txt-2)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
