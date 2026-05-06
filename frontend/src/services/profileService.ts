import { supabaseCommunity } from '../lib/supabaseCommunity'
import { Post, PaginatedResponse } from './api'

export interface MemberProfile {
  uuid: string
  email?: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  joinReason?: string
  bio?: string
  role: 'member' | 'director'
  status: string
  createdAt?: string
  postCount?: number
  taggedCount?: number
  schoolId?: number
  schoolUuid?: string
  schoolName?: string
  classId?: number
  classUuid?: string
  className?: string
}

export interface UpdateProfileData {
  fullName?: string
  email?: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  bio?: string
  schoolId?: number
}

export const profileService = {
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

  async getOwnProfile() {
    const member = await this.getCurrentMember()

    const profile: MemberProfile = {
      uuid: member.uuid,
      email: member.email,
      fullName: member.full_name,
      avatarUrl: member.avatar_url ?? undefined,
      classGrade: member.class_grade ?? undefined,
      phone: member.phone ?? undefined,
      joinReason: member.join_reason ?? undefined,
      role: (member.role === 'super_admin' ? 'director' : member.role) as 'member' | 'director',
      status: member.status,
      createdAt: member.created_at,
      postCount: 0,
      taggedCount: 0
    }

    return { success: true, data: { member: profile } }
  },

  async updateProfile(data: UpdateProfileData) {
    const member = await this.getCurrentMember()

    const updateData: any = {}
    if (data.fullName !== undefined) updateData.full_name = data.fullName
    if (data.email !== undefined) updateData.email = data.email
    if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl
    if (data.classGrade !== undefined) updateData.class_grade = data.classGrade
    if (data.phone !== undefined) updateData.phone = data.phone

    const { data: updated, error } = await supabaseCommunity
      .from('members')
      .update(updateData)
      .eq('member_id', member.member_id)
      .select()
      .single()

    if (error) throw error

    const profile: MemberProfile = {
      uuid: updated.uuid,
      email: updated.email,
      fullName: updated.full_name,
      avatarUrl: updated.avatar_url ?? undefined,
      classGrade: updated.class_grade ?? undefined,
      phone: updated.phone ?? undefined,
      joinReason: updated.join_reason ?? undefined,
      role: (updated.role === 'super_admin' ? 'director' : updated.role) as 'member' | 'director',
      status: updated.status,
      createdAt: updated.created_at,
      postCount: 0,
      taggedCount: 0
    }

    return { success: true, message: 'Profile updated successfully', data: { member: profile } }
  },

  async getPublicProfile(uuid: string) {
    const { data: member, error } = await supabaseCommunity
      .from('members')
      .select('*')
      .eq('uuid', uuid)
      .single()

    if (error) throw error

    const profile: MemberProfile = {
      uuid: member.uuid,
      fullName: member.full_name,
      avatarUrl: member.avatar_url ?? undefined,
      classGrade: member.class_grade ?? undefined,
      role: (member.role === 'super_admin' ? 'director' : member.role) as 'member' | 'director',
      status: member.status,
      createdAt: member.created_at,
      postCount: 0,
      taggedCount: 0
    }

    return { success: true, data: { profile } }
  },

  async getMemberPosts(uuid: string, params: { page?: number; limit?: number }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data: member } = await supabaseCommunity.from('members').select('member_id').eq('uuid', uuid).single()
    if (!member) throw new Error('Member not found')

    const { data, count, error } = await supabaseCommunity
      .from('post_feed_view')
      .select('*', { count: 'exact' })
      .eq('author_id', member.member_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const posts = (data || []).map((post: any) => ({
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
      likeCount: post.like_count || 0,
      commentCount: post.comment_count || 0,
      images: post.images ? (post.images as any[]).map((img: any) => ({
        blobUrl: img.url,
        displayOrder: img.order
      })) : [],
      taggedMembers: post.tagged_members ? (post.tagged_members as any[]).map((m: any) => ({
        memberId: m.id,
        uuid: m.uuid,
        fullName: m.name
      })) : []
    }))

    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: posts,
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

  async getTaggedPosts(uuid: string, params: { page?: number; limit?: number }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data: member } = await supabaseCommunity.from('members').select('member_id').eq('uuid', uuid).single()
    if (!member) throw new Error('Member not found')

    const { data: tags } = await supabaseCommunity.from('post_tags').select('post_id').eq('tagged_member_id', member.member_id)
    const postIds = tags?.map(t => t.post_id) || []

    if (postIds.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        }
      } as PaginatedResponse<Post>
    }

    const { data, count, error } = await supabaseCommunity
      .from('post_feed_view')
      .select('*', { count: 'exact' })
      .in('post_id', postIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const posts = (data || []).map((post: any) => ({
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
      likeCount: post.like_count || 0,
      commentCount: post.comment_count || 0,
      images: post.images ? (post.images as any[]).map((img: any) => ({
        blobUrl: img.url,
        displayOrder: img.order
      })) : [],
      taggedMembers: post.tagged_members ? (post.tagged_members as any[]).map((m: any) => ({
        memberId: m.id,
        uuid: m.uuid,
        fullName: m.name
      })) : []
    }))

    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: posts,
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

  async uploadAvatar(file: File) {
    const member = await this.getCurrentMember()
    const fileExt = file.name.split('.').pop()
    const fileName = `${member.uuid}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabaseCommunity.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabaseCommunity.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return { success: true, data: { url: publicUrlData.publicUrl } }
  }
}

export default profileService
