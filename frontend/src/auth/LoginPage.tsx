import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from './AuthContext'
import Alert from '../components/Alert'
import Spinner from '../components/Spinner'

interface GoogleJwtPayload {
  sub: string // Google ID
  email: string
  name: string
  picture?: string
  email_verified: boolean
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, member, isLoading: authLoading, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/feed'

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!authLoading && isAuthenticated && member) {
      if (member.status === 'active') {
        navigate(from, { replace: true })
      } else if (member.status === 'pending_approval') {
        navigate('/pending', { replace: true })
      } else if (member.status === 'rejected') {
        navigate('/rejected', { replace: true })
      }
    }
  }, [authLoading, isAuthenticated, member, navigate, from])

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Don't render login form if already authenticated (will redirect via useEffect)
  if (isAuthenticated && member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Failed to get credentials from Google')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Decode the JWT to get user info
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential)

      const googleProfile = {
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        credential: credentialResponse.credential // Send the token for backend verification
      }

      const result = await login(googleProfile)

      if (result.success) {
        if (result.status === 'active') {
          navigate(from, { replace: true })
        } else if (result.status === 'needs_registration') {
          navigate('/register', { state: { googleProfile } })
        } else if (result.status === 'pending_approval') {
          navigate('/pending')
        } else if (result.status === 'rejected') {
          navigate('/rejected')
        }
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Failed to process Google login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-forest-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl text-white font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to AquaTerra</h1>
            <p className="text-gray-500 mt-2">Sign in to join our community</p>
          </div>

          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          {/* Google Sign In */}
          <div className="flex flex-col items-center space-y-4">
            {isLoading ? (
              <div className="py-4">
                <Spinner size="lg" />
                <p className="text-gray-500 mt-2">Signing in...</p>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                width="300"
                text="signin_with"
                shape="rectangular"
              />
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>

        {/* Info text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          New members will need director approval before accessing the community.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
