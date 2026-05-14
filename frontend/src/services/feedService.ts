import { supabaseCommunity } from '../lib/supabaseCommunity'
import { Post, PaginatedResponse } from './api'

export interface CreatePostData {
  category: string
  body: string
  linkUrl?: string
  linkTitle?: string
  linkImage?: string
  imageUrls?: string[]
  taggedMemberIds?: number[]
}

const mapPostFromDB = (post: any, likedPostIds: number[]): Post => ({
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
  })) : [],
  isLiked: likedPostIds.includes(post.post_id)
})

export const feedService = {
  async getFeed(params: { page?: number; limit?: number; category?: string }) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    let query = supabaseCommunity
      .from('post_feed_view')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (params.category) {
      query = query.eq('category', params.category)
    }

    const { data: posts, error, count } = await query
    if (error) throw error

    const { data: { session } } = await supabaseCommunity.auth.getSession()
    let likedPostIds: number[] = []

    if (session?.user && posts && posts.length > 0) {
      const { data: member } = await supabaseCommunity
        .from('members')
        .select('member_id')
        .eq('auth_uid', session.user.id)
        .single()

      if (member) {
        const postIds = posts.map(p => p.post_id)
        const { data: likes } = await supabaseCommunity
          .from('likes')
          .select('post_id')
          .eq('member_id', member.member_id)
          .in('post_id', postIds)

        if (likes) {
          likedPostIds = likes.map(l => l.post_id)
        }
      }
    }

    const mappedPosts = (posts || []).map(p => mapPostFromDB(p, likedPostIds))
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

  async getPost(uuid: string) {
    const { data: post, error } = await supabaseCommunity
      .from('post_feed_view')
      .select('*')
      .eq('uuid', uuid)
      .single()

    if (error) throw error

    let likedPostIds: number[] = []
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (session?.user && post) {
      const { data: member } = await supabaseCommunity
        .from('members')
        .select('member_id')
        .eq('auth_uid', session.user.id)
        .single()

      if (member) {
        const { data: like } = await supabaseCommunity
          .from('likes')
          .select('post_id')
          .eq('member_id', member.member_id)
          .eq('post_id', post.post_id)
          .single()

        if (like) {
          likedPostIds = [like.post_id]
        }
      }
    }

    return {
      success: true,
      data: { post: mapPostFromDB(post, likedPostIds) }
    }
  },

  async createPost(data: CreatePostData) {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!member) throw new Error('Member profile not found')

    const { data: post, error: postError } = await supabaseCommunity
      .from('posts')
      .insert({
        author_id: member.member_id,
        category: data.category,
        body: data.body,
        link_url: data.linkUrl,
        link_title: data.linkTitle,
        link_image: data.linkImage,
      })
      .select()
      .single()

    if (postError) throw postError

    if (data.imageUrls && data.imageUrls.length > 0) {
      const imagesToInsert = data.imageUrls.map((url, index) => ({
        post_id: post.post_id,
        blob_url: url,
        blob_name: url.split('/').pop() || `image_${index}`,
        display_order: index
      }))
      await supabaseCommunity.from('post_images').insert(imagesToInsert)
    }

    if (data.taggedMemberIds && data.taggedMemberIds.length > 0) {
      const tagsToInsert = data.taggedMemberIds.map(id => ({
        post_id: post.post_id,
        tagged_member_id: id
      }))
      await supabaseCommunity.from('post_tags').insert(tagsToInsert)
    }

    await supabaseCommunity.from('post_categories').insert({
      post_id: post.post_id,
      category: data.category
    })

    return this.getPost(post.uuid)
  },

  async toggleLike(uuid: string) {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id')
      .eq('auth_uid', session.user.id)
      .single()

    if (!member) throw new Error('Member profile not found')

    const { data: post } = await supabaseCommunity
      .from('posts')
      .select('post_id')
      .eq('uuid', uuid)
      .single()

    if (!post) throw new Error('Post not found')

    const { data: existingLike } = await supabaseCommunity
      .from('likes')
      .select('like_id')
      .eq('post_id', post.post_id)
      .eq('member_id', member.member_id)
      .single()

    let liked = false

    if (existingLike) {
      await supabaseCommunity.from('likes').delete().eq('like_id', existingLike.like_id)
    } else {
      await supabaseCommunity.from('likes').insert({ post_id: post.post_id, member_id: member.member_id })
      liked = true
    }

    const { count: likeCount } = await supabaseCommunity
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.post_id)

    return {
      success: true,
      data: { liked, likeCount: likeCount || 0 }
    }
  },

  async getLikers(uuid: string, params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    const { data: post } = await supabaseCommunity
      .from('posts')
      .select('post_id')
      .eq('uuid', uuid)
      .single()

    if (!post) throw new Error('Post not found')

    const { data: likes, error, count } = await supabaseCommunity
      .from('likes')
      .select(`
        created_at,
        members (
          member_id,
          uuid,
          full_name,
          avatar_url,
          class_grade,
          role
        )
      `, { count: 'exact' })
      .eq('post_id', post.post_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const mappedLikers = (likes || []).map((like: any) => ({
      memberId: like.members.member_id,
      uuid: like.members.uuid,
      fullName: like.members.full_name,
      avatarUrl: like.members.avatar_url,
      classGrade: like.members.class_grade,
      role: like.members.role,
      likedAt: like.created_at
    }))

    const totalItems = count || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: mappedLikers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  },

  async deletePost(uuid: string) {
    const { error } = await supabaseCommunity
      .from('posts')
      .delete()
      .eq('uuid', uuid)

    if (error) throw error

    return { success: true, message: 'Post deleted successfully' }
  },

  async searchMembers(query: string) {
    const { data, error } = await supabaseCommunity
      .from('members')
      .select('member_id, uuid, full_name, avatar_url, email, role')
      .eq('status', 'active')
      .ilike('full_name', `%${query}%`)
      .limit(10)

    if (error) throw error

    const mappedMembers = data.map(m => ({
      memberId: m.member_id,
      uuid: m.uuid,
      fullName: m.full_name,
      avatarUrl: m.avatar_url ?? undefined,
      email: m.email,
      role: m.role
    }))

    return { success: true, data: { members: mappedMembers } }
  },

  async getComments(postUuid: string, params: { page?: number; limit?: number } = {}) {
    const page = params.page || 1
    const limit = params.limit || 10
    const offset = (page - 1) * limit

    // Get post_id from uuid
    const { data: post, error: postError } = await supabaseCommunity
      .from('posts')
      .select('post_id')
      .eq('uuid', postUuid)
      .single()
    if (postError || !post) throw new Error('Post not found')

    const { data: comments, error, count } = await supabaseCommunity
      .from('comments')
      .select(`
        comment_id, uuid, body, created_at,
        author:members!author_id(member_id, uuid, full_name, avatar_url, role)
      `, { count: 'exact' })
      .eq('post_id', post.post_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return {
      success: true,
      data: (comments || []).map((c: any) => ({
        commentId: c.comment_id,
        uuid: c.uuid,
        body: c.body,
        createdAt: c.created_at,
        authorId: c.author?.member_id,
        authorUuid: c.author?.uuid,
        authorName: c.author?.full_name || 'Member',
        authorAvatar: c.author?.avatar_url || null,
        authorRole: c.author?.role || 'member',
      })),
      pagination: {
        currentPage: page,
        totalItems: count || 0,
        hasNextPage: (count || 0) > page * limit,
      }
    }
  },

  async addComment(postUuid: string, body: string) {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id')
      .eq('auth_uid', session.user.id)
      .single()
    if (!member) throw new Error('Member not found')

    const { data: post } = await supabaseCommunity
      .from('posts')
      .select('post_id')
      .eq('uuid', postUuid)
      .single()
    if (!post) throw new Error('Post not found')

    const { data: comment, error } = await supabaseCommunity
      .from('comments')
      .insert({ post_id: post.post_id, author_id: member.member_id, body: body.trim() })
      .select(`
        comment_id, uuid, body, created_at,
        author:members!author_id(member_id, uuid, full_name, avatar_url, role)
      `)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        commentId: (comment as any).comment_id,
        uuid: (comment as any).uuid,
        body: (comment as any).body,
        createdAt: (comment as any).created_at,
        authorId: (comment as any).author?.member_id,
        authorUuid: (comment as any).author?.uuid,
        authorName: (comment as any).author?.full_name || 'Member',
        authorAvatar: (comment as any).author?.avatar_url || null,
        authorRole: (comment as any).author?.role || 'member',
      }
    }
  },

  async deleteComment(commentUuid: string) {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: member } = await supabaseCommunity
      .from('members')
      .select('member_id, role')
      .eq('auth_uid', session.user.id)
      .single()
    if (!member) throw new Error('Member not found')

    const isLeader = ['director', 'hod', 'super_admin'].includes(member.role)

    // Leaders can delete any comment; members can only delete their own
    let query = supabaseCommunity.from('comments').delete().eq('uuid', commentUuid)
    if (!isLeader) {
      query = query.eq('author_id', member.member_id) as any
    }

    const { error } = await query
    if (error) throw error
    return { success: true }
  },

  async uploadImages(files: File[]) {
    const { data: { session } } = await supabaseCommunity.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const uploadedImages = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`

      const { data, error } = await supabaseCommunity.storage
        .from('post-images')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabaseCommunity.storage
        .from('post-images')
        .getPublicUrl(data.path)

      uploadedImages.push({
        url: publicUrl,
        name: file.name,
        size: file.size
      })
    }

    return { success: true, data: { images: uploadedImages } }
  }
}

export default feedService
