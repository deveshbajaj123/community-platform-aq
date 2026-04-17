import { useState, useEffect, useRef, useCallback } from 'react'
import { PhotoIcon, LinkIcon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import Button from '../components/Button'
import TextArea from '../components/TextArea'
import Input from '../components/Input'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import Spinner from '../components/Spinner'
import feedService, { CreatePostData } from '../services/feedService'
import teamService, { Team, TeamMember } from '../services/teamService'
import { useAuth } from '../auth/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import api from '../services/api'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

interface SearchedMember {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  role: string
}

const CATEGORIES = [
  { value: 'events', label: 'Events', emoji: '🎪' },
  { value: 'welfare', label: 'Welfare', emoji: '💚' },
  { value: 'content', label: 'Content', emoji: '📝' },
  { value: 'operations', label: 'Operations', emoji: '⚙️' },
  { value: 'labs', label: 'Labs', emoji: '🔬' },
]

const CreatePostModal = ({ isOpen, onClose, onPostCreated }: CreatePostModalProps) => {
  const { member } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Core post state
  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Team selector state
  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [selectedTeamUuid, setSelectedTeamUuid] = useState<string>('')
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([])
  const [teamMembersLoading, setTeamMembersLoading] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])

  // Tag people (non-team) state
  const [tagQuery, setTagQuery] = useState('')
  const [tagResults, setTagResults] = useState<SearchedMember[]>([])
  const [tagSearching, setTagSearching] = useState(false)
  const [taggedPeople, setTaggedPeople] = useState<SearchedMember[]>([])

  const debouncedTagQuery = useDebounce(tagQuery, 300)
  const isDirector = member?.role === 'director'

  // Load user's teams when modal opens
  useEffect(() => {
    if (!isOpen) return
    setTeamsLoading(true)
    teamService.getMyTeams({ limit: 50 })
      .then(result => {
        if (result.success) {
          setMyTeams(result.data)
        }
      })
      .catch(() => {})
      .finally(() => setTeamsLoading(false))
  }, [isOpen])

  // Load team members when a team is selected
  useEffect(() => {
    if (!selectedTeamUuid) {
      setSelectedTeamMembers([])
      setSelectedMemberIds([])
      return
    }
    setTeamMembersLoading(true)
    teamService.getTeam(selectedTeamUuid)
      .then(result => {
        if (result.success) {
          // Exclude current user from the taggable list
          const others = result.data.team.members.filter(m => m.uuid !== member?.uuid)
          setSelectedTeamMembers(others)
        }
      })
      .catch(() => {})
      .finally(() => setTeamMembersLoading(false))
  }, [selectedTeamUuid, member?.uuid])

  // Search members for non-team tagging
  const searchPeople = useCallback(async (query: string) => {
    if (query.length < 2) {
      setTagResults([])
      return
    }
    setTagSearching(true)
    try {
      const response = await api.get('/search', { params: { q: query, type: 'people', limit: 10 } })
      if (response.data.success) {
        const alreadyTaggedIds = taggedPeople.map(p => p.memberId)
        const filtered = response.data.data.results.people.filter(
          (m: SearchedMember) => !alreadyTaggedIds.includes(m.memberId) && m.uuid !== member?.uuid
        )
        setTagResults(filtered)
      }
    } catch {
      // silently ignore
    } finally {
      setTagSearching(false)
    }
  }, [taggedPeople, member?.uuid])

  useEffect(() => {
    if (!selectedTeamUuid) {
      searchPeople(debouncedTagQuery)
    }
  }, [debouncedTagQuery, selectedTeamUuid, searchPeople])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 4) {
      setError('Maximum 4 images allowed')
      return
    }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (evt) => {
        setImageUrls(prev => [...prev, evt.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    setImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const toggleTeamMember = (memberId: number) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    )
  }

  const addTaggedPerson = (person: SearchedMember) => {
    setTaggedPeople(prev => [...prev, person])
    setTagQuery('')
    setTagResults([])
  }

  const removeTaggedPerson = (memberId: number) => {
    setTaggedPeople(prev => prev.filter(p => p.memberId !== memberId))
  }

  const handleSubmit = async () => {
    if (!category) {
      setError('Please select a category')
      return
    }
    if (!body.trim()) {
      setError('Please write something')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Upload images first if any
      let uploadedImageUrls: string[] = []
      if (images.length > 0) {
        const uploadResult = await feedService.uploadImages(images)
        if (uploadResult.success) {
          uploadedImageUrls = uploadResult.data.images.map(img => img.url)
        }
      }

      if (selectedTeamUuid) {
        // Post through a team
        const result = await teamService.createTeamPost(selectedTeamUuid, {
          category,
          body: body.trim(),
          taggedMemberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        })
        if (result.success) {
          onPostCreated()
          handleClose()
        } else {
          setError('Failed to create post')
        }
      } else {
        // Regular post with optional tagged people
        const postData: CreatePostData = {
          category,
          body: body.trim(),
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
          linkUrl: linkUrl || undefined,
          taggedMemberIds: taggedPeople.length > 0 ? taggedPeople.map(p => p.memberId) : undefined,
        }
        const result = await feedService.createPost(postData)
        if (result.success) {
          onPostCreated()
          handleClose()
        } else {
          setError('Failed to create post')
        }
      }
    } catch {
      setError('Failed to create post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setCategory('')
    setBody('')
    setLinkUrl('')
    setShowLinkInput(false)
    setImages([])
    setImageUrls([])
    setError(null)
    setSelectedTeamUuid('')
    setSelectedTeamMembers([])
    setSelectedMemberIds([])
    setTagQuery('')
    setTagResults([])
    setTaggedPeople([])
    onClose()
  }

  const selectedTeam = myTeams.find(t => t.uuid === selectedTeamUuid) || null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Post" size="lg">
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Team Selector — only shown if user is in at least one team */}
        {myTeams.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Post Through Team <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {teamsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Spinner size="sm" /> Loading teams…
              </div>
            ) : (
              <select
                value={selectedTeamUuid}
                onChange={e => {
                  setSelectedTeamUuid(e.target.value)
                  setSelectedMemberIds([])
                  setTaggedPeople([])
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              >
                <option value="">— No team (general post) —</option>
                {myTeams.map(t => (
                  <option key={t.uuid} value={t.uuid}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          {selectedTeam ? (
            /* When a team is selected, lock category to team's category */
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-forest-500 text-white">
                {CATEGORIES.find(c => c.value === selectedTeam.category)?.emoji}{' '}
                {CATEGORIES.find(c => c.value === selectedTeam.category)?.label || selectedTeam.category}
              </span>
              <span className="text-xs text-gray-500 self-center">Team category</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                    transition-all duration-200
                    ${category === cat.value
                      ? 'bg-forest-500 text-white'
                      : 'bg-cream-200 text-gray-600 hover:bg-cream-300'
                    }
                  `}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Post Body */}
        <TextArea
          label="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Share your thoughts, ideas, or updates with the community..."
          required
        />

        {/* Team Member Tagging — shown when a team is selected */}
        {selectedTeamUuid && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tag Team Members <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {teamMembersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Spinner size="sm" /> Loading members…
              </div>
            ) : selectedTeamMembers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No other members in this team.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {selectedTeamMembers.map(m => (
                  <label
                    key={m.memberId}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(m.memberId)}
                      onChange={() => toggleTeamMember(m.memberId)}
                      className="w-4 h-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
                    />
                    <Avatar src={m.avatarUrl} name={m.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.fullName}</p>
                    </div>
                    {m.role === 'lead' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Lead</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {selectedMemberIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} tagged
              </p>
            )}
          </div>
        )}

        {/* Tag People — shown when NO team is selected */}
        {!selectedTeamUuid && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tag People <span className="text-gray-400 font-normal">(Optional)</span>
            </label>

            {/* Tagged chips */}
            {taggedPeople.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {taggedPeople.map(p => (
                  <span
                    key={p.memberId}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-forest-50 border border-forest-200 rounded-full text-sm text-forest-800"
                  >
                    <Avatar src={p.avatarUrl} name={p.fullName} size="sm" />
                    {p.fullName}
                    <button
                      type="button"
                      onClick={() => removeTaggedPerson(p.memberId)}
                      className="ml-0.5 text-forest-500 hover:text-red-500"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                value={tagQuery}
                onChange={e => setTagQuery(e.target.value)}
                placeholder="Search members to tag…"
              />
              {tagSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            {tagResults.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg shadow-sm">
                {tagResults.map(m => (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => addTaggedPerson(m)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0"
                  >
                    <Avatar src={m.avatarUrl} name={m.fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{m.email}</p>
                    </div>
                    <UserPlusIcon className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
            {tagQuery.length >= 2 && tagResults.length === 0 && !tagSearching && (
              <p className="text-sm text-gray-400 mt-1 pl-1">No members found</p>
            )}
          </div>
        )}

        {/* Image Previews */}
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Link Input — only for non-team posts */}
        {!selectedTeamUuid && showLinkInput && (
          <Input
            label="Link URL"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-cream-200 disabled:opacity-50 transition-colors"
          >
            <PhotoIcon className="w-5 h-5" />
            <span className="text-sm">Photo</span>
          </button>
          {!selectedTeamUuid && (
            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                showLinkInput ? 'bg-forest-100 text-forest-600' : 'text-gray-600 hover:bg-cream-200'
              }`}
            >
              <LinkIcon className="w-5 h-5" />
              <span className="text-sm">Link</span>
            </button>
          )}
        </div>

        {/* Info for non-directors */}
        {!isDirector && (
          <p className="text-sm text-gray-500 bg-cream-100 p-3 rounded-lg">
            {selectedTeamUuid
              ? 'Team leads will review your post before it appears on the feed.'
              : 'Your post will be reviewed by a director before appearing on the feed.'
            }
          </p>
        )}

        {/* Submit */}
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!body.trim() || (!selectedTeamUuid && !category) || (!!selectedTeamUuid && !selectedTeam?.category)}
            className="bg-forest-500 hover:bg-forest-600 text-white"
          >
            {isDirector ? 'Post' : 'Submit for Review'}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  )
}

export default CreatePostModal
