import { Link } from 'react-router-dom'
import { UsersIcon } from '@heroicons/react/24/outline'
import Card from '../components/Card'
import { Team } from '../services/teamService'
import teamService from '../services/teamService'

interface TeamCardProps {
  team: Team
}

const TeamCard = ({ team }: TeamCardProps) => {
  return (
    <Link to={`/teams/${team.uuid}`}>
      <Card hover className="h-full transition-all duration-200">
        <Card.Body className="p-3 sm:p-5">
          {/*
            Mobile  : horizontal — logo left, content right
            sm+     : vertical  — logo top, content below (original layout)
          */}
          <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-3">
            {/* Logo */}
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-forest-600">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name + Category + (mobile) member count */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate leading-tight">
                {team.name}
              </h3>
              <span className={`inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full ${teamService.getCategoryColor(team.category)}`}>
                {teamService.getCategoryLabel(team.category)}
              </span>

              {/* Member count — visible on mobile inside the row, hidden on sm+ (shown below) */}
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 sm:hidden">
                <UsersIcon className="w-3.5 h-3.5" />
                <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Description — hidden on mobile, visible on sm+ */}
          {team.description && (
            <p className="hidden sm:block text-sm text-gray-600 line-clamp-2 mt-3">
              {team.description}
            </p>
          )}

          {/* Meta row — hidden on mobile (shown inline above), visible on sm+ */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 mt-3 pt-1">
            <div className="flex items-center gap-1">
              <UsersIcon className="w-4 h-4" />
              <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Link>
  )
}

export default TeamCard
