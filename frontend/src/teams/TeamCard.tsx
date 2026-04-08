import { Link } from 'react-router-dom'
import { UsersIcon, FolderIcon } from '@heroicons/react/24/outline'
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
        <Card.Body className="space-y-3">
          {/* Logo & Name */}
          <div className="flex items-center gap-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-forest-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-forest-600">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {team.name}
              </h3>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${teamService.getCategoryColor(team.category)}`}>
                {teamService.getCategoryLabel(team.category)}
              </span>
            </div>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {team.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-2">
            <div className="flex items-center gap-1">
              <UsersIcon className="w-4 h-4" />
              <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
            </div>
            {team.projectCount !== undefined && team.projectCount > 0 && (
              <div className="flex items-center gap-1">
                <FolderIcon className="w-4 h-4" />
                <span>{team.projectCount} project{team.projectCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </Link>
  )
}

export default TeamCard
