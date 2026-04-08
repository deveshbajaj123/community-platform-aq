import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../auth/AuthContext'
import profileService from '../services/profileService'
import schoolService from '../services/schoolService'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'

interface School {
  schoolId: number
  uuid: string
  name: string
}

const EditProfilePage = () => {
  const navigate = useNavigate()
  const { refreshMember } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    classGrade: '',
    phone: '',
    avatarUrl: '',
    bio: '',
    schoolId: ''
  })
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile and schools in parallel
        const [profileResult, schoolsResult] = await Promise.all([
          profileService.getOwnProfile(),
          schoolService.getSchools({ limit: 100 })
        ])

        if (profileResult.success) {
          const { member: profile } = profileResult.data
          setFormData({
            fullName: profile.fullName || '',
            email: profile.email || '',
            classGrade: profile.classGrade || '',
            phone: profile.phone || '',
            avatarUrl: profile.avatarUrl || '',
            bio: profile.bio || '',
            schoolId: profile.schoolId?.toString() || ''
          })
        }

        if (schoolsResult.success) {
          setSchools(schoolsResult.data as unknown as School[])
        }
      } catch (error) {
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      const result = await profileService.uploadAvatar(file)
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          avatarUrl: result.data.url
        }))
      }
    } catch (err) {
      setError('Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      setIsSaving(false)
      return
    }

    try {
      const result = await profileService.updateProfile({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        classGrade: formData.classGrade.trim(),
        phone: formData.phone.trim(),
        avatarUrl: formData.avatarUrl,
        bio: formData.bio.trim(),
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : undefined
      })

      if (result.success) {
        setSuccess('Profile updated successfully')
        await refreshMember()
        setTimeout(() => {
          navigate('/profile/me')
        }, 1500)
      } else {
        setError('Failed to update profile')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/profile/me')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-cream-200 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
      </div>

      <Card>
        <Card.Body>
          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-6">
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar
                  src={formData.avatarUrl}
                  name={formData.fullName || 'User'}
                  size="xl"
                  className="w-24 h-24"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-forest-500 text-white rounded-full hover:bg-forest-600 transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Spinner size="sm" className="text-white" />
                  ) : (
                    <CameraIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Click camera to change avatar</p>
            </div>

            {/* Form Fields */}
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Your full name"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
            />

            <Input
              label="Class / Grade"
              name="classGrade"
              value={formData.classGrade}
              onChange={handleChange}
              placeholder="e.g., Grade 10, Class 11-A"
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 XXXXX XXXXX"
            />

            {/* School Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School
              </label>
              <select
                name="schoolId"
                value={formData.schoolId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition-all"
              >
                <option value="">Select your school (optional)</option>
                {schools.map(school => (
                  <option key={school.schoolId} value={school.schoolId}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bio */}
            <TextArea
              label="Bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell us about yourself, your interests, and what you're working on..."
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/profile/me')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSaving}
                className="bg-forest-500 hover:bg-forest-600 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  )
}

export default EditProfilePage
