import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function SettingsPage() {
  const [tab, setTab] = useState('account')
  const { member, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const tabs = ['account', 'profile', 'notifications', 'privacy', 'appearance', 'danger']

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(28px,5vw,48px)', paddingBottom: 80, maxWidth: 880 }}>
      <span className="sticker">★ SETTINGS</span>
      <h1 className="h-display" style={{ fontSize: 'clamp(52px, 8vw, 84px)', margin: '12px 0 32px', lineHeight: 0.9 }}>
        you<span style={{ color: 'var(--mint)' }}>.</span>
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 28, alignItems: 'start' }}>
        <aside className="col gap-1">
          {tabs.map(t => (
            <button
              key={t}
              className={'settings-link ' + (tab === t ? 'active' : '')}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </aside>
        <section className="card" style={{ padding: 28 }}>
          {tab === 'account' && (
            <div className="col gap-3">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>account.</h3>
              <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
                Update your name, school, and contact details from your profile editor.
              </p>
              <div className="card" style={{ padding: '14px 18px', background: 'var(--bg-2)', border: '1.5px solid var(--line)', borderRadius: 12 }}>
                <div className="mono xs upper muted" style={{ marginBottom: 4 }}>logged in as</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{member?.full_name}</div>
                <div className="mono xs muted">{member?.email}</div>
              </div>
              <Link to="/profile/edit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                edit profile →
              </Link>
            </div>
          )}
          {tab === 'profile' && (
            <div className="col gap-3">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>profile.</h3>
              <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
                Edit your bio, avatar, and public profile from the profile editor.
              </p>
              <Link to="/profile/edit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                edit profile →
              </Link>
            </div>
          )}
          {tab === 'notifications' && (
            <div className="col gap-3">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>alerts.</h3>
              {/* Honest coming-soon notice — fake toggles removed */}
              <div className="card" style={{ padding: 20, background: 'var(--bg-2)', border: '2px dashed var(--line)' }}>
                <div className="mono xs upper muted">Notifications</div>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
                  Email and push notifications are coming in a future update. We'll let you know when they're ready.
                </p>
              </div>
            </div>
          )}
          {tab === 'privacy' && (
            <div className="col gap-3">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>privacy.</h3>
              <p className="muted">All AquaTerra posts are public by design — that's the point. But you control your profile.</p>
              {/* Honest coming-soon notice — fake toggles removed */}
              <div className="card" style={{ padding: 20, background: 'var(--bg-2)', border: '2px dashed var(--line)' }}>
                <div className="mono xs upper muted">Privacy Controls</div>
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-2)' }}>
                  Profile visibility controls are coming in a future update. Your profile is currently visible to all members.
                </p>
              </div>
            </div>
          )}
          {tab === 'appearance' && (
            <div className="col gap-2">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>appearance.</h3>
              <p className="muted">The platform runs in paper-bold light mode. Dark mode and custom palettes are coming in a future update.</p>
              <div className="row gap-2 flex-wrap" style={{ marginTop: 8 }}>
                {[
                  { label: 'Paper Bold', bg: '#F4EFE0', active: true },
                  { label: 'Night Mode', bg: '#0A0A0A', dark: true },
                  { label: 'Mint Fresh', bg: '#E0F5EC' },
                ].map(t => (
                  <div
                    key={t.label}
                    className="card"
                    style={{
                      position: 'relative',
                      padding: '12px 18px',
                      background: t.bg,
                      color: t.dark ? '#fff' : '#0A0A0A',
                      border: t.active ? '2px solid var(--ink)' : '2px solid var(--line)',
                      cursor: t.active ? 'default' : 'not-allowed',
                      pointerEvents: t.active ? 'auto' : 'none',
                    }}
                    title={t.active ? 'Current theme' : 'Coming soon'}
                  >
                    {!t.active && (
                      <span
                        className="chip"
                        style={{ position: 'absolute', top: 8, right: 8, fontSize: 10 }}
                      >
                        SOON
                      </span>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.label}</div>
                    <div className="mono xs upper" style={{ marginTop: 4, opacity: 0.6 }}>
                      {t.active ? 'active' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'danger' && (
            <div className="col gap-3">
              <h3 className="h-display" style={{ fontSize: 28, margin: 0, color: 'var(--tomato, #FF4D2E)' }}>danger zone.</h3>
              <button className="btn" onClick={handleLogout}>log out</button>
              <button className="btn" style={{ borderColor: 'var(--tomato, #FF4D2E)', color: 'var(--tomato, #FF4D2E)' }}
                onClick={() => window.alert('To deactivate your account, message a Director or HoD on the platform. They will process it within 48 hours.')}>
                deactivate account
              </button>
              <button className="btn" style={{ background: 'var(--tomato, #FF4D2E)', color: '#fff', border: 'none' }}
                onClick={() => { if (window.confirm('This is irreversible. To permanently delete your account, email aquaterrakolkata@gmail.com with your account email. We process all deletion requests within 30 days.')) { window.open('mailto:aquaterrakolkata@gmail.com?subject=Account Deletion Request') } }}>
                delete account permanently
              </button>
              <p className="small muted">deleting is irreversible. your posts stay (anonymized) — your profile + private data is wiped within 30 days.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
