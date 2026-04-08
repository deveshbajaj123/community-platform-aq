import api, { School, SchoolDetails, SchoolMember, PaginatedResponse } from './api'

interface GetSchoolsParams {
  page?: number
  limit?: number
  search?: string
}

interface GetSchoolMembersParams {
  page?: number
  limit?: number
}

export const schoolService = {
  /**
   * Get all schools (paginated)
   */
  async getSchools(params: GetSchoolsParams = {}): Promise<PaginatedResponse<School>> {
    const { page = 1, limit = 50, search = '' } = params
    const response = await api.get('/schools', {
      params: { page, limit, search }
    })
    return response.data
  },

  /**
   * Get school by UUID with details (members, classes)
   */
  async getSchool(uuid: string): Promise<{ success: boolean; data: { school: SchoolDetails } }> {
    const response = await api.get(`/schools/${uuid}`)
    return response.data
  },

  /**
   * Get members from a school (paginated)
   */
  async getSchoolMembers(uuid: string, params: GetSchoolMembersParams = {}): Promise<PaginatedResponse<SchoolMember>> {
    const { page = 1, limit = 20 } = params
    const response = await api.get(`/schools/${uuid}/members`, {
      params: { page, limit }
    })
    return response.data
  },

  /**
   * Search schools for dropdown/autocomplete
   */
  async searchSchools(query: string, limit = 10): Promise<{ success: boolean; data: { schools: Pick<School, 'uuid' | 'name' | 'shortName' | 'logoUrl'>[] } }> {
    const response = await api.get('/schools/search', {
      params: { q: query, limit }
    })
    return response.data
  },

  /**
   * Create a new school (director only)
   */
  async createSchool(data: {
    name: string
    shortName?: string
    logoUrl?: string
    location?: string
    website?: string
  }): Promise<{ success: boolean; data: { school: School }; message: string }> {
    const response = await api.post('/schools', data)
    return response.data
  },

  /**
   * Update a school (director only)
   */
  async updateSchool(uuid: string, data: {
    name?: string
    shortName?: string
    logoUrl?: string
    location?: string
    website?: string
  }): Promise<{ success: boolean; data: { school: School }; message: string }> {
    const response = await api.put(`/schools/${uuid}`, data)
    return response.data
  }
}

export default schoolService
