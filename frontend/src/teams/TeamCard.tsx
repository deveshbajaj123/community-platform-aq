import { Link } from 'react-router-dom'
import { Team } from '../services/teamService'
import teamService from '../services/teamService'
import { DEPT_COLORS } from '../lib/supabase'

interface TeamCardProps {
  team: Team
}

const TeamCard = ({ team }: TeamCardProps) => {
  const catColor = DEPT_COLORS[team.category] || 'var(--accent)'
  const catLabel = teamService.getCategoryLabel(team.category)
  const initials = team.name.charAt(0).toUpperCase()

  return (
    <Link to={`/teams/${team.uuid}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="team-card">
        {/* Top colour bar */}
        <div style={{ height: 3, background: catColor }} />
        <div style={{ padding: '18px 20px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, background: catColor, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              {team.logoUrl
                ? <img src={team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>{team.name}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1 }}>{catLabel}</div>
            </div>
          </div>

          {/* Description */}
          {team.description && (
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              {team.description}
            </p>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>View →</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default TeamCard
