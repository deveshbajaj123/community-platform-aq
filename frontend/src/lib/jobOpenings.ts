import { supabaseCommunity } from './supabaseCommunity'

export type OpeningStatus = 'open' | 'paused' | 'closed' | 'deleted'

export interface JobOpening {
  id: string
  title: string
  description: string
  category: string
  teamName?: string
  skills: string[]
  commitment?: string
  deadline?: string
  status: OpeningStatus
  closedAt?: string
  deletedAt?: string
  createdByName: string
  createdByRole: string
  createdAt: string
  linkedPostId?: string
}

export const ALLOWED_TRANSITIONS: Record<OpeningStatus, OpeningStatus[]> = {
  open:    ['paused', 'closed', 'deleted'],
  paused:  ['open',   'closed', 'deleted'],
  closed:  ['deleted'],
  deleted: [],
}

function mapRow(row: any): JobOpening {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    teamName: row.team_name ?? undefined,
    skills: row.skills || [],
    commitment: row.commitment ?? undefined,
    deadline: row.deadline ?? undefined,
    status: row.status as OpeningStatus,
    closedAt: row.closed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    createdByName: row.created_by_name,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    linkedPostId: row.linked_post_id ?? undefined,
  }
}

function canTransition(from: OpeningStatus, to: OpeningStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export const jobOpenings = {
  async getAll(): Promise<JobOpening[]> {
    const { data, error } = await supabaseCommunity
      .from('job_openings')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
    if (error) { console.error('[jobOpenings.getAll]', error); return [] }
    // Auto-pause expired open openings
    const now = new Date()
    const toUpdate = (data || []).filter(o => o.status === 'open' && o.deadline && new Date(o.deadline) < now)
    if (toUpdate.length > 0) {
      await supabaseCommunity.from('job_openings').update({ status: 'paused' }).in('id', toUpdate.map(o => o.id))
    }
    return (data || []).map(o => mapRow({ ...o, status: toUpdate.find(u => u.id === o.id) ? 'paused' : o.status }))
  },

  async getAllIncludeDeleted(): Promise<JobOpening[]> {
    const { data, error } = await supabaseCommunity
      .from('job_openings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { console.error('[jobOpenings.getAllIncludeDeleted]', error); return [] }
    return (data || []).map(mapRow)
  },

  async getOpen(): Promise<JobOpening[]> {
    // Auto-pause expired open openings first
    await supabaseCommunity
      .from('job_openings')
      .update({ status: 'paused' })
      .eq('status', 'open')
      .lt('deadline', new Date().toISOString())

    const { data, error } = await supabaseCommunity
      .from('job_openings')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (error) { console.error('[jobOpenings.getOpen]', error); return [] }
    return (data || []).map(mapRow)
  },

  async getById(id: string): Promise<JobOpening | undefined> {
    const { data, error } = await supabaseCommunity
      .from('job_openings')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return undefined
    return mapRow(data)
  },

  async getByPostId(postId: string): Promise<JobOpening | undefined> {
    const { data, error } = await supabaseCommunity
      .from('job_openings')
      .select('*')
      .eq('linked_post_id', postId)
      .single()
    if (error || !data) return undefined
    return mapRow(data)
  },

  async create(data: Omit<JobOpening, 'id' | 'createdAt' | 'status'>): Promise<JobOpening> {
    const { data: row, error } = await supabaseCommunity
      .from('job_openings')
      .insert({
        title: data.title,
        description: data.description,
        category: data.category,
        team_name: data.teamName,
        skills: data.skills,
        commitment: data.commitment,
        deadline: data.deadline,
        created_by_name: data.createdByName,
        created_by_role: data.createdByRole,
        linked_post_id: data.linkedPostId,
        status: 'open',
      })
      .select()
      .single()
    if (error) throw error
    return mapRow(row)
  },

  async update(id: string, patch: Partial<JobOpening>): Promise<void> {
    const updateData: any = {}
    if (patch.title !== undefined) updateData.title = patch.title
    if (patch.description !== undefined) updateData.description = patch.description
    if (patch.category !== undefined) updateData.category = patch.category
    if (patch.teamName !== undefined) updateData.team_name = patch.teamName
    if (patch.skills !== undefined) updateData.skills = patch.skills
    if (patch.commitment !== undefined) updateData.commitment = patch.commitment
    if (patch.deadline !== undefined) updateData.deadline = patch.deadline
    if (patch.status !== undefined) updateData.status = patch.status
    if (patch.closedAt !== undefined) updateData.closed_at = patch.closedAt
    if (patch.deletedAt !== undefined) updateData.deleted_at = patch.deletedAt
    const { error } = await supabaseCommunity.from('job_openings').update(updateData).eq('id', id)
    if (error) console.error('[jobOpenings.update]', error)
  },

  async transition(id: string, to: OpeningStatus): Promise<void> {
    const current = await this.getById(id)
    if (!current) return
    if (!canTransition(current.status, to)) {
      console.warn(`[jobOpenings] Transition ${current.status} → ${to} not allowed`)
      return
    }
    const patch: any = { status: to }
    if (to === 'closed')  patch.closed_at  = new Date().toISOString()
    if (to === 'deleted') patch.deleted_at = new Date().toISOString()
    await supabaseCommunity.from('job_openings').update(patch).eq('id', id)
  },

  async pause(id: string)   { await this.transition(id, 'paused') },
  async resume(id: string)  { await this.transition(id, 'open') },
  async close(id: string)   { await this.transition(id, 'closed') },
  async delete_(id: string) { await this.transition(id, 'deleted') },

  async createFromPost(
    postId: string,
    data: Omit<JobOpening, 'id' | 'createdAt' | 'status' | 'linkedPostId'>
  ): Promise<JobOpening> {
    return this.create({ ...data, linkedPostId: postId })
  },

  async apply(openingId: string, applicantId: number, applicantName: string, applicantEmail: string, message: string): Promise<{ success: boolean; alreadyApplied?: boolean; error?: string }> {
    try {
      const { error } = await supabaseCommunity.from('job_applications').insert({
        opening_id: openingId,
        applicant_id: applicantId,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        message: message.trim() || null,
      })
      if (error) {
        if (error.code === '23505') return { success: false, alreadyApplied: true }
        return { success: false, error: error.message }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  },

  async hasApplied(openingId: string, applicantId: number): Promise<boolean> {
    const { data } = await supabaseCommunity.from('job_applications')
      .select('id').eq('opening_id', openingId).eq('applicant_id', applicantId).maybeSingle()
    return !!data
  },

  async getApplications(openingId: string): Promise<any[]> {
    const { data } = await supabaseCommunity.from('job_applications')
      .select('*')
      .eq('opening_id', openingId)
      .order('created_at', { ascending: false })
    return data || []
  },

  async updateApplicationStatus(applicationId: string, status: 'pending'|'reviewed'|'accepted'|'rejected'): Promise<void> {
    await supabaseCommunity.from('job_applications').update({ status }).eq('id', applicationId)
  },
}

export const CAT_COLORS: Record<string, string> = {
  events:     '#FF6BD6',
  welfare:    '#00E5A0',
  labs:       '#FFC700',
  operations: '#3DA9FC',
  content:    '#7E5BFF',
}

export const STATUS_COLORS: Record<OpeningStatus, string> = {
  open:    '#00E5A0',
  paused:  '#FFC700',
  closed:  '#FF7A1A',
  deleted: '#e05c5c',
}

export const STATUS_LABELS: Record<OpeningStatus, string> = {
  open:    'Open',
  paused:  'Paused',
  closed:  'Closed',
  deleted: 'Deleted',
}
