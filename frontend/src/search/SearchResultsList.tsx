import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserIcon, FolderIcon, UsersIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { SearchResults } from '../services/searchService'
import Card from '../components/Card'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'

interface SearchResultsListProps {
  results: SearchResults
  activeFilter: string
}

const cardMotion = (i: number) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96 },
  transition: {
    delay: i * 0.04,
    type: 'spring' as const,
    stiffness: 150,
    damping: 24,
  },
})

const SearchResultsList = ({ results, activeFilter }: SearchResultsListProps) => {
  const showPeople = activeFilter === 'all' || activeFilter === 'people'
  const showProjects = activeFilter === 'all' || activeFilter === 'projects'
  const showTeams = activeFilter === 'all' || activeFilter === 'teams'
  const showSchools = activeFilter === 'all' || activeFilter === 'schools'

  // Global index for cross-section stagger
  let globalIndex = 0

  return (
    <div className="space-y-8">
      {/* People Results */}
      {showPeople && results.people.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="w-6 h-6" />
            People
            <span className="text-sm font-normal text-gray-500">({results.people.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.people.map(person => {
              const idx = globalIndex++
              return (
                <motion.div key={person.uuid} {...cardMotion(idx)}>
                  <Link to={`/profile/${person.uuid}`}>
                    <Card hover>
                      <Card.Body>
                        <div className="flex items-center gap-4">
                          <Avatar src={person.avatarUrl} name={person.fullName} size="lg" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{person.fullName}</h3>
                            <p className="text-sm text-gray-600 truncate">{person.email}</p>
                            {person.classGrade && (
                              <p className="text-sm text-gray-500 mt-0.5">{person.classGrade}</p>
                            )}
                          </div>
                          {person.role === 'director' && (
                            <Badge variant="forest" size="sm">Director</Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Projects Results */}
      {showProjects && results.projects.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FolderIcon className="w-6 h-6" />
            Projects
            <span className="text-sm font-normal text-gray-500">({results.projects.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.projects.map(project => {
              const idx = globalIndex++
              return (
                <motion.div key={project.uuid} {...cardMotion(idx)}>
                  <Link to={`/projects/${project.uuid}`}>
                    <Card hover>
                      <Card.Body>
                        {project.coverImageUrl && (
                          <img
                            src={project.coverImageUrl}
                            alt={project.title}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="forest" size="sm">{project.category}</Badge>
                          <Badge size="sm">{project.status}</Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{project.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
                        </p>
                      </Card.Body>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Teams Results */}
      {showTeams && results.teams.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon className="w-6 h-6" />
            Teams
            <span className="text-sm font-normal text-gray-500">({results.teams.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.teams.map(team => {
              const idx = globalIndex++
              return (
                <motion.div key={team.uuid} {...cardMotion(idx)}>
                  <Link to={`/teams/${team.uuid}`}>
                    <Card hover>
                      <Card.Body>
                        <div className="flex items-start gap-4">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-16 h-16 rounded-lg object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-forest-100 flex items-center justify-center">
                              <span className="text-2xl font-bold text-forest-600">
                                {team.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Badge variant="forest" size="sm" className="mb-1">{team.category}</Badge>
                            <h3 className="font-semibold text-gray-900">{team.name}</h3>
                            {team.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mt-1">{team.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schools Results */}
      {showSchools && results.schools.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AcademicCapIcon className="w-6 h-6" />
            Schools
            <span className="text-sm font-normal text-gray-500">({results.schools.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.schools.map(school => {
              const idx = globalIndex++
              return (
                <motion.div key={school.uuid} {...cardMotion(idx)}>
                  <Link to={`/schools/${school.uuid}`}>
                    <Card hover>
                      <Card.Body>
                        <div className="flex items-center gap-4">
                          {school.logoUrl ? (
                            <img src={school.logoUrl} alt={school.name} className="w-16 h-16 rounded-lg object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                              <AcademicCapIcon className="w-8 h-8 text-blue-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">{school.name}</h3>
                            {school.shortName && (
                              <p className="text-sm text-gray-600">{school.shortName}</p>
                            )}
                            {school.location && (
                              <p className="text-sm text-gray-500 mt-0.5">{school.location}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {school.memberCount} member{school.memberCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchResultsList
