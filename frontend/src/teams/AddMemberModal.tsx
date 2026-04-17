import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Button from '../components/Button'
import Spinner from '../components/Spinner'
import Avatar from '../components/Avatar'
import Alert from '../components/Alert'
import teamService from '../services/teamService'
import { useDebounce } from '../hooks/useDebounce'
import api from '../services/api'

interface SearchedMember {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  role: string
}

interface SelectedMember extends SearchedMember {
  teamRole: 'member' | 'lead'
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
  const [searchResults, setSearchResults] = useState<SearchedMember[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const debouncedSearch = useDebounce(searchQuery, 300)

  const selectedMemberIds = selectedMembers.map(m => m.memberId)

  const searchMembers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const response = await api.get('/search', { params: { q: query, type: 'people', limit: 10 } })
      if (response.data.success) {
        const filtered = response.data.data.results.people.filter(
          (m: SearchedMember) =>
            !existingMemberIds.includes(m.memberId) &&
            !selectedMemberIds.includes(m.memberId)
        )
        setSearchResults(filtered)
      }
    } catch (err) {
      console.error('Failed to search members:', err)
    } finally {
      setIsSearching(false)
    }
  }, [existingMemberIds, selectedMemberIds])

  useEffect(() => {
    searchMembers(debouncedSearch)
  }, [debouncedSearch, searchMembers])

  const handleAddToSelection = (member: SearchedMember) => {
    setSelectedMembers(prev => [...prev, { ...member, teamRole: 'member' }])
    setSearchQuery('')
    setSearchResults([])
  }

  const handleRemoveFromSelection = (memberId: number) => {
    setSelectedMembers(prev => prev.filter(m => m.memberId !== memberId))
  }

  const toggleRole = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.map(m =>
        m.memberId === memberId
          ? { ...m, teamRole: m.teamRole === 'member' ? 'lead' : 'member' }
          : m
      )
    )
  }

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one member to add')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const result = await teamService.addMembersBulk(
        teamUuid,
        selectedMembers.map(m => ({ memberId: m.memberId, role: m.teamRole }))
      )

      if (result.success) {
        const { added, failed } = result.data
        if (failed.length > 0 && added.length === 0) {
          setError(`Failed to add all ${failed.length} member${failed.length !== 1 ? 's' : ''}.`)
        } else if (failed.length > 0) {
          setSuccessMsg(
            `Added ${added.length} member${added.length !== 1 ? 's' : ''}. ${failed.length} could not be added.`
          )
          onSuccess()
          setSelectedMembers([])
        } else {
          onSuccess()
          handleClose()
        }
      } else {
        setError(result.message || 'Failed to add members')
      }
    } catch (err) {
      setError('An error occurred while adding members')
      console.error('Bulk add error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedMembers([])
    setError('')
    setSuccessMsg('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Team Members" size="md" fullScreenMobile>
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert variant="success" onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {/* Search Input */}
        <div className="relative">
          <Input
            label="Search Members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email…"
          />
          {isSearching && (
            <div className="absolute right-3 top-9">
              <Spinner size="sm" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
            {searchResults.map((member) => (
              <button
                key={member.memberId}
                onClick={() => handleAddToSelection(member)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
              >
                <Avatar src={member.avatarUrl} name={member.fullName} size="sm" />
                <div className="flex-1 min-w-0">
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
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
          <p className="text-sm text-gray-500 text-center py-2">
            No members found matching "{searchQuery}"
          </p>
        )}

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected ({selectedMembers.length})
            </label>
            <div className="space-y-2">
              {selectedMembers.map(member => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-3 p-2.5 bg-forest-50 border border-forest-100 rounded-lg"
                >
                  <Avatar src={member.avatarUrl} name={member.fullName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.fullName}</p>
                  </div>
                  {/* Role toggle pill */}
                  <button
                    type="button"
                    onClick={() => toggleRole(member.memberId)}
                    title="Click to toggle role"
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      member.teamRole === 'lead'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {member.teamRole === 'lead' ? 'Team Lead' : 'Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromSelection(member.memberId)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Click role pill to toggle between Member and Team Lead</p>
          </div>
        )}

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={selectedMembers.length === 0}
          >
            Add {selectedMembers.length > 0 ? `${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}` : 'Members'}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  )
}

export default AddMemberModal
