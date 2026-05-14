import { supabaseCommunity } from '../lib/supabaseCommunity'

export interface SearchPerson {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  classGrade?: string
  role: string
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
  async search(query: string, type: string = 'all', limit: number = 10): Promise<SearchResponse> {
    const results: SearchResults = {
      people: [],
      projects: [],
      teams: [],
      schools: []
    }
    let totalCount = 0

    if (!query) {
      return { success: true, data: { query, type, totalCount: 0, results } }
    }

    const queries = []

    if (type === 'all' || type === 'people') {
      queries.push(
        supabaseCommunity.from('members')
          .select('*')
          .ilike('full_name', `%${query}%`)
          .limit(limit)
          .then(({ data }) => {
            if (data) {
              results.people = data.map(m => ({
                memberId: m.member_id,
                uuid: m.uuid,
                fullName: m.full_name,
                avatarUrl: m.avatar_url ?? undefined,
                email: m.email,
                classGrade: m.class_grade ?? undefined,
                role: m.role
              }))
              totalCount += data.length
            }
          })
      )
    }

    if (type === 'all' || type === 'teams') {
      queries.push(
        supabaseCommunity.from('teams')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(limit)
          .then(({ data }) => {
            if (data) {
              results.teams = data.map((t: any) => ({
                uuid: t.uuid,
                name: t.name,
                description: t.description ?? '',
                category: t.category,
                logoUrl: t.logo_url ?? undefined,
                memberCount: 0
              }))
              totalCount += data.length
            }
          })
      )
    }

    await Promise.all(queries)

    return {
      success: true,
      data: {
        query,
        type,
        totalCount,
        results
      }
    }
  },

  async quickSearch(query: string, limit: number = 5): Promise<QuickSearchResponse> {
    const suggestions: QuickSearchSuggestion[] = []

    if (!query) {
      return { success: true, data: { suggestions } }
    }

    const [peopleRes, teamsRes] = await Promise.all([
      supabaseCommunity.from('members')
        .select('uuid, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(limit),
      supabaseCommunity.from('teams')
        .select('uuid, name, logo_url')
        .ilike('name', `%${query}%`)
        .limit(limit)
    ])

    if (peopleRes.data) {
      suggestions.push(...peopleRes.data.map(m => ({
        uuid: m.uuid,
        name: m.full_name,
        type: 'person' as const,
        image: m.avatar_url ?? undefined
      })))
    }

    if (teamsRes.data) {
      suggestions.push(...teamsRes.data.map(t => ({
        uuid: t.uuid,
        name: t.name,
        type: 'team' as const,
        image: t.logo_url ?? undefined
      })))
    }

    return {
      success: true,
      data: {
        suggestions: suggestions.slice(0, limit * 2)
      }
    }
  }
}

export default searchService
