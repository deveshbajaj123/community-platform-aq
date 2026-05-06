export interface DashboardStats {
  pendingMemberApprovals: number
  pendingPostReviews: number
  totalActiveMembers: number
  totalPublishedPosts: number
}

export interface PendingMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  phone?: string
  joinReason?: string
  createdAt: string
}

export interface DirectoryMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  role: 'member' | 'director' | 'super_admin'
  status: string
  createdAt: string
  postCount?: number
}

export interface Director {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  createdAt: string
  isSuperAdmin?: boolean
  categories: string[]
}

export interface EligibleMember {
  memberId: number
  uuid: string
  email: string
  fullName: string
  avatarUrl?: string
  classGrade?: string
  createdAt: string
}

export interface CategoryAssignment {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  assignedAt: string
}

export type CategoryAssignments = Record<string, CategoryAssignment[]>
