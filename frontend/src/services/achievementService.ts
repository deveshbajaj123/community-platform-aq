import { supabaseCommunity } from '../lib/supabaseCommunity'
import { Achievement, PaginatedResponse } from './api'

const mapAchievementFromDB = (data: any): Achievement => ({
  achievementId: data.achievement_id,
  uuid: data.uuid,
  memberId: data.member_id,
  title: data.title,
  description: data.description,
  achievementType: data.achievement_type,
  achievementDate: data.achievement_date,
  achievementEndDate: data.achievement_end_date,
  proofUrl: data.proof_url,
  createdAt: data.created_at,
  updatedAt: data.updated_at
})

export const achievementService = {
  async getCurrentMemberId() {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!member) throw new Error('Member profile not found')
    return member.member_id
  },

  async getMyAchievements(params: { page?: number; limit?: number; type?: string } = {}) {
    const currentMemberId = await this.getCurrentMemberId()
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('external_achievements')
      .select('*', { count: 'exact' })
      .eq('member_id', currentMemberId)
      .order('achievement_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.type) {
      query = query.eq('achievement_type', params.type)
    }

    const { data, count, error } = await query
    if (error) throw error

    const mapped = (data || []).map(mapAchievementFromDB)
    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: mapped,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    } as PaginatedResponse<Achievement>
  },

  async getMemberAchievements(memberUuid: string, params: { page?: number; limit?: number; type?: string } = {}) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data: member, error: memberError } = await supabaseCommunity
      .from('members')
      .select('member_id')
      .eq('uuid', memberUuid)
      .single()

    if (memberError) throw memberError

    let query = supabaseCommunity
      .from('external_achievements')
      .select('*', { count: 'exact' })
      .eq('member_id', member.member_id)
      .order('achievement_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.type) {
      query = query.eq('achievement_type', params.type)
    }

    const { data, count, error } = await query
    if (error) throw error

    const mapped = (data || []).map(mapAchievementFromDB)
    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: mapped,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    } as PaginatedResponse<Achievement>
  },

  async createAchievement(data: {
    title: string
    description?: string
    achievementType: string
    achievementDate: string
    achievementEndDate?: string | null
    proofUrl?: string
  }) {
    const currentMemberId = await this.getCurrentMemberId()

    const { data: inserted, error } = await supabaseCommunity
      .from('external_achievements')
      .insert({
        member_id: currentMemberId,
        title: data.title,
        description: data.description,
        achievement_type: data.achievementType,
        achievement_date: data.achievementDate,
        achievement_end_date: data.achievementEndDate,
        proof_url: data.proofUrl
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Achievement created successfully',
      data: { achievement: mapAchievementFromDB(inserted) }
    }
  },

  async updateAchievement(uuid: string, data: {
    title?: string
    description?: string
    achievementType?: string
    achievementDate?: string
    achievementEndDate?: string | null
    proofUrl?: string
  }) {
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.achievementType !== undefined) updateData.achievement_type = data.achievementType
    if (data.achievementDate !== undefined) updateData.achievement_date = data.achievementDate
    if (data.achievementEndDate !== undefined) updateData.achievement_end_date = data.achievementEndDate
    if (data.proofUrl !== undefined) updateData.proof_url = data.proofUrl

    const { data: updated, error } = await supabaseCommunity
      .from('external_achievements')
      .update(updateData)
      .eq('uuid', uuid)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Achievement updated successfully',
      data: { achievement: mapAchievementFromDB(updated) }
    }
  },

  async deleteAchievement(uuid: string) {
    const { error } = await supabaseCommunity
      .from('external_achievements')
      .delete()
      .eq('uuid', uuid)

    if (error) throw error

    return {
      success: true,
      message: 'Achievement deleted successfully'
    }
  }
}

export default achievementService
