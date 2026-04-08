import { useState } from 'react'
import { Achievement } from '../services/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import AddAchievementModal from './AddAchievementModal'
import EditAchievementModal from './EditAchievementModal'
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import achievementService from '../services/achievementService'

interface AchievementsListProps {
  achievements: Achievement[]
  isLoading: boolean
  isOwn: boolean
  profileName: string
  onRefresh: () => void
}

const ACHIEVEMENT_TYPE_INFO = {
  leadership: { emoji: '👑', label: 'Leadership', color: 'orange' },
  academic: { emoji: '📚', label: 'Academic', color: 'forest' },
  competition: { emoji: '🏆', label: 'Competition', color: 'success' },
  personal_project: { emoji: '💡', label: 'Personal Project', color: 'info' },
}

const AchievementsList = ({ achievements, isLoading, isOwn, profileName, onRefresh }: AchievementsListProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (uuid: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return

    setDeletingId(uuid)
    try {
      await achievementService.deleteAchievement(uuid)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete achievement:', error)
      alert('Failed to delete achievement')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <>
        <Card>
          <Card.Body className="text-center py-12">
            <div className="text-6xl mb-4">🏅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No achievements yet
            </h3>
            <p className="text-gray-500 mb-4">
              {isOwn
                ? "You haven't added any achievements yet. Showcase your accomplishments!"
                : `${profileName} hasn't added any achievements yet.`}
            </p>
            {isOwn && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                Add Achievement
              </Button>
            )}
          </Card.Body>
        </Card>

        {isOwn && (
          <AddAchievementModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAchievementCreated={onRefresh}
          />
        )}
      </>
    )
  }

  return (
    <>
      {isOwn && (
        <div className="mb-4">
          <Button onClick={() => setIsAddModalOpen(true)}>
            Add Achievement
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(achievement => {
          const typeInfo = ACHIEVEMENT_TYPE_INFO[achievement.achievementType]

          return (
            <Card key={achievement.achievementId} hover>
              <Card.Body className="relative">
                {/* Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={typeInfo.color as any} size="sm">
                    {typeInfo.emoji} {typeInfo.label}
                  </Badge>

                  {isOwn && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAchievement(achievement)}
                        className="p-1 text-gray-400 hover:text-forest-600 rounded"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(achievement.uuid)}
                        disabled={deletingId === achievement.uuid}
                        className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Proof Image */}
                {achievement.proofUrl && (
                  <img
                    src={achievement.proofUrl}
                    alt={achievement.title}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}

                {/* Title & Description */}
                <h3 className="font-semibold text-gray-900 mb-1">
                  {achievement.title}
                </h3>
                {achievement.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {achievement.description}
                  </p>
                )}

                {/* Date */}
                <p className="text-xs text-gray-500">
                  {new Date(achievement.achievementDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </Card.Body>
            </Card>
          )
        })}
      </div>

      {isOwn && (
        <>
          <AddAchievementModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAchievementCreated={onRefresh}
          />
          {editingAchievement && (
            <EditAchievementModal
              isOpen={!!editingAchievement}
              onClose={() => setEditingAchievement(null)}
              achievement={editingAchievement}
              onAchievementUpdated={onRefresh}
            />
          )}
        </>
      )}
    </>
  )
}

export default AchievementsList
