// Type-only exports — no Axios, no HTTP client.
// Community services use supabaseCommunity directly.

export interface Member {
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  role: 'member' | 'director'
  status: 'pending_approval' | 'active' | 'rejected' | 'suspended'
  rejectionNote?: string
  isSuperAdmin?: boolean
  createdAt?: string
}

export interface Post {
  postId: number
  uuid: string
  category: string
  body: string
  linkUrl?: string
  linkTitle?: string
  linkImage?: string
  status: string
  createdAt: string
  authorId: number
  authorUuid: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  likeCount: number
  commentCount: number
  images?: { blobUrl: string; displayOrder: number }[]
  taggedMembers?: { memberId: number; uuid: string; fullName: string; avatarUrl?: string }[]
  isLiked?: boolean
  teamName?: string
  teamUuid?: string
}

export interface Achievement {
  achievementId: number
  uuid: string
  memberId: number
  title: string
  description?: string
  achievementType: 'leadership' | 'academic' | 'competition' | 'personal_project' | 'other'
  achievementDate: string
  achievementEndDate?: string | null
  proofUrl?: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface School {
  uuid: string
  name: string
  shortName?: string
  logoUrl?: string
  location?: string
  website?: string
  memberCount: number
  createdAt: string
}

export interface SchoolDetails extends School {
  recentMembers: {
    uuid: string
    fullName: string
    avatarUrl?: string
    classGrade?: string
    role: string
  }[]
  classes: {
    uuid: string
    name: string
    gradeLevel?: string
    academicYear?: string
    memberCount: number
  }[]
}

export interface SchoolMember {
  uuid: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  role: string
  bio?: string
  className?: string
  classUuid?: string
  createdAt: string
}
