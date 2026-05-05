import { Link } from 'react-router-dom'

export default function VolunteerThankYouPage() {
  return (
    <div className="aq-auth-page">
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 56, marginBottom: 24, color: 'var(--c-welfare)' }}>✓</div>
        <h1 className="aq-title" style={{ marginBottom: 16, color: 'var(--c-welfare)' }}>Application received.</h1>
        <p className="aq-serif" style={{ color: 'var(--txt-2)', marginBottom: 32, fontSize: 18 }}>
          We'll review it and get back to you soon. Usually within 2–5 days.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/projects" className="aq-btn aq-btn-ink">Explore projects →</Link>
          <Link to="/blog" className="aq-btn aq-btn-outline">Read our blog</Link>
        </div>
      </div>
    </div>
  )
}
