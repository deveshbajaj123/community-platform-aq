import api, { Post, PaginatedResponse } from './api'

export interface CreatePostData {
  category: string
  body: string
  linkUrl?: string
  linkTitle?: string
  linkImage?: string
  imageUrls?: string[]
  taggedMemberIds?: number[]
}

export const feedService = {
  /**
   * Get feed posts
   */
  async getFeed(params: { page?: number; limit?: number; category?: string }) {
    const response = await api.get<PaginatedResponse<Post>>('/feed', { params })
    return response.data
  },

  /**
   * Get single post
   */
  async getPost(uuid: string) {
    const response = await api.get<{ success: boolean; data: { post: Post } }>(`/feed/${uuid}`)
    return response.data
  },

  /**
   * Create post
   */
  async createPost(data: CreatePostData) {
    const response = await api.post<{ success: boolean; data: { post: Post }; message: string }>('/feed', data)
    return response.data
  },

  /**
   * Toggle like on post
   */
  async toggleLike(uuid: string) {
    const response = await api.post<{ success: boolean; data: { liked: boolean; likeCount: number } }>(`/feed/${uuid}/like`)
    return response.data
  },

  /**
   * Get list of members who liked a post (PUBLIC)
   */
  async getLikers(uuid: string, params: { page?: number; limit?: number } = {}) {
    const response = await api.get<PaginatedResponse<{
      memberId: number
      uuid: string
      fullName: string
      avatarUrl?: string
      classGrade?: string
      role: 'member' | 'director'
      likedAt: string
    }>>(`/feed/${uuid}/likers`, { params })
    return response.data
  },

  /**
   * Delete post
   */
  async deletePost(uuid: string) {
    const response = await api.delete<{ success: boolean; message: string }>(`/feed/${uuid}`)
    return response.data
  },

  /**
   * Search members for @mention
   */
  async searchMembers(query: string) {
    const response = await api.get<{ success: boolean; data: { members: { member_id: number; uuid: string; full_name: string; avatar_url?: string }[] } }>('/feed/members/search', { params: { q: query } })
    return response.data
  },

  /**
   * Upload images
   */
  async uploadImages(files: File[]) {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))

    const response = await api.post<{ success: boolean; data: { images: { url: string; name: string; size: number }[] } }>('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }
}

export default feedService
