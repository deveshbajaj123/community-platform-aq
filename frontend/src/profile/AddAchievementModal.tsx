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
  { value: 'other', label: '🌟 Other' },
]

const AddAchievementModal = ({ isOpen, onClose, onAchievementCreated }: AddAchievementModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    achievementType: '',
    startDate: '',
    endDate: '',
    isPresent: false,
    proofImage: null as File | null,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePresentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, isPresent: e.target.checked, endDate: '' }))
  }

  const handleSupportingImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const removeSupportingImage = () => {
    setFormData(prev => ({ ...prev, proofImage: null }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.achievementType) {
      setError('Please select an achievement type')
      return
    }
    if (!formData.startDate) {
      setError('Start date is required')
      return
    }
    if (!formData.isPresent && !formData.endDate) {
      setError('Please set an end date or mark as ongoing')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let proofUrl: string | undefined = undefined

      if (formData.proofImage) {
        const uploadResult = await feedService.uploadImages([formData.proofImage])
        if (uploadResult.success) {
          proofUrl = uploadResult.data.images[0].url
        } else {
          throw new Error('Failed to upload supporting image')
        }
      }

      const result = await achievementService.createAchievement({
        title: formData.title.trim(),
        description: formData.description.trim(),
        achievementType: formData.achievementType,
        achievementDate: formData.startDate,
        achievementEndDate: formData.isPresent ? null : formData.endDate,
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
      startDate: '',
      endDate: '',
      isPresent: false,
      proofImage: null,
    })
    setImagePreview(null)
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Achievement" size="lg" fullScreenMobile>
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

        {/* Type */}
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

        {/* Date range */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
            />

            {formData.isPresent ? (
              <div className="flex flex-col justify-end pb-0.5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                <div className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  Present
                </div>
              </div>
            ) : (
              <Input
                label="End Date"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate || undefined}
                required={!formData.isPresent}
              />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={formData.isPresent}
              onChange={handlePresentToggle}
              className="w-4 h-4 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
            />
            <span className="text-sm text-gray-700">Currently ongoing (Present)</span>
          </label>
        </div>

        {/* Supporting Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Supporting Image <span className="text-gray-400 font-normal">(Optional)</span>
          </label>

          {imagePreview && (
            <div className="relative mb-3">
              <img src={imagePreview} alt="Supporting" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={removeSupportingImage}
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
            onChange={handleSupportingImageSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 hover:border-forest-500 text-gray-600 hover:text-forest-600 transition-colors"
          >
            {imagePreview ? 'Change Image' : 'Upload Supporting Image'}
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
          disabled={
            !formData.title ||
            !formData.achievementType ||
            !formData.startDate ||
            (!formData.isPresent && !formData.endDate)
          }
        >
          Save Achievement
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AddAchievementModal
