import api, { Post, PaginatedResponse } from './api'

export interface MemberProfile {
  uuid: string
  email?: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  joinReason?: string
  bio?: string
  role: 'member' | 'director'
  status: string
  createdAt?: string
  postCount?: number
  taggedCount?: number
  schoolId?: number
  schoolUuid?: string
  schoolName?: string
  classId?: number
  classUuid?: string
  className?: string
}

export interface UpdateProfileData {
  fullName?: string
  email?: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  bio?: string
  schoolId?: number
}

export const profileService = {
  /**
   * Get own profile
   */
  async getOwnProfile() {
    const response = await api.get<{ success: boolean; data: { member: MemberProfile } }>('/profile/me')
    return response.data
  },

  /**
   * Update own profile
   */
  async updateProfile(data: UpdateProfileData) {
    const response = await api.put<{ success: boolean; data: { member: MemberProfile }; message: string }>('/profile/me', data)
    return response.data
  },

  /**
   * Get public profile by UUID
   */
  async getPublicProfile(uuid: string) {
    const response = await api.get<{ success: boolean; data: { profile: MemberProfile } }>(`/profile/${uuid}`)
    return response.data
  },

  /**
   * Get posts by member
   */
  async getMemberPosts(uuid: string, params: { page?: number; limit?: number }) {
    const response = await api.get<PaginatedResponse<Post>>(`/profile/${uuid}/posts`, { params })
    return response.data
  },

  /**
   * Get posts where member is tagged
   */
  async getTaggedPosts(uuid: string, params: { page?: number; limit?: number }) {
    const response = await api.get<PaginatedResponse<Post>>(`/profile/${uuid}/tagged`, { params })
    return response.data
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await api.post<{ success: boolean; data: { url: string } }>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }
}

export default profileService
