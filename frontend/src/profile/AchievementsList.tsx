import { useState } from 'react'
import { Achievement } from '../services/api'
import AddAchievementModal from './AddAchievementModal'
import EditAchievementModal from './EditAchievementModal'
import achievementService from '../services/achievementService'

interface AchievementsListProps {
  achievements: Achievement[]
  isLoading: boolean
  isOwn: boolean
  profileName: string
  onRefresh: () => void
}

const ACHIEVEMENT_TYPE_INFO: Record<string, { emoji: string; label: string; color: string }> = {
  leadership:       { emoji: '👑', label: 'Leadership',      color: '#FF7A1A' },
  academic:         { emoji: '📚', label: 'Academic',        color: '#3DA9FC' },
  competition:      { emoji: '🏆', label: 'Competition',     color: '#FFC700' },
  personal_project: { emoji: '💡', label: 'Project',         color: '#7E5BFF' },
  other:            { emoji: '🌟', label: 'Other',           color: 'var(--mint)' },
}

const formatDateRange = (startDate: string, endDate?: string | null): string => {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  return `${fmt(startDate)} – ${endDate ? fmt(endDate) : 'Present'}`
}

const AchievementsList = ({ achievements, isLoading, isOwn, profileName, onRefresh }: AchievementsListProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (uuid: string) => {
    if (!confirm('Delete this achievement?')) return
    setDeletingId(uuid)
    try {
      await achievementService.deleteAchievement(uuid)
      onRefresh()
    } catch {
      alert('Failed to delete achievement')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="sk-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="v6-skeleton" style={{ height: 180, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  if (achievements.length === 0) {
    return (
      <>
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏅</div>
          <div className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>no achievements yet.</div>
          <p style={{ fontFamily: 'var(--eina)', fontSize: 14, color: 'var(--ink-3)', marginBottom: isOwn ? 20 : 0 }}>
            {isOwn
              ? "Showcase your accomplishments — competitions, projects, roles."
              : `${profileName} hasn't added any achievements yet.`}
          </p>
          {isOwn && (
            <button className="btn btn-sm btn-primary" onClick={() => setIsAddModalOpen(true)}>
              + Add achievement
            </button>
          )}
        </div>
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
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-sm btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add achievement
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {achievements.map(achievement => {
          const info = ACHIEVEMENT_TYPE_INFO[achievement.achievementType] ?? ACHIEVEMENT_TYPE_INFO.other
          const accentColor = info.color

          return (
            <div key={achievement.achievementId} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Color bar */}
              <div style={{ height: 3, background: accentColor }} />

              {/* Proof image */}
              {achievement.proofUrl && (
                <img
                  src={achievement.proofUrl}
                  alt={achievement.title}
                  style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', outline: '1px solid rgba(0,0,0,0.08)' }}
                />
              )}

              {/* Body */}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Type + actions row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: accentColor, border: `1px solid ${accentColor}`,
                    borderRadius: 999, padding: '2px 8px',
                  }}>
                    {info.emoji} {info.label}
                  </span>
                  {isOwn && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        onClick={() => setEditingAchievement(achievement)}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', borderRadius: 8, fontSize: 14 }}
                        title="Edit"
                        aria-label="Edit achievement"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(achievement.uuid)}
                        disabled={deletingId === achievement.uuid}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#e05c5c', borderRadius: 8, fontSize: 14, opacity: deletingId === achievement.uuid ? 0.5 : 1 }}
                        title="Delete"
                        aria-label="Delete achievement"
                      >
                        {deletingId === achievement.uuid ? '…' : '✕'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1.3 }}>
                  {achievement.title}
                </div>

                {/* Description */}
                {achievement.description && (
                  <p style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                    {achievement.description}
                  </p>
                )}

                {/* Date */}
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 'auto', paddingTop: 4 }}>
                  {formatDateRange(achievement.achievementDate, achievement.achievementEndDate)}
                </div>
              </div>
            </div>
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
