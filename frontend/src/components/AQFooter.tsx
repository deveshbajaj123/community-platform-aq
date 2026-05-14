import { useNavigate } from 'react-router-dom'
import { Marquee } from './v6Shared'

export default function AQFooter() {
  const navigate = useNavigate()

  return (
    <footer className="aq-footer">
      <div className="container">
        <div className="aq-footer-grid">
          <div className="aq-footer-brand">
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em', lineHeight: 0.9 }}>
              AQUA<br />TERRA<span style={{ color: 'var(--mint)' }}>.</span>
            </div>
            <p style={{ marginTop: 16, color: '#aaa', maxWidth: 320, fontSize: 14 }}>
              A community of students documenting work, water, and weird ideas. Open access. Always.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              <span className="sticker sticker-mint" style={{ fontSize: 11 }}>EST 2021</span>
              <span className="sticker sticker-pink" style={{ fontSize: 11, transform: 'rotate(2deg)' }}>STUDENT-RUN</span>
            </div>
          </div>

          {[
            { h: 'Explore',      links: [['Feed','/feed'],['Teams','/teams'],['Projects','/projects'],['Search','/search']] },
            { h: 'Org',          links: [['About','/about'],['Blog','/blog'],['Contact','/contact'],['FAQ','/faq']] },
            { h: 'Get involved', links: [['Volunteer','/volunteer'],['Apply to join','/register'],['Support us','/support'],['Collaborate','/collaborations']] },
          ].map(col => (
            <div key={col.h}>
              <h5 className="mono upper xs" style={{ color: 'var(--mint)', margin: '0 0 14px' }}>{col.h}</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <button
                      onClick={() => navigate(href)}
                      style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--sans)', padding: 0, transition: 'color .15s', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#aaa')}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, color: '#666', fontFamily: 'var(--mono)', fontSize: 11 }}>
          <div>© 2026 AQUATERRA — open community, no rights reserved</div>
          <div>v6.0.0 / made with love + chaos</div>
        </div>
      </div>

      <style>{`
        .aq-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 32px;
          margin-bottom: 40px;
        }
        @media (max-width: 768px) {
          .aq-footer-grid {
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }
        }
        @media (max-width: 480px) {
          .aq-footer-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .aq-footer-brand { order: -1; }
        }
      `}</style>

      {/* ── Green marquee — absolute bottom of the footer ── */}
      <div className="aq-footer-marquee">
        <Marquee
          items={['★ KOLKATA BORN', 'STUDENT RUN', '★ DARPAN CERTIFIED', 'ZERO FEES EVER', '★ 850+ MEMBERS', '512+ PROJECTS', '★ 4,000 SAPLINGS', '15,000 BANANAS', '★ OPEN ACCESS']}
          color="mint"
        />
      </div>
    </footer>
  )
}
