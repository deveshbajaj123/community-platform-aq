import api, { Post, PaginatedResponse } from './api'

export interface DashboardStats {
  pendingMemberApprovals: number
  pendingPostReviews: number
  totalActiveMembers: number
  totalPublishedPosts: number
}

export interface PendingMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  joinReason?: string
  createdAt: string
}

export interface DirectoryMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  role: 'member' | 'director'
  status: string
  createdAt: string
  postCount?: number
}

export interface Director {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  createdAt: string
  isSuperAdmin?: boolean
  categories: string[]
}

export interface EligibleMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  createdAt: string
}

export interface CategoryAssignment {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  assignedAt: string
}

export type CategoryAssignments = Record<string, CategoryAssignment[]>

export const directorService = {
  /**
   * Get dashboard stats
   */
  async getDashboardStats() {
    const response = await api.get<{ success: boolean; data: DashboardStats }>('/director/dashboard')
    return response.data
  },

  /**
   * Get pending member approvals
   */
  async getPendingApprovals(params: { page?: number; limit?: number }) {
    const response = await api.get<PaginatedResponse<PendingMember>>('/director/approvals', { params })
    return response.data
  },

  /**
   * Approve a member
   */
  async approveMember(memberId: number) {
    const response = await api.post<{ success: boolean; data: { member: PendingMember }; message: string }>(`/director/approvals/${memberId}/approve`)
    return response.data
  },

  /**
   * Reject a member
   */
  async rejectMember(memberId: number, rejectionNote: string) {
    const response = await api.post<{ success: boolean; data: { member: PendingMember }; message: string }>(`/director/approvals/${memberId}/reject`, { rejectionNote })
    return response.data
  },

  /**
   * Get pending posts for moderation
   */
  async getPendingPosts(params: { page?: number; limit?: number }) {
    const response = await api.get<PaginatedResponse<Post>>('/director/posts', { params })
    return response.data
  },

  /**
   * Approve a post
   */
  async approvePost(postId: number) {
    const response = await api.post<{ success: boolean; data: { post: Post }; message: string }>(`/director/posts/${postId}/approve`)
    return response.data
  },

  /**
   * Reject a post
   */
  async rejectPost(postId: number, rejectionNote: string) {
    const response = await api.post<{ success: boolean; data: { post: Post }; message: string }>(`/director/posts/${postId}/reject`, { rejectionNote })
    return response.data
  },

  /**
   * Get member directory
   */
  async getMemberDirectory(params: { page?: number; limit?: number; search?: string }) {
    const response = await api.get<PaginatedResponse<DirectoryMember>>('/director/members', { params })
    return response.data
  },

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  /**
   * Get all category assignments
   */
  async getCategoryAssignments() {
    const response = await api.get<{
      success: boolean
      data: {
        categories: string[]
        assignments: CategoryAssignments
      }
    }>('/director/categories')
    return response.data
  },

  /**
   * Get current director's assigned categories
   */
  async getMyCategories() {
    const response = await api.get<{
      success: boolean
      data: {
        categories: Array<{ category: string; assignedAt: string; assignedBy: string }>
      }
    }>('/director/my-categories')
    return response.data
  },

  /**
   * Get all directors with their categories
   */
  async getAllDirectors() {
    const response = await api.get<{
      success: boolean
      data: { directors: Director[] }
    }>('/director/directors')
    return response.data
  },

  /**
   * Assign a category to a director (super-admin only)
   */
  async assignCategory(memberId: number, category: string) {
    const response = await api.post<{ success: boolean; message: string }>('/director/super-admin/categories/assign', {
      memberId,
      category
    })
    return response.data
  },

  /**
   * Remove a category assignment from a director (super-admin only)
   */
  async unassignCategory(memberId: number, category: string) {
    const response = await api.post<{ success: boolean; message: string }>('/director/super-admin/categories/unassign', {
      memberId,
      category
    })
    return response.data
  },

  /**
   * Approve a post for a specific category (multi-category support)
   */
  async approvePostCategory(postId: number, category: string) {
    const response = await api.post<{
      success: boolean
      data: {
        categoryApproved: string
        fullyApproved: boolean
        approvedCategories?: string[]
        pendingCategories?: string[]
      }
      message: string
    }>(`/director/posts/${postId}/approve`, { category })
    return response.data
  },

  // ============================================
  // SUPER-ADMIN: DIRECTOR MANAGEMENT
  // ============================================

  /**
   * Get members eligible for director promotion (super-admin only)
   */
  async getEligibleMembers(params: { page?: number; limit?: number; search?: string }) {
    const response = await api.get<PaginatedResponse<EligibleMember>>('/director/super-admin/eligible-members', { params })
    return response.data
  },

  /**
   * Promote a member to director (super-admin only)
   */
  async promoteToDirector(memberId: number) {
    const response = await api.post<{ success: boolean; data: { member: DirectoryMember }; message: string }>(
      `/director/super-admin/promote/${memberId}`
    )
    return response.data
  },

  /**
   * Demote a director to member (super-admin only)
   */
  async demoteToMember(memberId: number) {
    const response = await api.post<{ success: boolean; data: { member: DirectoryMember }; message: string }>(
      `/director/super-admin/demote/${memberId}`
    )
    return response.data
  },

  /**
   * Delete a member account (super-admin only)
   */
  async deleteMember(memberId: number) {
    const response = await api.delete<{
      success: boolean
      data: {
        deletedMember: {
          memberId: number
          email: string
          fullName: string
        }
      }
      message: string
    }>(`/director/super-admin/members/${memberId}`)
    return response.data
  }
}

export default directorService
