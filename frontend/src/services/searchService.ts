import api from './api'

export interface SearchPerson {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  classGrade?: string
  role: string
  bio?: string
}

export interface SearchProject {
  uuid: string
  title: string
  description: string
  category: string
  status: string
  coverImageUrl?: string
  memberCount: number
}

export interface SearchTeam {
  uuid: string
  name: string
  description: string
  category: string
  logoUrl?: string
  memberCount: number
}

export interface SearchSchool {
  uuid: string
  name: string
  shortName?: string
  logoUrl?: string
  location?: string
  memberCount: number
}

export interface SearchResults {
  people: SearchPerson[]
  projects: SearchProject[]
  teams: SearchTeam[]
  schools: SearchSchool[]
}

export interface SearchResponse {
  success: boolean
  data: {
    query: string
    type: string
    totalCount: number
    results: SearchResults
  }
}

export interface QuickSearchSuggestion {
  uuid: string
  name: string
  type: 'person' | 'project' | 'team'
  image?: string
}

export interface QuickSearchResponse {
  success: boolean
  data: {
    suggestions: QuickSearchSuggestion[]
  }
}

export const searchService = {
  /**
   * Global search
   */
  async search(query: string, type: string = 'all', limit: number = 10): Promise<SearchResponse> {
    const response = await api.get('/search', {
      params: { q: query, type, limit }
    })
    return response.data
  },

  /**
   * Quick search for autocomplete
   */
  async quickSearch(query: string, limit: number = 5): Promise<QuickSearchResponse> {
    const response = await api.get('/search/quick', {
      params: { q: query, limit }
    })
    return response.data
  }
}

export default searchService
