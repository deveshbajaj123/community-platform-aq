import { useState, useRef } from 'react'
import { PhotoIcon, LinkIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import Button from '../components/Button'
import TextArea from '../components/TextArea'
import Input from '../components/Input'
import Alert from '../components/Alert'
import feedService, { CreatePostData } from '../services/feedService'
import { useAuth } from '../auth/AuthContext'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
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

  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirector = member?.role === 'director'

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 4) {
      setError('Maximum 4 images allowed')
      return
    }

    // Preview images
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageUrls(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    setImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageUrls(prev => prev.filter((_, i) => i !== index))
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

      const postData: CreatePostData = {
        category,
        body: body.trim(),
        imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        linkUrl: linkUrl || undefined,
      }

      const result = await feedService.createPost(postData)

      if (result.success) {
        onPostCreated()
        handleClose()
      } else {
        setError('Failed to create post')
      }
    } catch (err) {
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
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Post" size="lg">
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
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

        {/* Image Previews */}
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative">
                <img
                  src={url}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg"
                />
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

        {/* Link Input */}
        {showLinkInput && (
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
        </div>

        {/* Info for non-directors */}
        {!isDirector && (
          <p className="text-sm text-gray-500 bg-cream-100 p-3 rounded-lg">
            Your post will be reviewed by a director before appearing on the feed.
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
            disabled={!category || !body.trim()}
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
