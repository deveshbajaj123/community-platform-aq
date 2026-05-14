import { Link } from 'react-router-dom'
export default function NotFoundPage() {
  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(44px, 8vw, 80px)', paddingBottom: 'clamp(44px, 8vw, 80px)', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(80px, 15vw, 140px)', lineHeight: 1, color: 'var(--mint)' }}>404</div>
      <div className="h-display" style={{ fontSize: 'clamp(28px, 5vw, 44px)', marginTop: 8 }}>page not found.</div>
      <p style={{ color: 'var(--ink-2)', marginTop: 12, fontSize: 16 }}>this link is broken or the page was moved.</p>
      <div className="row gap-2" style={{ marginTop: 28 }}>
        <Link to="/" className="btn btn-primary">go home →</Link>
        <Link to="/feed" className="btn">feed</Link>
      </div>
    </div>
  )
}
