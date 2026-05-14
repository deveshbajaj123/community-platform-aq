import { Link } from 'react-router-dom'

export default function VolunteerThankYouPage() {
  return (
    <div className="route-enter" style={{ minHeight: '80dvh', display: 'grid', placeItems: 'center', padding: 'clamp(24px, 5vw, 40px) var(--page-px,24px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div className="h-display" style={{ fontSize: 80, lineHeight: 1, marginBottom: 16, color: 'var(--mint)' }}>★</div>
        <h1 className="h-display" style={{ fontSize: 'clamp(32px,5vw,52px)', marginBottom: 16 }}>application<br />received.</h1>
        <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-2)', marginBottom: 32, fontSize: 18, lineHeight: 1.6 }}>
          We'll review it and get back to you soon. Usually within 2–5 days.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/projects" className="btn btn-primary">Explore projects →</Link>
          <Link to="/blog" className="btn">Read our blog</Link>
        </div>
      </div>
    </div>
  )
}
