import { useState, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import achievementService from '../services/achievementService'
import feedService from '../services/feedService'

interface AddAchievementModalProps {
  isOpen: boolean
  onClose: () => void
  onAchievementCreated: () => void
}

const ACHIEVEMENT_TYPES = [
  { value: 'leadership', label: '👑 Leadership' },
  { value: 'academic', label: '📚 Academic' },
  { value: 'competition', label: '🏆 Competition' },
  { value: 'personal_project', label: '💡 Personal Project' },
]

const AddAchievementModal = ({ isOpen, onClose, onAchievementCreated }: AddAchievementModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    achievementType: '',
    achievementDate: '',
    proofImage: null as File | null,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleProofImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setFormData(prev => ({ ...prev, proofImage: file }))
  }

  const removeProofImage = () => {
    setFormData(prev => ({ ...prev, proofImage: null }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.achievementType) {
      setError('Please select an achievement type')
      return
    }
    if (!formData.achievementDate) {
      setError('Date is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let proofUrl: string | undefined = undefined

      // Upload proof image if present
      if (formData.proofImage) {
        const uploadResult = await feedService.uploadImages([formData.proofImage])
        if (uploadResult.success) {
          proofUrl = uploadResult.data.images[0].url
        } else {
          throw new Error('Failed to upload proof image')
        }
      }

      // Create achievement
      const result = await achievementService.createAchievement({
        title: formData.title.trim(),
        description: formData.description.trim(),
        achievementType: formData.achievementType,
        achievementDate: formData.achievementDate,
        proofUrl,
      })

      if (result.success) {
        onAchievementCreated()
        handleClose()
      } else {
        setError(result.message || 'Failed to save achievement')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save achievement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      achievementType: '',
      achievementDate: '',
      proofImage: null,
    })
    setImagePreview(null)
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Achievement" size="lg">
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Input
          label="Achievement Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter achievement title"
          required
        />

        <TextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your achievement..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              name="achievementType"
              value={formData.achievementType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              required
            >
              <option value="">Select type</option>
              {ACHIEVEMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            name="achievementDate"
            type="date"
            value={formData.achievementDate}
            onChange={handleChange}
            required
          />
        </div>

        {/* Proof Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Proof Image (Optional)
          </label>

          {imagePreview && (
            <div className="relative mb-3">
              <img src={imagePreview} alt="Proof" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={removeProofImage}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleProofImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-forest-500 text-gray-600 hover:text-forest-600 transition-colors"
          >
            {imagePreview ? 'Change Image' : 'Upload Proof Image'}
          </button>
        </div>
      </div>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!formData.title || !formData.achievementType || !formData.achievementDate}
        >
          Save Achievement
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AddAchievementModal
