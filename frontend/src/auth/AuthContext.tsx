import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api, { storage, Member } from '../services/api'

interface AuthContextType {
  member: Member | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (googleProfile: GoogleProfile) => Promise<AuthResult>
  register: (data: RegisterData) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshMember: () => Promise<void>
}

interface GoogleProfile {
  googleId: string
  email: string
  name: string
  picture?: string
  credential?: string // Google ID token for backend verification
}

interface RegisterData {
  googleId: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade: string
  phone?: string
  joinReason: string
  schoolId?: number
}

interface AuthResult {
  success: boolean
  status?: string
  message?: string
  member?: Member
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize auth state from storage
  useEffect(() => {
    const initAuth = async () => {
      const token = storage.getAccessToken()
      const storedMember = storage.getMember()

      if (token) {
        try {
          const response = await api.get('/auth/me')
          if (response.data.success) {
            const memberData = response.data.data.member
            setMember(memberData)
            setIsAuthenticated(true)
            storage.setMember(memberData)
          }
        } catch (error) {
          // If API fails but we have stored member, use that temporarily
          if (storedMember) {
            setMember(storedMember)
            setIsAuthenticated(true)
          } else {
            storage.clear()
          }
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (googleProfile: GoogleProfile): Promise<AuthResult> => {
    const response = await api.post('/auth/google', googleProfile)

    if (response.data.success) {
      const { status, accessToken, refreshToken, member: memberData } = response.data.data

      if (status === 'active' && accessToken && memberData) {
        storage.setTokens(accessToken, refreshToken)
        storage.setMember(memberData)
        setMember(memberData)
        setIsAuthenticated(true)
        return { success: true, status: 'active', member: memberData }
      }

      return { success: true, status, message: response.data.data.message }
    }

    return { success: false, message: response.data.message }
  }, [])

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    const response = await api.post('/auth/register', data)

    if (response.data.success) {
      return {
        success: true,
        status: response.data.data.status,
        message: response.data.data.message
      }
    }

    return { success: false, message: response.data.message }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      storage.clear()
      setMember(null)
      setIsAuthenticated(false)
    }
  }, [])

  const refreshMember = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.success) {
        const memberData = response.data.data.member
        setMember(memberData)
        storage.setMember(memberData)
      }
    } catch (error) {
      // Ignore errors
    }
  }, [])

  const value = {
    member,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshMember,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
