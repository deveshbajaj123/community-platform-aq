import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token storage
const TOKEN_KEY = 'aquaterra_access_token'
const REFRESH_TOKEN_KEY = 'aquaterra_refresh_token'
const MEMBER_KEY = 'aquaterra_member'

export const storage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getMember: () => {
    const member = localStorage.getItem(MEMBER_KEY)
    return member ? JSON.parse(member) : null
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  setAccessToken: (accessToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
  },
  setMember: (member: Member) => {
    localStorage.setItem(MEMBER_KEY, JSON.stringify(member))
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(MEMBER_KEY)
  },
}

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    const token = storage.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = storage.getRefreshToken()
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
            refreshToken,
          })

          if (response.data.success) {
            const { accessToken } = response.data.data
            storage.setAccessToken(accessToken)

            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        storage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Types
export interface Member {
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  role: 'member' | 'director'
  status: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  rejectionNote?: string
  isSuperAdmin?: boolean
  createdAt?: string
}

export interface Post {
  postId: number
  uuid: string
  category: string
  body: string
  linkUrl?: string
  linkTitle?: string
  linkImage?: string
  status: string
  createdAt: string
  authorId: number
  authorUuid: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  likeCount: number
  commentCount: number
  images?: { blobUrl: string; displayOrder: number }[]
  taggedMembers?: { memberId: number; uuid: string; fullName: string; avatarUrl?: string }[]
  isLiked?: boolean
  teamName?: string
  teamUuid?: string
}

export interface Achievement {
  achievementId: number
  uuid: string
  memberId: number
  title: string
  description?: string
  achievementType: 'leadership' | 'academic' | 'competition' | 'personal_project'
  achievementDate: string
  proofUrl?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface School {
  uuid: string
  name: string
  shortName?: string
  logoUrl?: string
  location?: string
  website?: string
  memberCount: number
  createdAt: string
}

export interface SchoolDetails extends School {
  recentMembers: {
    uuid: string
    fullName: string
    avatarUrl?: string
    classGrade?: string
    role: string
  }[]
  classes: {
    uuid: string
    name: string
    gradeLevel?: string
    academicYear?: string
    memberCount: number
  }[]
}

export interface SchoolMember {
  uuid: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  role: string
  bio?: string
  className?: string
  classUuid?: string
  createdAt: string
}

export default api
