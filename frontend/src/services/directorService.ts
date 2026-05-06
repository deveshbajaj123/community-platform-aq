import { supabaseCommunity } from '../lib/supabaseCommunity'
import { Post, PaginatedResponse } from './api'
import {
  DashboardStats,
  PendingMember,
  DirectoryMember,
  EligibleMember,
  CategoryAssignments,
} from './directorServiceTypes'

export * from './directorServiceTypes'

export const directorService = {
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

  async getDashboardStats() {
    const { count: pendingMembers } = await supabaseCommunity
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval')

    const { count: pendingPosts } = await supabaseCommunity
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review')

    const { count: activeMembers } = await supabaseCommunity
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: publishedPosts } = await supabaseCommunity
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')

    return {
      success: true,
      data: {
        pendingMemberApprovals: pendingMembers || 0,
        pendingPostReviews: pendingPosts || 0,
        totalActiveMembers: activeMembers || 0,
        totalPublishedPosts: publishedPosts || 0
      } as DashboardStats
    }
  },

  async getPendingApprovals(params: { page?: number; limit?: number }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data, count, error } = await supabaseCommunity
      .from('pending_member_approvals')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const mapped = (data || []).map(m => ({
      memberId: m.member_id,
      uuid: m.uuid,
      email: m.email,
      fullName: m.full_name,
      classGrade: m.class_grade,
      phone: m.phone,
      joinReason: m.join_reason,
      createdAt: m.created_at
    }))

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
    } as PaginatedResponse<PendingMember>
  },

  async approveMember(memberId: number) {
    const currentMemberId = await this.getCurrentMemberId()

    const { data, error } = await supabaseCommunity
      .from('members')
      .update({
        status: 'active',
        approved_by: currentMemberId,
        approved_at: new Date().toISOString()
      })
      .eq('member_id', memberId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Member approved successfully',
      data: {
        member: {
          memberId: data.member_id,
          uuid: data.uuid,
          email: data.email,
          fullName: data.full_name,
          classGrade: data.class_grade,
          createdAt: data.created_at
        } as PendingMember
      }
    }
  },

  async rejectMember(memberId: number, rejectionNote: string) {
    const { data, error } = await supabaseCommunity
      .from('members')
      .update({
        status: 'rejected',
        rejection_note: rejectionNote
      })
      .eq('member_id', memberId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Member rejected successfully',
      data: {
        member: {
          memberId: data.member_id,
          uuid: data.uuid,
          email: data.email,
          fullName: data.full_name,
          classGrade: data.class_grade,
          createdAt: data.created_at
        } as PendingMember
      }
    }
  },

  async getPendingPosts(params: { page?: number; limit?: number }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data, count, error } = await supabaseCommunity
      .from('post_feed_view')
      .select('*', { count: 'exact' })
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const mappedPosts = (data || []).map((post: any) => ({
      postId: post.post_id,
      uuid: post.uuid,
      category: post.category,
      body: post.body,
      linkUrl: post.link_url,
      linkTitle: post.link_title,
      linkImage: post.link_image,
      status: post.status,
      createdAt: post.created_at,
      authorId: post.author_id,
      authorUuid: post.author_uuid,
      authorName: post.author_name,
      authorAvatar: post.author_avatar,
      authorRole: post.author_role,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      images: post.images ? (post.images as any[]).map((img: any) => ({
        blobUrl: img.url,
        displayOrder: img.order
      })) : [],
      taggedMembers: post.tagged_members ? (post.tagged_members as any[]).map((member: any) => ({
        memberId: member.id,
        uuid: member.uuid,
        fullName: member.name
      })) : []
    } as Post))

    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: mappedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    } as PaginatedResponse<Post>
  },

  async approvePost(postId: number) {
    const currentMemberId = await this.getCurrentMemberId()

    const { data, error } = await supabaseCommunity
      .from('posts')
      .update({
        status: 'published',
        reviewed_by: currentMemberId,
        reviewed_at: new Date().toISOString()
      })
      .eq('post_id', postId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Post approved successfully',
      data: { post: { postId: data.post_id } as Post }
    }
  },

  async rejectPost(postId: number, rejectionNote: string) {
    const currentMemberId = await this.getCurrentMemberId()

    const { data, error } = await supabaseCommunity
      .from('posts')
      .update({
        status: 'rejected',
        rejection_note: rejectionNote,
        reviewed_by: currentMemberId,
        reviewed_at: new Date().toISOString()
      })
      .eq('post_id', postId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Post rejected successfully',
      data: { post: { postId: data.post_id } as Post }
    }
  },

  async getMemberDirectory(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.search) {
      query = query.ilike('full_name', `%${params.search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    const mapped = (data || []).map(m => ({
      memberId: m.member_id,
      uuid: m.uuid,
      email: m.email,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      classGrade: m.class_grade,
      role: m.role,
      status: m.status,
      createdAt: m.created_at
    }))

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
    } as PaginatedResponse<DirectoryMember>
  },

  async getCategoryAssignments() {
    const { data, error } = await supabaseCommunity
      .from('director_categories')
      .select(`
        category,
        assigned_at,
        members (
          member_id,
          uuid,
          full_name,
          avatar_url,
          email
        )
      `)

    if (error) throw error

    const categories = ['events', 'welfare', 'content', 'operations', 'labs']
    const assignments: CategoryAssignments = categories.reduce((acc, cat) => {
      acc[cat] = []
      return acc
    }, {} as CategoryAssignments)

    data?.forEach((row: any) => {
      if (assignments[row.category]) {
        assignments[row.category].push({
          memberId: row.members.member_id,
          uuid: row.members.uuid,
          fullName: row.members.full_name,
          avatarUrl: row.members.avatar_url,
          email: row.members.email,
          assignedAt: row.assigned_at
        })
      }
    })

    return {
      success: true,
      data: {
        categories,
        assignments
      }
    }
  },

  async getMyCategories() {
    const currentMemberId = await this.getCurrentMemberId()

    const { data, error } = await supabaseCommunity
      .from('director_categories')
      .select('category, assigned_at, assigned_by')
      .eq('member_id', currentMemberId)

    if (error) throw error

    return {
      success: true,
      data: {
        categories: (data || []).map(c => ({
          category: c.category,
          assignedAt: c.assigned_at,
          assignedBy: String(c.assigned_by)
        }))
      }
    }
  },

  async getAllDirectors() {
    const { data, error } = await supabaseCommunity
      .from('members')
      .select(`
        member_id,
        uuid,
        full_name,
        avatar_url,
        email,
        created_at,
        role,
        director_categories (
          category
        )
      `)
      .in('role', ['director', 'super_admin'])
      .eq('status', 'active')

    if (error) throw error

    const directors = (data || []).map((m: any) => ({
      memberId: m.member_id,
      uuid: m.uuid,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      email: m.email,
      createdAt: m.created_at,
      isSuperAdmin: m.role === 'super_admin',
      categories: m.director_categories ? m.director_categories.map((c: any) => c.category) : []
    }))

    return {
      success: true,
      data: { directors }
    }
  },

  async assignCategory(memberId: number, category: string) {
    const currentMemberId = await this.getCurrentMemberId()

    const { error } = await supabaseCommunity
      .from('director_categories')
      .insert({
        member_id: memberId,
        category,
        assigned_by: currentMemberId
      })

    if (error) throw error

    return { success: true, message: 'Category assigned successfully' }
  },

  async unassignCategory(memberId: number, category: string) {
    const { error } = await supabaseCommunity
      .from('director_categories')
      .delete()
      .eq('member_id', memberId)
      .eq('category', category)

    if (error) throw error

    return { success: true, message: 'Category assignment removed' }
  },

  async approvePostCategory(postUuid: string, category: string) {
    const { data, error } = await supabaseCommunity.rpc('approve_post_category', {
      p_post_uuid: postUuid,
      p_category: category
    })

    if (error) throw error
    const result = data as { success: boolean; error?: string; published?: boolean; categories_remaining?: string[] } | null
    if (!result?.success) throw new Error(result?.error || 'Approval failed')

    return {
      success: true,
      message: result.published ? 'Post fully approved and published' : 'Category approved',
      data: {
        categoryApproved: category,
        fullyApproved: result.published,
        categoriesRemaining: result.categories_remaining
      }
    }
  },

  async getEligibleMembers(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('members')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.search) {
      query = query.ilike('full_name', `%${params.search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    const mapped = (data || []).map(m => ({
      memberId: m.member_id,
      uuid: m.uuid,
      email: m.email,
      fullName: m.full_name,
      avatarUrl: m.avatar_url,
      classGrade: m.class_grade,
      createdAt: m.created_at
    }))

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
    } as PaginatedResponse<EligibleMember>
  },

  async promoteToDirector(memberId: number) {
    const { data, error } = await supabaseCommunity
      .from('members')
      .update({ role: 'director' })
      .eq('member_id', memberId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Member promoted to director successfully',
      data: { member: { memberId: data.member_id } as DirectoryMember }
    }
  },

  async demoteToMember(memberId: number) {
    await supabaseCommunity.from('director_categories').delete().eq('member_id', memberId)

    const { data, error } = await supabaseCommunity
      .from('members')
      .update({ role: 'member' })
      .eq('member_id', memberId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      message: 'Director demoted successfully',
      data: { member: { memberId: data.member_id } as DirectoryMember }
    }
  },

  async deleteMember(memberId: number) {
    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id, email, full_name')
      .eq('member_id', memberId)
      .single()

    if (!member) throw new Error('Member not found')

    const { error } = await supabaseCommunity
      .from('members')
      .delete()
      .eq('member_id', memberId)

    if (error) throw error

    return {
      success: true,
      message: 'Member deleted successfully',
      data: {
        deletedMember: {
          memberId: member.member_id,
          email: member.email,
          fullName: member.full_name
        }
      }
    }
  }
}

export default directorService
