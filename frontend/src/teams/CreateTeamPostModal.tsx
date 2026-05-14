import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import TextArea from '../components/TextArea'
import Button from '../components/Button'
import Avatar from '../components/Avatar'
import Input from '../components/Input'
import teamService, { TeamMember } from '../services/teamService'
import { categories } from '../feed/CategoryFilter'

interface CreateTeamPostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teamUuid: string
  teamName: string
  teamCategory: string
  members: TeamMember[]
}

const CreateTeamPostModal = ({
  isOpen,
  onClose,
  onSuccess,
  teamUuid,
  teamName,
  teamCategory,
  members
}: CreateTeamPostModalProps) => {
  const [category, setCategory] = useState(teamCategory)
  const [body, setBody] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members
    const query = memberSearch.toLowerCase()
    return members.filter(m =>
      m.fullName.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query)
    )
  }, [members, memberSearch])

  const allSelected = members.length > 0 && selectedMemberIds.length === members.length

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedMemberIds([])
    } else {
      setSelectedMemberIds(members.map(m => m.memberId))
    }
  }

  const handleToggleMember = (memberId: number) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const handleSubmit = async () => {
    if (!body.trim()) {
      setError('Please enter a post body')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const result = await teamService.createTeamPost(teamUuid, {
        category,
        body: body.trim(),
        taggedMemberIds: selectedMemberIds
      })

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.message || 'Failed to create post')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while creating the post')
      console.error('Create team post error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setBody('')
    setCategory(teamCategory)
    setSelectedMemberIds([])
    setMemberSearch('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Create Post for ${teamName}`} size="lg" fullScreenMobile>
      <div className="flex flex-col">
        {/* Scrollable Content */}
        <div className="space-y-4 sm:max-h-[60vh] max-h-[calc(100vh-280px)] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Post Body */}
          <TextArea
            label="Post Content"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post..."
            rows={4}
            required
          />

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Tag Members ({selectedMemberIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-forest-600 hover:text-forest-700 font-medium"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Member Search */}
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="mb-2"
            />

            {/* Member List */}
            <div className="sm:max-h-48 max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {memberSearch ? 'No members found' : 'No team members'}
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <label
                    key={member.memberId}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 min-h-[48px]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.memberId)}
                      onChange={() => handleToggleMember(member.memberId)}
                      className="h-5 w-5 text-forest-600 border-gray-300 rounded focus:ring-forest-500"
                    />
                    <Avatar
                      src={member.avatarUrl}
                      name={member.fullName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{member.fullName}</p>
                      <p className="text-sm text-gray-500 truncate sm:block hidden">{member.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${teamService.getRoleColor(member.role)} sm:block hidden`}>
                      {teamService.getRoleLabel(member.role)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer - Outside scrollable area */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 mt-4">
          <Button type="button" variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!body.trim()}
            className="w-full sm:w-auto"
          >
            Create Post
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateTeamPostModal
