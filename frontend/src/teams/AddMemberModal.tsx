import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import Avatar from '../components/Avatar'
import teamService from '../services/teamService'
import { useDebounce } from '../hooks/useDebounce'
import api from '../services/api'

interface Member {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  role: string
}

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teamUuid: string
  existingMemberIds: number[]
}

const AddMemberModal = ({ isOpen, onClose, onSuccess, teamUuid, existingMemberIds }: AddMemberModalProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedRole, setSelectedRole] = useState<'member' | 'lead'>('member')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const debouncedSearch = useDebounce(searchQuery, 300)

  const searchMembers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await api.get('/search', { params: { q: query, type: 'people', limit: 10 } })
      if (response.data.success) {
        // Filter out existing team members
        const filtered = response.data.data.results.people.filter(
          (m: Member) => !existingMemberIds.includes(m.memberId)
        )
        setSearchResults(filtered)
      }
    } catch (err) {
      console.error('Failed to search members:', err)
    } finally {
      setIsSearching(false)
    }
  }, [existingMemberIds])

  useEffect(() => {
    searchMembers(debouncedSearch)
  }, [debouncedSearch, searchMembers])

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!selectedMember) {
      setError('Please select a member to add')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const result = await teamService.addMember(teamUuid, selectedMember.memberId, selectedRole)
      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.message || 'Failed to add member')
      }
    } catch (err) {
      setError('An error occurred while adding the member')
      console.error('Add member error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedMember(null)
    setSelectedRole('member')
    setError('')
    onClose()
  }

  const roles = teamService.getRoles()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Team Member" size="md" fullScreenMobile>
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Selected Member Display */}
        {selectedMember ? (
          <div className="flex items-center justify-between p-3 bg-forest-50 border border-forest-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar
                src={selectedMember.avatarUrl}
                name={selectedMember.fullName}
                size="sm"
              />
              <div>
                <p className="font-medium text-gray-900">{selectedMember.fullName}</p>
                <p className="text-sm text-gray-500">{selectedMember.email}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedMember(null)}
            >
              Change
            </Button>
          </div>
        ) : (
          <>
            {/* Search Input */}
            <Input
              label="Search Members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
            />

            {/* Search Results */}
            {isSearching ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {searchResults.map((member) => (
                  <button
                    key={member.memberId}
                    onClick={() => handleSelectMember(member)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <Avatar
                      src={member.avatarUrl}
                      name={member.fullName}
                      size="sm"
                    />
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{member.fullName}</p>
                      <p className="text-sm text-gray-500 truncate">{member.email}</p>
                    </div>
                    {member.role === 'director' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-forest-100 text-forest-800">
                        Director
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No members found matching "{searchQuery}"
              </p>
            ) : null}
          </>
        )}

        {/* Role Selection */}
        {selectedMember && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Team Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'member' | 'lead')}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {teamService.getRoleLabel(role)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-sm text-gray-500">
              {selectedRole === 'lead' && 'Team leads can manage team members, approve posts, and coordinate activities'}
              {selectedRole === 'member' && 'Regular team members can contribute to projects and posts'}
            </p>
          </div>
        )}

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!selectedMember}
          >
            Add Member
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  )
}

export default AddMemberModal
