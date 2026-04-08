import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import TextArea from '../components/TextArea'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'
import schoolService from '../services/schoolService'

interface GoogleProfile {
  googleId: string
  email: string
  name: string
  picture?: string
}

interface School {
  schoolId: number
  uuid: string
  name: string
  shortName?: string
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useAuth()

  const googleProfile = (location.state as { googleProfile?: GoogleProfile })?.googleProfile

  const [formData, setFormData] = useState({
    fullName: googleProfile?.name || '',
    email: googleProfile?.email || '',
    classGrade: '',
    phone: '',
    joinReason: '',
    schoolId: ''
  })
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // Redirect if no Google profile
  useEffect(() => {
    if (!googleProfile) {
      setShouldRedirect(true)
    }
  }, [googleProfile])

  useEffect(() => {
    if (shouldRedirect) {
      navigate('/login', { replace: true })
    }
  }, [shouldRedirect, navigate])

  // Fetch schools on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const result = await schoolService.getSchools({ limit: 100 })
        if (result.success) {
          setSchools(result.data as unknown as School[])
        }
      } catch (err) {
        console.error('Failed to fetch schools:', err)
      }
    }
    fetchSchools()
  }, [])

  // Show loading while redirecting
  if (!googleProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!formData.fullName || !formData.classGrade || !formData.joinReason) {
      setError('Please fill in all required fields')
      setIsLoading(false)
      return
    }

    try {
      const result = await register({
        googleId: googleProfile.googleId,
        email: formData.email || googleProfile.email,
        fullName: formData.fullName,
        avatarUrl: googleProfile.picture,
        classGrade: formData.classGrade,
        phone: formData.phone,
        joinReason: formData.joinReason,
        schoolId: formData.schoolId ? parseInt(formData.schoolId) : undefined
      })

      if (result.success) {
        navigate('/pending')
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (err) {
      setError('Failed to submit registration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-500 mt-2">
              Tell us a bit about yourself to join AquaTerra
            </p>
          </div>

          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              helperText="Pre-filled from Google, but you can change it"
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

            <Input
              label="Class / Grade"
              name="classGrade"
              value={formData.classGrade}
              onChange={handleChange}
              required
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

            <TextArea
              label="Why do you want to join AquaTerra?"
              name="joinReason"
              value={formData.joinReason}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Tell us what interests you about our community and what you hope to contribute..."
            />

            <Button
              type="submit"
              loading={isLoading}
              className="w-full bg-forest-500 hover:bg-forest-600 text-white"
              size="lg"
            >
              Submit Application
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            A director will review your application and you'll be notified once approved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
