import api, { Achievement, PaginatedResponse } from './api'

export const achievementService = {
  /**
   * Get own achievements
   */
  async getMyAchievements(params: { page?: number; limit?: number; type?: string } = {}) {
    const response = await api.get<PaginatedResponse<Achievement>>('/achievements/me', { params })
    return response.data
  },

  /**
   * Get member achievements (public)
   */
  async getMemberAchievements(memberUuid: string, params: { page?: number; limit?: number; type?: string } = {}) {
    const response = await api.get<PaginatedResponse<Achievement>>(`/achievements/member/${memberUuid}`, { params })
    return response.data
  },

  /**
   * Create achievement
   */
  async createAchievement(data: {
    title: string
    description?: string
    achievementType: string
    achievementDate: string
    proofUrl?: string
  }) {
    const response = await api.post<{ success: boolean; data: { achievement: Achievement }; message: string }>(
      '/achievements',
      data
    )
    return response.data
  },

  /**
   * Update achievement
   */
  async updateAchievement(uuid: string, data: {
    title?: string
    description?: string
    achievementType?: string
    achievementDate?: string
    proofUrl?: string
  }) {
    const response = await api.put<{ success: boolean; data: { achievement: Achievement }; message: string }>(
      `/achievements/${uuid}`,
      data
    )
    return response.data
  },

  /**
   * Delete achievement
   */
  async deleteAchievement(uuid: string) {
    const response = await api.delete<{ success: boolean; message: string }>(`/achievements/${uuid}`)
    return response.data
  }
}

export default achievementService
