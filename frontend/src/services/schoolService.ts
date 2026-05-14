import { supabaseCommunity } from '../lib/supabaseCommunity'
import { School, SchoolDetails, SchoolMember, PaginatedResponse } from './api'

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
  async getSchools(params: GetSchoolsParams = {}): Promise<PaginatedResponse<School>> {
    const { page = 1, limit = 50, search = '' } = params
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('schools')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    const schools: School[] = (data || []).map((s: any) => ({
      uuid: s.uuid,
      name: s.name,
      shortName: s.short_name ?? undefined,
      logoUrl: s.logo_url ?? undefined,
      location: s.location ?? undefined,
      website: s.website ?? undefined,
      memberCount: 0,
      createdAt: s.created_at
    }))

    const totalItems = count || 0
    return {
      success: true,
      data: schools,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalItems / limit),
        hasPrevPage: page > 1
      }
    }
  },

  async getSchool(uuid: string): Promise<{ success: boolean; data: { school: SchoolDetails } }> {
    const { data, error } = await supabaseCommunity
      .from('schools')
      .select('*')
      .eq('uuid', uuid)
      .single()

    if (error) throw error

    const d = data as any
    const schoolDetails: SchoolDetails = {
      uuid: d.uuid,
      name: d.name,
      shortName: d.short_name ?? undefined,
      logoUrl: d.logo_url ?? undefined,
      location: d.location ?? undefined,
      website: d.website ?? undefined,
      createdAt: d.created_at,
      memberCount: 0,
      recentMembers: [],
      classes: []
    }

    return { success: true, data: { school: schoolDetails } }
  },

  async getSchoolMembers(_uuid: string, params: GetSchoolMembersParams = {}): Promise<PaginatedResponse<SchoolMember>> {
    const { page = 1, limit = 20 } = params

    const members: SchoolMember[] = []
    const count = 0

    const totalItems = count || 0
    return {
      success: true,
      data: members,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalItems / limit),
        hasPrevPage: page > 1
      }
    }
  },

  async searchSchools(query: string, limit = 10): Promise<{ success: boolean; data: { schools: Pick<School, 'uuid' | 'name' | 'shortName' | 'logoUrl'>[] } }> {
    const { data, error } = await supabaseCommunity
      .from('schools')
      .select('uuid, name, short_name, logo_url')
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: {
        schools: data.map((s: any) => ({
          uuid: s.uuid,
          name: s.name,
          shortName: s.short_name,
          logoUrl: s.logo_url
        }))
      }
    }
  },

  async createSchool(data: {
    name: string
    shortName?: string
    logoUrl?: string
    location?: string
    website?: string
  }): Promise<{ success: boolean; data: { school: School }; message: string }> {
    const { data: school, error } = await supabaseCommunity
      .from('schools')
      .insert({
        name: data.name,
        short_name: data.shortName,
        logo_url: data.logoUrl,
        location: data.location,
        website: data.website
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'School created',
      data: {
        school: {
          uuid: school.uuid,
          name: school.name,
          shortName: school.short_name ?? undefined,
          logoUrl: school.logo_url ?? undefined,
          location: school.location ?? undefined,
          website: school.website ?? undefined,
          createdAt: school.created_at,
          memberCount: 0
        }
      }
    }
  },

  async updateSchool(uuid: string, data: {
    name?: string
    shortName?: string
    logoUrl?: string
    location?: string
    website?: string
  }): Promise<{ success: boolean; data: { school: School }; message: string }> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.shortName !== undefined) updateData.short_name = data.shortName
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl
    if (data.location !== undefined) updateData.location = data.location
    if (data.website !== undefined) updateData.website = data.website

    const { data: school, error } = await supabaseCommunity
      .from('schools')
      .update(updateData)
      .eq('uuid', uuid)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'School updated',
      data: {
        school: {
          uuid: school.uuid,
          name: school.name,
          shortName: school.short_name ?? undefined,
          logoUrl: school.logo_url ?? undefined,
          location: school.location ?? undefined,
          website: school.website ?? undefined,
          createdAt: school.created_at,
          memberCount: 0
        }
      }
    }
  }
}

export default schoolService
