import { supabaseCommunity } from '../lib/supabaseCommunity'
import { PaginatedResponse } from './api'

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

export interface JoinRequest {
  requestId?: number
  uuid: string
  teamId?: number
  memberId?: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  message?: string | null
  createdAt: string
  fullName?: string
  email?: string
  avatarUrl?: string
  memberUuid?: string
}

interface GetTeamsParams {
  page?: number
  limit?: number
  category?: string
  search?: string
}

export const teamService = {
  async getCurrentMember() {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('*')
      .eq('auth_uid', session.user.id)
      .single()

    if (!member) throw new Error('Member profile not found')
    return member
  },

  async getTeams(params: GetTeamsParams = {}): Promise<PaginatedResponse<Team>> {
    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('teams')
      .select(`
        *,
        creator:members!created_by(full_name, uuid),
        team_members(count)
      `, { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.category) {
      query = query.eq('category', params.category)
    }
    if (params.search) {
      query = query.ilike('name', `%${params.search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    const mapped = (data || []).map((t: any) => ({
      uuid: t.uuid,
      name: t.name,
      description: t.description,
      category: t.category,
      logoUrl: t.logo_url,
      createdAt: t.created_at,
      createdBy: t.created_by,
      createdByName: t.creator?.full_name,
      createdByUuid: t.creator?.uuid,
      memberCount: t.team_members?.[0]?.count || 0,
      projectCount: 0
    }))

    const totalItems = count || 0
    return {
      success: true,
      data: mapped,
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

  async getTeam(uuid: string): Promise<{ success: boolean; data: { team: TeamDetails } }> {
    const { data, error } = await supabaseCommunity
      .from('teams')
      .select(`
        *,
        creator:members!created_by(full_name, uuid),
        team_members(
          role,
          joined_at,
          members(member_id, uuid, full_name, avatar_url, email)
        )
      `)
      .eq('uuid', uuid)
      .single()

    if (error) throw error

    const d = data as any
    const members: TeamMember[] = (d.team_members || []).map((tm: any) => ({
      memberId: tm.members.member_id,
      uuid: tm.members.uuid,
      fullName: tm.members.full_name,
      avatarUrl: tm.members.avatar_url ?? undefined,
      email: tm.members.email,
      role: tm.role as 'member' | 'lead',
      joinedAt: tm.joined_at
    }))

    const team: TeamDetails = {
      uuid: d.uuid,
      name: d.name,
      description: d.description ?? '',
      category: d.category,
      logoUrl: d.logo_url ?? undefined,
      createdAt: d.created_at,
      createdBy: d.created_by ?? undefined,
      createdByName: d.creator?.full_name,
      createdByUuid: d.creator?.uuid,
      memberCount: members.length,
      projectCount: 0,
      members
    }

    return { success: true, data: { team } }
  },

  async getTeamMembers(uuid: string): Promise<{ success: boolean; data: { members: TeamMember[] } }> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data, error } = await supabaseCommunity
      .from('team_members')
      .select(`
        role,
        joined_at,
        members(member_id, uuid, full_name, avatar_url, email)
      `)
      .eq('team_id', team.team_id)
      .eq('is_active', true)

    if (error) throw error

    const members: TeamMember[] = (data || []).map((tm: any) => ({
      memberId: (tm.members as any).member_id,
      uuid: (tm.members as any).uuid,
      fullName: (tm.members as any).full_name,
      avatarUrl: (tm.members as any).avatar_url ?? undefined,
      email: (tm.members as any).email,
      role: tm.role as 'member' | 'lead',
      joinedAt: tm.joined_at
    }))

    return { success: true, data: { members } }
  },

  async getMyTeams(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Team>> {
    const member = await this.getCurrentMember()
    const page = params.page || 1
    const limit = params.limit || 50
    const offset = (page - 1) * limit

    const { data: memberships, count, error } = await supabaseCommunity
      .from('team_members')
      .select(`
        teams (
          uuid, name, description, category, logo_url, created_at, created_by,
          team_members(count)
        )
      `, { count: 'exact' })
      .eq('member_id', member.member_id)
      .eq('is_active', true)
      .range(offset, offset + limit - 1)

    if (error) throw error

    const teams = (memberships || []).map((m: any) => {
      const t = m.teams
      return {
        uuid: t.uuid,
        name: t.name,
        description: t.description,
        category: t.category,
        logoUrl: t.logo_url,
        createdAt: t.created_at,
        createdBy: t.created_by,
        memberCount: t.team_members?.[0]?.count || 0,
        projectCount: 0
      } as Team
    })

    const totalItems = count || 0
    return {
      success: true,
      data: teams,
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

  async createTeam(data: {
    name: string
    description?: string
    category: string
    logoUrl?: string
    memberIds?: { memberId: number; role?: string }[]
  }): Promise<{ success: boolean; data: { team: Team }; message: string }> {
    const member = await this.getCurrentMember()

    const { data: team, error } = await supabaseCommunity
      .from('teams')
      .insert({
        name: data.name,
        description: data.description,
        category: data.category,
        logo_url: data.logoUrl,
        created_by: member.member_id
      })
      .select()
      .single()

    if (error) throw error

    if (data.memberIds && data.memberIds.length > 0) {
      const inserts = data.memberIds.map(m => ({
        team_id: team.team_id,
        member_id: m.memberId,
        role: m.role || 'member'
      }))
      await supabaseCommunity.from('team_members').insert(inserts)
    }

    const mapped: Team = {
      uuid: team.uuid,
      name: team.name,
      description: team.description ?? '',
      category: team.category,
      logoUrl: team.logo_url ?? undefined,
      createdAt: team.created_at,
      createdBy: team.created_by ?? undefined,
      memberCount: data.memberIds?.length || 0,
      projectCount: 0
    }

    return { success: true, message: 'Team created', data: { team: mapped } }
  },

  async updateTeam(uuid: string, data: {
    name?: string
    description?: string
    category?: string
    logoUrl?: string
    isActive?: boolean
  }): Promise<{ success: boolean; data: { team: Team }; message: string }> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl
    if (data.isActive !== undefined) updateData.is_active = data.isActive

    const { data: team, error } = await supabaseCommunity
      .from('teams')
      .update(updateData)
      .eq('uuid', uuid)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Team updated',
      data: {
        team: {
          uuid: team.uuid,
          name: team.name,
          description: team.description ?? '',
          category: team.category,
          logoUrl: team.logo_url ?? undefined,
          createdAt: team.created_at,
          memberCount: 0
        }
      }
    }
  },

  async deleteTeam(uuid: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabaseCommunity.from('teams').delete().eq('uuid', uuid)
    if (error) throw error
    return { success: true, message: 'Team deleted' }
  },

  async addMember(uuid: string, memberId: number, role?: string): Promise<{ success: boolean; data: { membership: TeamMember }; message: string }> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data, error } = await supabaseCommunity
      .from('team_members')
      .insert({
        team_id: team.team_id,
        member_id: memberId,
        role: role || 'member'
      })
      .select(`
        role,
        joined_at,
        members(member_id, uuid, full_name, avatar_url, email)
      `)
      .single()

    if (error) throw error

    const dm = data as any
    const membership: TeamMember = {
      memberId: dm.members.member_id,
      uuid: dm.members.uuid,
      fullName: dm.members.full_name,
      avatarUrl: dm.members.avatar_url ?? undefined,
      email: dm.members.email,
      role: dm.role as 'member' | 'lead',
      joinedAt: dm.joined_at
    }

    return { success: true, message: 'Member added', data: { membership } }
  },

  async updateMemberRole(uuid: string, memberId: number, role: string): Promise<{ success: boolean; data: { membership: TeamMember }; message: string }> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data, error } = await supabaseCommunity
      .from('team_members')
      .update({ role })
      .eq('team_id', team.team_id)
      .eq('member_id', memberId)
      .select(`
        role,
        joined_at,
        members(member_id, uuid, full_name, avatar_url, email)
      `)
      .single()

    if (error) throw error

    const du = data as any
    const membership: TeamMember = {
      memberId: du.members.member_id,
      uuid: du.members.uuid,
      fullName: du.members.full_name,
      avatarUrl: du.members.avatar_url ?? undefined,
      email: du.members.email,
      role: du.role as 'member' | 'lead',
      joinedAt: du.joined_at
    }

    return { success: true, message: 'Role updated', data: { membership } }
  },

  async removeMember(uuid: string, memberId: number): Promise<{ success: boolean; message: string }> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { error } = await supabaseCommunity
      .from('team_members')
      .delete()
      .eq('team_id', team.team_id)
      .eq('member_id', memberId)

    if (error) throw error

    return { success: true, message: 'Member removed' }
  },

  async addMembersBulk(uuid: string, members: { memberId: number; role: 'member' | 'lead' }[]): Promise<any> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const inserts = members.map(m => ({
      team_id: team.team_id,
      member_id: m.memberId,
      role: m.role
    }))

    const { error } = await supabaseCommunity.from('team_members').insert(inserts)
    if (error) throw error

    return { success: true, message: 'Members added', data: { added: members, failed: [] } }
  },

  async getPendingPosts(uuid: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<PendingTeamPost>> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    const { data, count, error } = await supabaseCommunity
      .from('post_feed_view')
      .select('*', { count: 'exact' })
      .eq('team_id', team.team_id)
      .eq('status', 'pending_review')
      .range(offset, offset + limit - 1)

    if (error) throw error

    const mapped = (data || []).map((post: any) => ({
      postId: post.post_id,
      uuid: post.uuid,
      category: post.category,
      body: post.body,
      createdAt: post.created_at,
      authorId: post.author_id,
      authorUuid: post.author_uuid,
      authorName: post.author_name,
      authorAvatar: post.author_avatar,
      images: post.images ? (post.images as any[]).map((img: any) => ({
        blobUrl: img.url,
        displayOrder: img.order
      })) : []
    }))

    const totalItems = count || 0
    return {
      success: true,
      data: mapped,
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

  async approvePost(_teamUuid: string, postId: number): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const member = await this.getCurrentMember()

    const { error } = await supabaseCommunity
      .from('posts')
      .update({
        status: 'published',
        reviewed_by: member.member_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('post_id', postId)

    if (error) throw error
    return { success: true, message: 'Post approved', data: { post: { postId } } }
  },

  async rejectPost(_teamUuid: string, postId: number, rejectionNote: string): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const member = await this.getCurrentMember()

    const { error } = await supabaseCommunity
      .from('posts')
      .update({
        status: 'rejected',
        rejection_note: rejectionNote,
        reviewed_by: member.member_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('post_id', postId)

    if (error) throw error
    return { success: true, message: 'Post rejected', data: { post: { postId } } }
  },

  async createTeamPost(teamUuid: string, data: {
    category: string
    body: string
    taggedMemberIds?: number[]
    imageUrls?: string[]
  }): Promise<{ success: boolean; data: { post: any }; message: string }> {
    const member = await this.getCurrentMember()
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', teamUuid).single()
    if (!team) throw new Error('Team not found')

    const { data: post, error } = await supabaseCommunity
      .from('posts')
      .insert({
        team_id: team.team_id,
        author_id: member.member_id,
        category: data.category,
        body: data.body,
        status: 'pending_review'
      })
      .select()
      .single()

    if (error) throw error

    if (data.imageUrls && data.imageUrls.length > 0) {
      const imgs = data.imageUrls.map((url, i) => ({
        post_id: post.post_id,
        blob_url: url,
        blob_name: url.split('/').pop() || '',
        display_order: i
      }))
      await supabaseCommunity.from('post_images').insert(imgs)
    }

    if (data.taggedMemberIds && data.taggedMemberIds.length > 0) {
      const tags = data.taggedMemberIds.map(id => ({
        post_id: post.post_id,
        tagged_member_id: id
      }))
      await supabaseCommunity.from('post_tags').insert(tags)
    }

    return { success: true, message: 'Post submitted', data: { post } }
  },

  async createJoinRequest(uuid: string, message?: string): Promise<{ success: boolean; data: { request: any }; message: string }> {
    const member = await this.getCurrentMember()
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data: request, error } = await supabaseCommunity
      .from('team_join_requests')
      .insert({
        team_id: team.team_id,
        member_id: member.member_id,
        message
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, message: 'Request sent', data: { request } }
  },

  async getJoinRequests(uuid: string): Promise<{ success: boolean; data: { requests: JoinRequest[]; total: number } }> {
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data, error } = await supabaseCommunity
      .from('team_join_requests')
      .select(`
        *,
        members(full_name, email, avatar_url, uuid)
      `)
      .eq('team_id', team.team_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error

    const requests: JoinRequest[] = (data || []).map((r: any) => ({
      requestId: r.request_id,
      uuid: r.uuid,
      teamId: r.team_id,
      memberId: r.member_id,
      status: r.status,
      message: r.message,
      createdAt: r.created_at,
      fullName: r.members?.full_name,
      email: r.members?.email,
      avatarUrl: r.members?.avatar_url,
      memberUuid: r.members?.uuid
    }))

    return { success: true, data: { requests, total: requests.length } }
  },

  async getMyJoinRequest(uuid: string): Promise<{ success: boolean; data: { request: JoinRequest | null } }> {
    const member = await this.getCurrentMember()
    const { data: team } = await supabaseCommunity.from('teams').select('team_id').eq('uuid', uuid).single()
    if (!team) throw new Error('Team not found')

    const { data, error } = await supabaseCommunity
      .from('team_join_requests')
      .select('*')
      .eq('team_id', team.team_id)
      .eq('member_id', member.member_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (error) throw error

    if (!data) return { success: true, data: { request: null } }

    const request: JoinRequest = {
      requestId: data.request_id,
      uuid: data.uuid,
      teamId: data.team_id,
      memberId: data.member_id,
      status: data.status as JoinRequest['status'],
      message: data.message,
      createdAt: data.created_at
    }

    return { success: true, data: { request } }
  },

  async approveJoinRequest(_uuid: string, requestUuid: string): Promise<{ success: boolean; data: { request: any }; message: string }> {
    const member = await this.getCurrentMember()

    const { data: req, error: reqErr } = await supabaseCommunity
      .from('team_join_requests')
      .update({ status: 'approved', reviewed_by: member.member_id, reviewed_at: new Date().toISOString() })
      .eq('uuid', requestUuid)
      .select()
      .single()

    if (reqErr) throw reqErr

    await supabaseCommunity.from('team_members').insert({
      team_id: req.team_id,
      member_id: req.member_id,
      role: 'member'
    })

    return { success: true, message: 'Approved', data: { request: req } }
  },

  async rejectJoinRequest(_uuid: string, requestUuid: string): Promise<{ success: boolean; data: { request: any }; message: string }> {
    const member = await this.getCurrentMember()

    const { data: req, error } = await supabaseCommunity
      .from('team_join_requests')
      .update({ status: 'rejected', reviewed_by: member.member_id, reviewed_at: new Date().toISOString() })
      .eq('uuid', requestUuid)
      .select()
      .single()

    if (error) throw error
    return { success: true, message: 'Rejected', data: { request: req } }
  },

  async cancelJoinRequest(_uuid: string, requestUuid: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabaseCommunity
      .from('team_join_requests')
      .update({ status: 'cancelled' })
      .eq('uuid', requestUuid)

    if (error) throw error
    return { success: true, message: 'Cancelled' }
  },

  getCategories(): string[] {
    return ['events', 'welfare', 'content', 'operations', 'labs']
  },

  getRoles(): string[] {
    return ['member', 'lead']
  },

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = { events: 'Events', welfare: 'Welfare', content: 'Content', operations: 'Operations', labs: 'Labs' }
    return labels[category] || category
  },

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = { member: 'Member', lead: 'Team Lead' }
    return labels[role] || role
  },

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

  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      member: 'bg-gray-100 text-gray-700',
      lead: 'bg-blue-100 text-blue-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }
}

export default teamService
