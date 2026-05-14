import { Link } from 'react-router-dom'
import './ParadoxBanner.css'

/**
 * Full-bleed bento banner that surfaces the Paradox 2026 sub-app (/paradox).
 * Mobile-first: single column stack at <640px, 6-col bento at >=640px,
 * 12-col bento at >=900px. Each cell is a Link that doubles as a section
 * shortcut into the sub-app. Touch-friendly (≥48px hit areas), tap-highlight
 * suppressed, scale-on-press feedback.
 */
export default function ParadoxBanner() {
  return (
    <section className="px-banner" aria-label="Paradox 2026">
      <div className="px-banner__grid">
        <Link to="/paradox" className="px-banner__cell px-banner__cell--hero" aria-label="Enter Paradox 2026">
          <span className="px-banner__kicker">★ New · Festival ’26</span>
          <div>
            <h2 className="px-banner__hero-title">
              PARADOX
              <br />
              2026<span className="px-banner__dot">.</span>
            </h2>
            <p className="px-banner__hero-sub">Eight events. One stage. Step into the festival.</p>
          </div>
          <span className="px-banner__cta">Enter →</span>
        </Link>

        <Link to="/paradox/events" className="px-banner__cell px-banner__cell--events">
          <span className="px-banner__kicker">Events</span>
          <div>
            <div className="px-banner__big">8 events</div>
            <div className="px-banner__small">Sports · Arts · Strategy · Tech</div>
          </div>
        </Link>

        <Link to="/paradox/sponsor" className="px-banner__cell px-banner__cell--sponsor">
          <span className="px-banner__kicker">Partners</span>
          <div className="px-banner__mid">Sponsor us<span className="px-banner__arrow"> →</span></div>
        </Link>

        <Link to="/paradox/afterparty" className="px-banner__cell px-banner__cell--afterparty">
          <span className="px-banner__kicker px-banner__kicker--yel">Night 03</span>
          <div className="px-banner__mid">After<br />Party</div>
        </Link>

        <div className="px-banner__ticker" aria-hidden="true">
          <div className="px-banner__ticker-track">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i}>★ PARADOX 2026 · 8 EVENTS · 1 STAGE · REGISTER NOW</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
