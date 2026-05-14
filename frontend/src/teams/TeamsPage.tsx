import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import teamService from '../services/teamService'
import { jobOpenings, CAT_COLORS } from '../lib/jobOpenings'

const CAT_ICONS: Record<string, string> = {
  events: '🎪', welfare: '🌱', labs: '⚡', operations: '⚙️', content: '✍️', default: '★'
}

function TeamCard({ team, onClick }: { team: any; onClick: () => void }) {
  const accent = team.color || CAT_COLORS[team.category] || '#00E5A0'
  const count = team.memberCount || team.member_count || 0
  const icon = CAT_ICONS[team.category] || CAT_ICONS.default

  // Derive initials for stacked avatars from member count
  const fakeMemberColors = ['#FF6BD6','#00E5A0','#FFC700','#7E5BFF','#FF7A1A']

  return (
    <article
      className="team-card"
      onClick={onClick}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Colored header band */}
      <div className="team-card-band" style={{ background: accent }}>
        <div className="team-card-band-icon">{icon}</div>
        <div className="team-card-name">{team.name}</div>
        <div className="team-card-cat mono xs upper">
          {team.category || 'team'}
        </div>
      </div>

      {/* Body */}
      <div className="team-card-body">
        <p className="team-card-bio">
          {(team.bio || team.description || '').slice(0, 110)}
          {(team.bio || team.description || '').length > 110 ? '…' : ''}
        </p>
        <div className="team-card-foot">
          {/* Stacked mini avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {fakeMemberColors.slice(0, Math.min(4, count)).map((c, i) => (
                <div
                  key={i}
                  className="avatar"
                  style={{
                    width: 24, height: 24, fontSize: 9, flexShrink: 0,
                    background: c,
                    marginLeft: i > 0 ? -7 : 0,
                    border: '2px solid var(--card)',
                    zIndex: 4 - i,
                    position: 'relative',
                  }}
                />
              ))}
            </div>
            <span className="mono xs" style={{ fontWeight: 700, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
              {count} member{count !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            className="team-card-cta"
            style={{ background: accent, color: '#0A0A0A' }}
            onClick={e => { e.stopPropagation(); onClick() }}
          >
            View team →
          </button>
        </div>
      </div>
    </article>
  )
}

export default function TeamsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openRoles, setOpenRoles] = useState<any[]>([])

  useEffect(() => {
    jobOpenings.getOpen().then(roles => setOpenRoles(roles)).catch(() => setOpenRoles([]))
  }, [])

  useEffect(() => {
    teamService.getTeams({ limit: 50 })
      .then(result => {
        setTeams(result.success && result.data.length > 0 ? result.data : SAMPLE_TEAMS)
      })
      .catch(() => setTeams(SAMPLE_TEAMS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? teams : teams.filter((t: any) => t.category === filter)
  const cats = ['all', 'events', 'welfare', 'labs', 'operations', 'content']

  return (
    <div className="route-enter">
      {/* Hero */}
      <section className="teams-hero">
        <div className="container">
          <span className="sticker sticker-mint wobble" style={{ display: 'inline-flex', marginBottom: 16 }}>
            ★ {teams.length} TEAMS
          </span>
          <h1 className="h-display teams-hero-title" style={{ textWrap: 'balance' } as React.CSSProperties}>
            pick your <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--pink)' }}>department</span>.
          </h1>
          <p style={{ fontSize: 16, marginTop: 14, color: 'var(--ink-2)', maxWidth: 480 }}>
            Every team at AQ owns a real piece of the org. Pick the one that fits what you want to build.
          </p>
        </div>
      </section>

      {/* ── Open Roles banner ── */}
      {openRoles.length > 0 && (
        <section style={{ background: '#0A0A0A', borderBottom: '2px solid var(--mint)', padding: 'clamp(20px,4vw,28px) var(--page-px,24px)' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mint)', display: 'inline-block', boxShadow: '0 0 0 0 rgba(0,229,160,0.5)', animation: 'pending-pulse 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>
                  {openRoles.length} role{openRoles.length !== 1 ? 's' : ''} currently open
                </span>
              </div>
              <Link
                to="/opportunities"
                style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mint)', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.05em' }}
              >
                view all openings →
              </Link>
            </div>

            {/* Role cards — horizontal scroll on mobile */}
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', overscrollBehaviorX: 'none' }}>
              {openRoles.map(op => {
                const accent = CAT_COLORS[op.category] || '#00E5A0'
                return (
                  <Link
                    key={op.id}
                    to="/opportunities"
                    style={{
                      textDecoration: 'none', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', gap: 8,
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${accent}44`,
                      borderRadius: 14,
                      minWidth: 200, maxWidth: 260,
                      transition: 'background 0.14s, border-color 0.14s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'rgba(255,255,255,0.08)'
                      el.style.borderColor = accent
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'rgba(255,255,255,0.04)'
                      el.style.borderColor = `${accent}44`
                    }}
                  >
                    {/* Category chip */}
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: accent }}>
                      {op.category}{op.teamName ? ` · ${op.teamName}` : ''}
                    </span>
                    {/* Title */}
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.15 }}>
                      {op.title}
                    </div>
                    {/* Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                      {op.commitment && (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                          ⏱ {op.commitment}
                        </span>
                      )}
                      {op.deadline && (() => {
                        const d = Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000)
                        return d > 0 ? (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: d <= 3 ? '#FF7A1A' : 'rgba(255,255,255,0.45)' }}>
                            {d <= 3 ? `⚠ ${d}d left` : `${d}d left`}
                          </span>
                        ) : null
                      })()}
                      <span style={{ flex: 1 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, fontWeight: 700 }}>apply →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="container" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div className="row gap-2" style={{ flexWrap: 'wrap', paddingBottom: 24, overflowX: 'hidden' }}>
          {cats.map(c => (
            <button
              key={c}
              className={'chip ' + (filter === c ? 'chip-active' : '')}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="mono xs muted">{filtered.length} team{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="container teams-grid">
        {loading
          ? [0,1,2,3,4,5].map(i => (
              <div key={i} className="v6-skeleton" style={{ height: 260, borderRadius: 20, animationDelay: `${i * 0.08}s` }} />
            ))
          : filtered.map((t: any) => (
              <TeamCard
                key={t.uuid || t.id}
                team={t}
                onClick={() => navigate('/teams/' + (t.uuid || t.id))}
              />
            ))
        }
      </div>

      <style>{`
        .teams-hero {
          padding: clamp(40px, 7vw, 80px) 24px clamp(24px, 4vw, 40px);
          border-bottom: 1px solid var(--line);
          margin-bottom: 28px;
        }
        .teams-hero-title {
          font-size: clamp(42px, 8vw, 88px);
          margin: 0;
          line-height: 0.92;
        }
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          padding-bottom: 100px;
        }
        @media (max-width: 1000px) { .teams-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .teams-grid { grid-template-columns: 1fr; gap: 14px; } }

        /* ── Team card ── */
        .team-card {
          border-radius: 20px;
          overflow: hidden;
          background: var(--card);
          cursor: pointer;
          border: 2px solid var(--ink);
          box-shadow: 3px 3px 0 0 var(--ink);
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s;
          display: flex;
          flex-direction: column;
        }
        .team-card:hover {
          transform: translateY(-4px);
          box-shadow: 5px 7px 0 0 var(--ink);
        }
        .team-card:active { transform: scale(0.97); box-shadow: 2px 2px 0 0 var(--ink); }

        .team-card-band {
          padding: 24px 22px 20px;
          color: #0A0A0A;
          position: relative;
          overflow: hidden;
          min-height: 130px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .team-card-band-icon {
          position: absolute;
          top: 14px;
          right: 18px;
          font-size: 36px;
          opacity: 0.22;
          line-height: 1;
          pointer-events: none;
        }
        .team-card-name {
          font-family: var(--display);
          font-weight: 900;
          font-size: clamp(24px, 3.5vw, 34px);
          line-height: 0.96;
          letter-spacing: -0.03em;
          margin-bottom: 8px;
        }
        .team-card-cat {
          display: inline-block;
          background: rgba(0,0,0,0.15);
          color: #0A0A0A;
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
          align-self: flex-start;
        }

        .team-card-body {
          padding: 16px 20px 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .team-card-bio {
          font-family: var(--eina);
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--ink-2);
          margin: 0;
          flex: 1;
        }
        .team-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .team-card-cta {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 16px;
          min-height: 36px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          transition-property: transform, opacity;
          transition-duration: 0.12s;
        }
        .team-card-cta:hover { transform: translateX(2px); opacity: 0.9; }
        .team-card-cta:active { transform: scale(0.96) !important; opacity: 1; }
      `}</style>
    </div>
  )
}

const SAMPLE_TEAMS = [
  { uuid: 't-1', name: 'Events Team',     category: 'events',     memberCount: 40, color: '#FF7A1A', bio: 'Paradox. Disco Diwali. Starry Nights. Every fundraiser AQ has ever run. Paradox 3.0 had 300 attendees and crossed 6-digit revenue. This team ran it.' },
  { uuid: 't-2', name: 'Welfare Team',    category: 'welfare',    memberCount: 60, color: '#00E5A0', bio: '3,500+ kids reached in teaching workshops. 8 Sundarbans relief trips. Dog feeding drives across Kolkata. 4,000+ saplings planted. This is the impact core.' },
  { uuid: 't-3', name: 'Social Media',    category: 'content',    memberCount: 20, color: '#FF6BD6', bio: 'Instagram, LinkedIn, website. 3,200+ followers on @ngo.aquaterra. Reels, carousels, copy, strategy. Not a school club. A real brand account.' },
  { uuid: 't-4', name: 'Collabs Team',    category: 'operations', memberCount: 25, color: '#FFC700', bio: 'School collabs, college collabs, NGO partnerships, outreach. AQ grows through peer networks. This team builds those networks.' },
  { uuid: 't-5', name: 'ROOTS',           category: 'content',    memberCount: 15, color: '#7E5BFF', bio: 'Student-run streetwear brand. Design, production, sales. Profits fund AQ welfare projects and events. The brand is real. The revenue is real.' },
  { uuid: 't-6', name: 'AQ.Ventures',     category: 'operations', memberCount: 12, color: '#3DA9FC', bio: 'Free marketing agency for student businesses. Real clients. Real briefs. Real deliverables. Members build marketing experience before college.' },
  { uuid: 't-7', name: 'ShikshAQ',        category: 'labs',       memberCount: 10, color: '#FF4D8C', bio: 'Tuition discovery platform built by AQ members for Kolkata students. Launched 2026. Product, design, content, growth. Still early. The team is small.' },
  { uuid: 't-8', name: 'Human Resources', category: 'operations', memberCount: 18, color: '#FFE94A', bio: 'Recruitment, onboarding, certificates, Letters of Recommendation. HR runs the intake pipeline for 1,100+ members.' },
]
