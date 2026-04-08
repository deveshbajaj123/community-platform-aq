import api, { PaginatedResponse } from './api'

export interface Team {
  uuid: string
  name: string
  description: string
  category: string
  logoUrl?: string
  memberCount: number
  projectCount?: number
  createdAt: string
  createdBy?: number
  createdByName?: string
  createdByUuid?: string
}

export interface TeamDetails extends Team {
  members: TeamMember[]
}

export interface TeamMember {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  role: 'member' | 'lead'
  joinedAt: string
}

export interface PendingTeamPost {
  postId: number
  uuid: string
  category: string
  body: string
  createdAt: string
  authorId: number
  authorUuid: string
  authorName: string
  authorAvatar?: string
  images: { blobUrl: string; displayOrder: number }[]
}

interface GetTeamsParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

export const teamService = {
  /**
   * Get all teams (paginated)
   */
  async getTeams(params: GetTeamsParams = {}): Promise<PaginatedResponse<Team>> {
    const response = await api.get('/teams', { params })
    return response.data
  },

  /**
   * Get team by UUID with details
   */
  async getTeam(uuid: string): Promise<{ success: boolean; data: { team: TeamDetails } }> {
    const response = await api.get(`/teams/${uuid}`)
    return response.data
  },

  /**
   * Get team members
   */
  async getTeamMembers(uuid: string): Promise<{ success: boolean; data: { members: TeamMember[] } }> {
    const response = await api.get(`/teams/${uuid}/members`)
    return response.data
  },

  /**
   * Get current user's teams
   */
  async getMyTeams(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Team>> {
    const response = await api.get('/teams/my/list', { params })
    return response.data
  },

  /**
   * Create a new team (director with category assignment or super admin)
   */
  async createTeam(data: {
    name: string
    description?: string
    category: string
    logoUrl?: string
    memberIds?: { memberId: number; role?: string }[]
  }): Promise<{ success: boolean; data: { team: Team }; message: string }> {
    const response = await api.post('/teams', data)
    return response.data
  },

  /**
   * Update a team (team lead or above)
   */
  async updateTeam(uuid: string, data: {
    name?: string
    description?: string
    category?: string
    logoUrl?: string
    isActive?: boolean
  }): Promise<{ success: boolean; data: { team: Team }; message: string }> {
    const response = await api.put(`/teams/${uuid}`, data)
    return response.data
  },

  /**
   * Delete a team (director or super admin)
   */
  async deleteTeam(uuid: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/teams/${uuid}`)
    return response.data
  },

  /**
   * Add member to team (team lead or above)
   */
  async addMember(uuid: string, memberId: number, role?: string): Promise<{ success: boolean; data: { membership: TeamMember }; message: string }> {
    const response = await api.post(`/teams/${uuid}/members`, { memberId, role })
    return response.data
  },

  /**
   * Update member role (director only)
   */
  async updateMemberRole(uuid: string, memberId: number, role: string): Promise<{ success: boolean; data: { membership: TeamMember }; message: string }> {
    const response = await api.put(`/teams/${uuid}/members/${memberId}`, { role })
    return response.data
  },

  /**
   * Remove member from team
   */
  async removeMember(uuid: string, memberId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/teams/${uuid}/members/${memberId}`)
    return response.data
  },

  /**
   * Get valid categories
   */
  getCategories(): string[] {
    return ['events', 'welfare', 'content', 'operations', 'labs']
  },

  /**
   * Get valid roles
   */
  getRoles(): string[] {
    return ['member', 'lead']
  },

  /**
   * Get category display name
   */
  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      events: 'Events',
      welfare: 'Welfare',
      content: 'Content',
      operations: 'Operations',
      labs: 'Labs'
    }
    return labels[category] || category
  },

  /**
   * Get role display name
   */
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      member: 'Member',
      lead: 'Team Lead'
    }
    return labels[role] || role
  },

  /**
   * Get category color
   */
  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      events: 'bg-purple-100 text-purple-800',
      welfare: 'bg-rose-100 text-rose-800',
      content: 'bg-cyan-100 text-cyan-800',
      operations: 'bg-amber-100 text-amber-800',
      labs: 'bg-emerald-100 text-emerald-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  },

  /**
   * Get role color
   */
  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      member: 'bg-gray-100 text-gray-700',
      lead: 'bg-blue-100 text-blue-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  },

  // ============================================
  // PENDING POST MANAGEMENT (for team leads)
  // ============================================

  /**
   * Get pending posts for a team (team lead only)
   */
  async getPendingPosts(uuid: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<PendingTeamPost>> {
    const response = await api.get(`/teams/${uuid}/pending-posts`, { params })
    return response.data
  },

  /**
   * Approve a pending post (team lead only)
   */
  async approvePost(teamUuid: string, postId: number): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const response = await api.post(`/teams/${teamUuid}/pending-posts/${postId}/approve`)
    return response.data
  },

  /**
   * Reject a pending post (team lead only)
   */
  async rejectPost(teamUuid: string, postId: number, rejectionNote: string): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const response = await api.post(`/teams/${teamUuid}/pending-posts/${postId}/reject`, { rejectionNote })
    return response.data
  },

  /**
   * Create a post for a team (team members only)
   */
  async createTeamPost(teamUuid: string, data: {
    category: string
    body: string
    taggedMemberIds?: number[]
  }): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const response = await api.post(`/teams/${teamUuid}/posts`, data)
    return response.data
  }
}

export default teamService
