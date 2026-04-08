import { useState } from 'react'
import Modal from '../components/Modal'
import Input from '../components/Input'
import TextArea from '../components/TextArea'
import Button from '../components/Button'
import teamService from '../services/teamService'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateTeamModal = ({ isOpen, onClose, onSuccess }: CreateTeamModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  })

  const categories = teamService.getCategories()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Team name is required')
      return
    }

    if (!formData.category) {
      setError('Please select a category')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await teamService.createTeam({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category
      })

      if (result.success) {
        onSuccess()
        handleClose()
      } else {
        setError(result.message || 'Failed to create team')
      }
    } catch (err) {
      setError('An error occurred while creating the team')
      console.error('Create team error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      category: ''
    })
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Team" size="md" fullScreenMobile>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Team Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter team name"
          required
        />

        <TextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the team's purpose..."
          rows={3}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            required
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {teamService.getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        </div>

        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Team
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

export default CreateTeamModal
