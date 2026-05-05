import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'

interface TaggedMember {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
}

interface TaggedMembersDisplayProps {
  members: TaggedMember[]
  getProfileLink: (uuid: string) => string
  showAsHeader?: boolean
}

const TaggedMembersDisplay = ({ members, getProfileLink, showAsHeader = false }: TaggedMembersDisplayProps) => {
  const [showModal, setShowModal] = useState(false)

  if (!members || members.length === 0) return null

  const displayedAvatars = members.slice(0, showAsHeader ? 3 : 2)
  const displayedNames = members.slice(0, 3)
  const remainingCount = members.length - 3

  // Header display mode - shows tagged members prominently at the top of post card
  if (showAsHeader) {
    return (
      <>
        <div className="flex items-center gap-3">
          {/* Overlapping Avatars - larger for header */}
          <div className="flex -space-x-2">
            {displayedAvatars.map((member) => (
              <Link
                key={member.uuid}
                to={getProfileLink(member.uuid)}
                className="relative inline-block"
              >
                <Avatar
                  src={member.avatarUrl}
                  name={member.fullName}
                  size="md"
                  className="ring-2 ring-white"
                />
              </Link>
            ))}
          </div>

          {/* Names - more prominent */}
          <button
            onClick={() => setShowModal(true)}
            className="text-left hover:text-forest-600 [transition:color_120ms,transform_120ms] active:scale-[0.98]"
          >
            <div className="font-medium text-gray-900">
              {displayedNames.map((member, index) => (
                <span key={member.uuid}>
                  {member.fullName}
                  {index < displayedNames.length - 1 && ', '}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-gray-500 font-normal"> +{remainingCount} more</span>
              )}
            </div>
          </button>
        </div>

        {/* Full List Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Tagged Members"
          size="sm"
          fullScreenMobile
        >
          <div className="space-y-1 sm:max-h-80 max-h-[calc(100vh-120px)] overflow-y-auto">
            {members.map((member) => (
              <Link
                key={member.uuid}
                to={getProfileLink(member.uuid)}
                onClick={() => setShowModal(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 [transition:background-color_120ms,transform_120ms] active:scale-[0.98] min-h-[44px]"
              >
                <Avatar
                  src={member.avatarUrl}
                  name={member.fullName}
                  size="md"
                />
                <span className="font-medium text-gray-900">{member.fullName}</span>
              </Link>
            ))}
          </div>
        </Modal>
      </>
    )
  }

  // Default inline display mode
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        {/* Overlapping Avatars */}
        <div className="flex -space-x-2">
          {displayedAvatars.map((member) => (
            <Link
              key={member.uuid}
              to={getProfileLink(member.uuid)}
              className="relative inline-block"
            >
              <Avatar
                src={member.avatarUrl}
                name={member.fullName}
                size="sm"
                className="ring-2 ring-white"
              />
            </Link>
          ))}
        </div>

        {/* Names */}
        <button
          onClick={() => setShowModal(true)}
          className="text-sm text-gray-600 hover:text-forest-600 text-left [transition:color_120ms,transform_120ms] active:scale-[0.98]"
        >
          {displayedNames.map((member, index) => (
            <span key={member.uuid}>
              <span className="font-medium">{member.fullName}</span>
              {index < displayedNames.length - 1 && ', '}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-gray-500"> +{remainingCount} more</span>
          )}
        </button>
      </div>

      {/* Full List Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Tagged Members"
        size="sm"
        fullScreenMobile
      >
        <div className="space-y-1 sm:max-h-80 max-h-[calc(100vh-120px)] overflow-y-auto">
          {members.map((member) => (
            <Link
              key={member.uuid}
              to={getProfileLink(member.uuid)}
              onClick={() => setShowModal(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <Avatar
                src={member.avatarUrl}
                name={member.fullName}
                size="md"
              />
              <span className="font-medium text-gray-900">{member.fullName}</span>
            </Link>
          ))}
        </div>
      </Modal>
    </>
  )
}

export default TaggedMembersDisplay
