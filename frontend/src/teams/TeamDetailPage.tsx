import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import teamService, { TeamDetails, PendingTeamPost, JoinRequest } from '../services/teamService'
import AddMemberModal from './AddMemberModal'
import CreateTeamPostModal from './CreateTeamPostModal'
import JoinRequestModal from './JoinRequestModal'
import { useAuth } from '../auth/AuthContext'
import { DEPT_COLORS } from '../lib/supabase'
import { hasLeaderAccess } from '../lib/roles'
import { Burst, I } from '../components/v6Shared'
import ShareModal from '../components/ShareModal'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import { useToast } from '../components/Toast'
import { useIsMobile } from '../hooks/useMobile'
import { jobOpenings } from '../lib/jobOpenings'

const initials = (name: string) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)

// ── Team Openings ────────────────────────────────────────────────────────────
type OpeningStatus = 'open' | 'paused' | 'closed' | 'deleted'

type TeamOpening = {
  id: string
  title: string
  description: string
  skills: string[]
  commitment: string
  category: string
  status: OpeningStatus
  createdAt: string
  createdByName: string
  createdByRole: string
}

// Derive a simple "is open" boolean from status for UI purposes
function isOpenStatus(status: OpeningStatus) { return status === 'open' }

const STATUS_BADGE: Record<OpeningStatus, { label: string; color: string }> = {
  open:    { label: 'Open',    color: 'var(--mint)' },
  paused:  { label: 'Paused',  color: 'var(--lemon)' },
  closed:  { label: 'Closed',  color: 'var(--ink-3)' },
  deleted: { label: 'Deleted', color: '#e05c5c' },
}

// ── Opening Edit Modal (proper component — hooks compliant) ──────────────────
function OpeningEditModal({
  opening, teamName, teamCategory, member, onClose, onSaved,
}: {
  opening: TeamOpening | 'new'
  teamName?: string
  teamCategory?: string
  member: { fullName: string; role: string } | null
  onClose: () => void
  onSaved: () => void
}) {
  const { success: toastSuccess, error: toastError } = useToast()
  const isNew = opening === 'new'
  const existing = isNew ? null : opening as TeamOpening
  const [oTitle, setOTitle]   = useState(existing?.title || '')
  const [oDesc, setODesc]     = useState(existing?.description || '')
  const [oSkills, setOSkills] = useState(existing?.skills.join(', ') || '')
  const [oCommit, setOCommit] = useState(existing?.commitment || '')
  const [oStatus, setOStatus] = useState<OpeningStatus>(existing?.status || 'open')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [touched, setTouched] = useState({ title: false, desc: false })

  const labelSt: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }
  const inputSt: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'var(--bg-2)', border: '1.5px solid var(--line-2)', borderRadius: 12, color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none' }

  const handleSave = async () => {
    // Mark both fields as touched so red borders appear
    setTouched({ title: true, desc: true })
    if (!oTitle.trim() && !oDesc.trim()) {
      toastError('Role title and description are required')
      return
    }
    if (!oTitle.trim()) { toastError('Role title is required'); return }
    if (!oDesc.trim())  { toastError('Description is required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const { error } = await supabaseCommunity.from('job_openings').insert({
          title: oTitle.trim(),
          description: oDesc.trim(),
          category: teamCategory || 'welfare',
          team_name: teamName || '',
          skills: oSkills.split(',').map(s => s.trim()).filter(Boolean),
          commitment: oCommit.trim() || null,
          status: oStatus,
          created_by_name: member?.fullName || teamName || 'Team',
          created_by_role: member?.role || 'hod',
        })
        if (error) throw error
        toastSuccess('Opening posted!', 'It\'s now visible on the Openings tab.')
      } else {
        const { error } = await supabaseCommunity.from('job_openings').update({
          title: oTitle.trim(),
          description: oDesc.trim(),
          category: teamCategory || existing?.category || 'welfare',
          skills: oSkills.split(',').map(s => s.trim()).filter(Boolean),
          commitment: oCommit.trim() || null,
          status: oStatus,
        }).eq('id', existing!.id)
        if (error) throw error
        toastSuccess('Opening updated.')
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toastError(e?.message || 'Failed to save opening')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    setDeleting(true)
    try {
      const { error } = await supabaseCommunity.from('job_openings').update({ status: 'deleted' }).eq('id', existing.id)
      if (error) throw error
      toastSuccess('Opening removed.')
      onSaved()
      onClose()
    } catch (e: any) {
      toastError(e?.message || 'Failed to delete opening')
    } finally {
      setDeleting(false)
    }
  }

  const statusOptions: { value: OpeningStatus; label: string; color: string }[] = [
    { value: 'open',   label: '● Open',   color: 'var(--mint)' },
    { value: 'paused', label: '⏸ Paused', color: 'var(--lemon)' },
    { value: 'closed', label: '○ Closed', color: 'var(--ink-3)' },
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: 'var(--card)', borderRadius: 20, padding: 24, border: '2px solid var(--ink)', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, marginBottom: 20 }}>
          {isNew ? 'add opening' : 'edit opening'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelSt}>
              Role title *
              {touched.title && !oTitle.trim() && <span style={{ color: '#e05c5c', marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>required</span>}
            </label>
            <input
              style={{ ...inputSt, borderColor: touched.title && !oTitle.trim() ? '#e05c5c' : undefined }}
              value={oTitle}
              onChange={e => { setOTitle(e.target.value); setTouched(t => ({ ...t, title: true })) }}
              placeholder="e.g. Social Media Manager"
            />
          </div>
          <div>
            <label style={labelSt}>
              Description *
              {touched.desc && !oDesc.trim() && <span style={{ color: '#e05c5c', marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>required</span>}
            </label>
            <textarea
              style={{ ...inputSt, minHeight: 100, resize: 'vertical', borderColor: touched.desc && !oDesc.trim() ? '#e05c5c' : undefined }}
              value={oDesc}
              onChange={e => { setODesc(e.target.value); setTouched(t => ({ ...t, desc: true })) }}
              placeholder="What will this person do? What's expected?"
            />
          </div>
          <div><label style={labelSt}>Skills <span style={{ opacity: 0.5, fontWeight: 400 }}>(comma separated)</span></label><input style={inputSt} value={oSkills} onChange={e => setOSkills(e.target.value)} placeholder="e.g. Canva, Excel, Communication" /></div>
          <div><label style={labelSt}>Time commitment</label><input style={inputSt} value={oCommit} onChange={e => setOCommit(e.target.value)} placeholder="e.g. 2-3 hrs/week" /></div>
          <div>
            <label style={labelSt}>Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {statusOptions.map(opt => (
                <button key={opt.value} onClick={() => setOStatus(opt.value)} className="btn btn-sm"
                  style={{ background: oStatus === opt.value ? opt.color : 'var(--bg-2)', color: oStatus === opt.value ? '#0A0A0A' : 'var(--ink)', borderColor: oStatus === opt.value ? opt.color : 'transparent' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            className="btn btn-sm btn-primary"
            style={{
              flex: 1, justifyContent: 'center',
              opacity: saving || deleting ? 0.7 : 1,
            }}
            disabled={saving || deleting}
            onClick={handleSave}
          >
            {saving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                saving…
              </span>
            ) : isNew ? 'post opening →' : 'save changes →'}
          </button>
          {!isNew && (
            <button className="btn btn-sm" style={{ color: '#e05c5c', borderColor: '#e05c5c44' }} onClick={handleDelete} disabled={deleting || saving}>
              {deleting ? '…' : 'delete'}
            </button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving || deleting}>cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Apply for Opening Modal (proper component — hooks compliant) ─────────────
function ApplyForOpeningModal({
  opening, teamName, catColor, onClose, onSuccess,
}: {
  opening: TeamOpening
  teamName: string
  teamUuid: string
  catColor: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { success: toastSuccess, error: toastError } = useToast()
  const { member: currentMember } = useAuth()
  const [applyMsg, setApplyMsg] = useState(`Applying for: ${opening.title}\n\n`)
  const [applyLoading, setApplyLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const closeModal = () => { setApplyMsg(`Applying for: ${opening.title}\n\n`); setSubmitted(false); setApplyError(null); onClose() }

  const handleApply = async () => {
    setApplyLoading(true); setApplyError(null)
    try {
      const result = await jobOpenings.apply(
        opening.id, currentMember!.member_id,
        currentMember!.full_name || '', currentMember!.email || '', applyMsg.trim()
      )
      if (result.alreadyApplied) {
        toastSuccess('You already applied for this role.')
        setSubmitted(true); onSuccess()
      } else if (result.success) {
        toastSuccess('Application sent!', 'You\'ll hear back via Notifications.')
        setSubmitted(true); onSuccess()
      } else {
        const msg = result.error || 'Failed to submit'
        toastError(msg); setApplyError(msg)
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to submit'
      toastError(msg); setApplyError(msg)
    } finally { setApplyLoading(false) }
  }

  return (
    <div onClick={submitted ? undefined : onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--card)', borderRadius: 20, padding: 24, border: '2px solid var(--ink)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48 }}>✓</div>
            <div className="h-display" style={{ fontSize: 24, marginTop: 12 }}>Application sent!</div>
            <p style={{ color: 'var(--ink-2)', marginTop: 8 }}>The team lead will review your application and respond via Notifications.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeModal}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>apply</div>
            <div className="mono xs muted" style={{ marginBottom: 20 }}>
              {teamName} · <span style={{ color: catColor }}>{opening.title}</span>
            </div>
            {applyError && (
              <div style={{ background: 'rgba(224,92,92,0.12)', border: '1.5px solid rgba(224,92,92,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#e05c5c', fontSize: 13 }}>
                {applyError}
              </div>
            )}
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
              why are you a good fit?
            </label>
            <textarea className="textarea" rows={5} value={applyMsg}
              onChange={e => setApplyMsg(e.target.value)}
              placeholder="Tell the team why you'd like this role..."
              style={{ resize: 'vertical', marginBottom: 16, fontFamily: 'var(--eina)', fontSize: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleApply} disabled={applyLoading || !applyMsg.trim()}>
                {applyLoading ? 'submitting…' : 'submit application →'}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={onClose}>cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const TeamDetailPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const isMobile = useIsMobile()
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'members' | 'openings' | 'pending' | 'applications'>('about')
  const [openings, setOpenings] = useState<TeamOpening[]>([])
  const [openingsLoading, setOpeningsLoading] = useState(false)
  const [editingOpening, setEditingOpening] = useState<TeamOpening | 'new' | null>(null)
  const [applyingFor, setApplyingFor] = useState<TeamOpening | null>(null)
  const [expandedApplicants, setExpandedApplicants] = useState<Record<string, any[]>>({})
  const [loadingApplicants, setLoadingApplicants] = useState<Record<string, boolean>>({})
  const [sharingOpening, setSharingOpening] = useState<TeamOpening | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false)
  const [memberMenuOpen, setMemberMenuOpen] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [_updatingMember, setUpdatingMember] = useState<number | null>(null)

  const [pendingPosts, setPendingPosts] = useState<PendingTeamPost[]>([])
  const [pendingPostsLoading, setPendingPostsLoading] = useState(false)
  const [pendingPostsCount, setPendingPostsCount] = useState(0)
  const [approvingPost, setApprovingPost] = useState<number | null>(null)
  const [rejectingPost, setRejectingPost] = useState<number | null>(null)
  const [rejectionNote, setRejectionNote] = useState('')
  const [pendingPostsError, setPendingPostsError] = useState<string | null>(null)

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false)
  const [joinRequestsCount, setJoinRequestsCount] = useState(0)
  const [myJoinRequest, setMyJoinRequest] = useState<JoinRequest | null>(null)
  const [cancellingRequest, setCancellingRequest] = useState(false)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null)

  const isSuperAdmin = currentMember?.role === 'super_admin'
  const isGlobalDirector = hasLeaderAccess(currentMember?.role)
  const isTeamCreator = team?.createdByUuid === currentMember?.uuid
  const isTeamLead = team?.members?.some(m => m.uuid === currentMember?.uuid && m.role === 'lead')
  const isTeamMember = team?.members?.some(m => m.uuid === currentMember?.uuid)
  const canManageMembers = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canManageOpenings = canManageMembers || hasLeaderAccess(currentMember?.role)
  const canChangeRoles = isSuperAdmin || isTeamCreator
  const canApprovePosts = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canManageJoinRequests = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canApply = !!currentMember && !isTeamMember && !myJoinRequest && !isSuperAdmin && !isGlobalDirector

  const [teamError, setTeamError] = useState<string | null>(null)

  const toggleApplicants = async (openingId: string) => {
    if (expandedApplicants[openingId]) {
      setExpandedApplicants(prev => { const n = { ...prev }; delete n[openingId]; return n })
      return
    }
    setLoadingApplicants(prev => ({ ...prev, [openingId]: true }))
    const apps = await jobOpenings.getApplications(openingId)
    setExpandedApplicants(prev => ({ ...prev, [openingId]: apps }))
    setLoadingApplicants(prev => ({ ...prev, [openingId]: false }))
  }

  const fetchTeam = async () => {
    if (!uuid) return
    setIsLoading(true)
    setTeamError(null)
    try {
      const result = await teamService.getTeam(uuid)
      if (result.success) setTeam(result.data.team)
      else setTeamError('not_found')
    } catch (error: any) {
      console.error('Failed to fetch team:', error)
      const msg = error?.message || ''
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('permission')) {
        setTeamError('db_not_setup')
      } else {
        setTeamError('not_found')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ── Fetch openings from Supabase ──────────────────────────────────────────
  const fetchOpenings = async (teamName: string) => {
    setOpeningsLoading(true)
    try {
      const { data, error } = await supabaseCommunity
        .from('job_openings')
        .select('*')
        .eq('team_name', teamName)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
      if (error) throw error
      setOpenings(
        (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          skills: row.skills || [],
          commitment: row.commitment || '',
          category: row.category || '',
          status: row.status as OpeningStatus,
          createdAt: row.created_at,
          createdByName: row.created_by_name || '',
          createdByRole: row.created_by_role || '',
        }))
      )
    } catch (e: any) {
      console.error('[fetchOpenings]', e)
      toastError('Failed to load openings')
    } finally {
      setOpeningsLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [uuid])

  // Fetch openings once team is loaded
  useEffect(() => {
    if (team?.name) fetchOpenings(team.name)
  }, [team?.name])

  useEffect(() => {
    if (!uuid || !currentMember || isTeamMember || isSuperAdmin || isGlobalDirector) return
    teamService.getMyJoinRequest(uuid)
      .then(result => { if (result.success) setMyJoinRequest(result.data.request) })
      .catch(() => {})
  }, [uuid, currentMember, isTeamMember, isSuperAdmin, isGlobalDirector])

  const fetchPendingPosts = async () => {
    if (!uuid) return
    setPendingPostsLoading(true); setPendingPostsError(null)
    try {
      const result = await teamService.getPendingPosts(uuid, { limit: 50 })
      if (result.success) {
        setPendingPosts(result.data)
        setPendingPostsCount(result.pagination?.totalItems || result.data.length)
      }
    } catch (error: any) { setPendingPostsError(error.response?.data?.message || 'Failed to load pending posts') }
    finally { setPendingPostsLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'pending' && canApprovePosts) fetchPendingPosts()
  }, [uuid, activeTab, canApprovePosts])

  useEffect(() => {
    if (uuid && canApprovePosts) {
      teamService.getPendingPosts(uuid, { limit: 1 }).then(result => {
        if (result.success) setPendingPostsCount(result.pagination?.totalItems || result.data.length)
      }).catch(() => {})
    }
  }, [uuid, canApprovePosts])

  const fetchJoinRequests = async () => {
    if (!uuid) return
    setJoinRequestsLoading(true); setJoinRequestsError(null)
    try {
      const result = await teamService.getJoinRequests(uuid)
      if (result.success) { setJoinRequests(result.data.requests); setJoinRequestsCount(result.data.total) }
    } catch (error: any) { setJoinRequestsError(error.response?.data?.message || 'Failed to load applications') }
    finally { setJoinRequestsLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'applications' && canManageJoinRequests) fetchJoinRequests()
  }, [uuid, activeTab, canManageJoinRequests])

  useEffect(() => {
    if (uuid && canManageJoinRequests) {
      teamService.getJoinRequests(uuid).then(result => {
        if (result.success) setJoinRequestsCount(result.data.total)
      }).catch(() => {})
    }
  }, [uuid, canManageJoinRequests])

  const handleApprovePost = async (postId: number) => {
    if (!uuid) return
    setApprovingPost(postId)
    try {
      const result = await teamService.approvePost(uuid, postId)
      if (result.success) {
        toastSuccess('Post approved ✓', 'Now live on the feed.')
        setPendingPosts(prev => prev.filter(p => p.postId !== postId))
        setPendingPostsCount(prev => Math.max(0, prev - 1))
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to approve post'
      toastError(msg); setPendingPostsError(msg)
    } finally { setApprovingPost(null) }
  }

  const handleRejectPost = async (postId: number) => {
    if (!uuid || !rejectionNote.trim()) { setPendingPostsError('Please provide a rejection note'); return }
    setApprovingPost(postId)
    try {
      const result = await teamService.rejectPost(uuid, postId, rejectionNote.trim())
      if (result.success) {
        toastSuccess('Post rejected', 'Author has been notified.')
        setPendingPosts(prev => prev.filter(p => p.postId !== postId))
        setPendingPostsCount(prev => Math.max(0, prev - 1))
        setRejectingPost(null); setRejectionNote('')
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to reject post'
      toastError(msg); setPendingPostsError(msg)
    } finally { setApprovingPost(null) }
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!uuid || !window.confirm('Remove this member from the team?')) return
    setUpdatingMember(memberId)
    try {
      const result = await teamService.removeMember(uuid, memberId)
      if (result.success) { toastSuccess('Member removed'); fetchTeam() }
      else toastError('Failed to remove member')
    } catch { toastError('Failed to remove member') }
    finally { setUpdatingMember(null); setMemberMenuOpen(null); setMenuPosition(null) }
  }

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    if (!uuid) return
    setUpdatingMember(memberId)
    try {
      const result = await teamService.updateMemberRole(uuid, memberId, newRole)
      if (result.success) { toastSuccess('Role updated ✓'); fetchTeam() }
      else toastError('Failed to update role')
    } catch { toastError('Failed to update role') }
    finally { setUpdatingMember(null); setMemberMenuOpen(null); setMenuPosition(null) }
  }

  const handleCancelJoinRequest = async () => {
    if (!uuid || !myJoinRequest) return
    setCancellingRequest(true)
    try {
      await teamService.cancelJoinRequest(uuid, myJoinRequest.uuid)
      setMyJoinRequest(null)
      toastSuccess('Application cancelled')
    } catch { toastError('Failed to cancel application') }
    finally { setCancellingRequest(false) }
  }

  const handleApproveJoinRequest = async (requestUuid: string) => {
    if (!uuid) return
    setProcessingRequest(requestUuid)
    try {
      const result = await teamService.approveJoinRequest(uuid, requestUuid)
      if (result.success) {
        toastSuccess('Application approved ✓', 'Member added to the team.')
        setJoinRequests(prev => prev.filter(r => r.uuid !== requestUuid))
        setJoinRequestsCount(prev => Math.max(0, prev - 1))
        fetchTeam()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to approve application'
      toastError(msg); setJoinRequestsError(msg)
    } finally { setProcessingRequest(null) }
  }

  const handleRejectJoinRequest = async (requestUuid: string) => {
    if (!uuid) return
    setProcessingRequest(requestUuid)
    try {
      const result = await teamService.rejectJoinRequest(uuid, requestUuid)
      if (result.success) {
        toastSuccess('Application declined')
        setJoinRequests(prev => prev.filter(r => r.uuid !== requestUuid))
        setJoinRequestsCount(prev => Math.max(0, prev - 1))
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to reject application'
      toastError(msg); setJoinRequestsError(msg)
    } finally { setProcessingRequest(null) }
  }

  if (isLoading) {
    return (
      <div className="route-enter">
        {/* Team hero */}
        <div style={{ background: 'var(--bg-2)', padding: 'clamp(32px,5vw,56px) var(--page-px,24px)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }} className="sk-group">
            <div className="v6-skeleton sk-pill" style={{ width: 80, height: 20, marginBottom: 18 }} />
            <div className="v6-skeleton" style={{ width: '45%', height: 44, marginBottom: 12 }} />
            <div className="v6-skeleton" style={{ width: '65%', height: 15, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[76, 88, 66].map((w, i) => <div key={i} className="v6-skeleton sk-pill" style={{ width: w, height: 28 }} />)}
            </div>
          </div>
        </div>
        {/* Tabs + member list */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 'clamp(20px,4vw,28px) var(--page-px,24px) 80px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[70, 80, 110, 130].map((w, i) => <div key={i} className="v6-skeleton sk-pill" style={{ width: w, height: 34 }} />)}
          </div>
          <div className="sk-group">
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <div className="v6-skeleton sk-circle" style={{ width: 44, height: 44 }} />
                <div style={{ flex: 1 }}>
                  <div className="v6-skeleton" style={{ width: '38%', height: 14, marginBottom: 7 }} />
                  <div className="v6-skeleton" style={{ width: '24%', height: 11 }} />
                </div>
                <div className="v6-skeleton sk-pill" style={{ width: 58, height: 28 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    if (teamError === 'db_not_setup') {
      return (
        <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(40px,7vw,60px)', paddingBottom: 'clamp(40px,7vw,60px)', textAlign: 'center', maxWidth: 560 }}>
          <span className="sticker sticker-lemon wobble" style={{ display: 'inline-flex', marginBottom: 20 }}>⚠ DB SETUP NEEDED</span>
          <div className="h-display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', marginBottom: 12 }}>teams need setup.</div>
          <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            The teams database tables haven't been created yet. Run <code style={{ fontFamily: 'var(--mono)', fontSize: 13, background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>community_supabase_teams_setup.sql</code> in your Supabase SQL editor to set everything up.
          </p>
          <Link to="/teams" className="btn btn-sm btn-ghost" style={{ display: 'inline-flex' }}>← back to teams</Link>
        </div>
      )
    }
    return (
      <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(44px, 8vw, 80px)', paddingBottom: 'clamp(44px, 8vw, 80px)', textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 40 }}>team not found.</div>
        <Link to="/teams" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>← back to teams</Link>
      </div>
    )
  }

  const catColor = DEPT_COLORS[team.category] || 'var(--accent)'
  const existingMemberIds = team.members?.map(m => m.memberId) || []
  const openOpenings = openings.filter(o => isOpenStatus(o.status))

  return (
    <div className="route-enter">
      {/* Back nav — desktop only; mobile back link lives inside hero */}
      {!isMobile && (
        <div className="aq-wrap" style={{ paddingTop: 'clamp(20px,4vw,28px)' }}>
          <Link to="/teams" className="btn btn-sm">← back to teams</Link>
        </div>
      )}

      {/* Colored hero */}
      <section style={{
        background: catColor, color: '#0A0A0A',
        padding: isMobile ? '20px 16px 28px' : '48px 24px 60px',
        borderBottom: '2px solid var(--ink)',
        margin: isMobile ? '0' : '20px 0 0',
        position: 'relative', overflow: 'hidden',
      }}>
        <Burst size={140} color="rgba(0,0,0,0.08)" style={{ position: 'absolute', top: -20, right: 80 }} />
        <div className="container" style={{ position: 'relative' }}>
          {/* Mobile back link at top */}
          {isMobile && (
            <Link to="/teams" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
              color: 'rgba(0,0,0,0.6)', textDecoration: 'none',
              marginBottom: 12, letterSpacing: '0.04em',
            }}>
              ← TEAMS
            </Link>
          )}
          <div className="row gap-2" style={{ marginBottom: isMobile ? 10 : 16 }}>
            <span className="role" style={{ background: '#0A0A0A', color: catColor, borderColor: '#0A0A0A' }}>★ {teamService.getCategoryLabel(team.category)}</span>
            <span className="role" style={{ background: 'transparent', borderColor: '#0A0A0A' }}>{team.memberCount} members</span>
          </div>
          <h1 className="h-display" style={{ fontSize: 'clamp(40px, 11vw, 96px)', margin: 0, lineHeight: 0.9 }}>{team.name}</h1>
          {team.description && (
            <p style={{
              fontSize: isMobile ? 15 : 20,
              marginTop: isMobile ? 10 : 16,
              maxWidth: 600,
              lineHeight: 1.5,
            }}>{team.description}</p>
          )}
          <div style={{
            marginTop: isMobile ? 16 : 24,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 8 : 8,
            flexWrap: 'wrap',
          }}>
            {isTeamMember && (
              <button
                className="btn btn-lg"
                style={{
                  background: '#0A0A0A', color: catColor,
                  width: isMobile ? '100%' : undefined,
                  justifyContent: isMobile ? 'center' : undefined,
                }}
                onClick={() => setShowCreatePostModal(true)}
              >✎ create post</button>
            )}
            {canApply && (
              <button
                className="btn btn-lg"
                style={{
                  background: 'transparent',
                  width: isMobile ? '100%' : undefined,
                  justifyContent: isMobile ? 'center' : undefined,
                }}
                onClick={() => setShowJoinRequestModal(true)}
              >+ JOIN TEAM</button>
            )}
            {!isTeamMember && myJoinRequest && (
              <div className="row gap-2" style={{ alignItems: 'center', width: isMobile ? '100%' : undefined }}>
                <span className="mono xs upper" style={{ opacity: 0.7 }}>application pending</span>
                <button className="btn btn-sm" style={{ background: 'transparent' }} onClick={handleCancelJoinRequest} disabled={cancellingRequest}>
                  {cancellingRequest ? '...' : 'cancel'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: isMobile ? '20px 16px 80px' : '32px 24px 80px' }}>
        {/* Tabs */}
        <div className="tabs team-tabs-scroll">
          {(['about', 'members'] as const).map(t => (
            <button key={t} className={'tab ' + (activeTab === t ? 'active' : '')} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'members' ? ` (${team.memberCount})` : ''}
            </button>
          ))}
          <button className={'tab ' + (activeTab === 'openings' ? 'active' : '')} onClick={() => setActiveTab('openings')}>
            Openings{openOpenings.length > 0 && <span className="count" style={{ background: 'var(--mint)', color: '#0A0A0A' }}>{openOpenings.length}</span>}
          </button>
          {canApprovePosts && (
            <button className={'tab ' + (activeTab === 'pending' ? 'active' : '')} onClick={() => setActiveTab('pending')}>
              Pending Posts{pendingPostsCount > 0 && <span className="count">{pendingPostsCount}</span>}
            </button>
          )}
          {canManageJoinRequests && (
            <button className={'tab ' + (activeTab === 'applications' ? 'active' : '')} onClick={() => setActiveTab('applications')}>
              Applications{joinRequestsCount > 0 && <span className="count">{joinRequestsCount}</span>}
            </button>
          )}
        </div>
        <div style={{ paddingTop: 24 }}>

        {/* About */}
        {activeTab === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Main description card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ background: catColor, padding: '20px 24px', borderBottom: '2px solid var(--ink)', color: '#0A0A0A' }}>
                <div className="mono xs upper" style={{ fontWeight: 800, letterSpacing: '0.06em', opacity: 0.7 }}>what we do</div>
              </div>
              <div style={{ padding: '24px 24px 20px' }}>
                {team.description
                  ? <p style={{ fontFamily: 'var(--eina)', fontSize: 16, lineHeight: 1.78, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', margin: 0 }}>{team.description}</p>
                  : <p style={{ fontStyle: 'italic', color: 'var(--ink-3)', margin: 0 }}>No description provided yet.</p>
                }
              </div>
            </div>

            {/* Stats row */}
            <div className="team-detail-stats-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 14 }}>
              {[
                { label: 'Members', value: team.memberCount || 0 },
                { label: 'Category', value: teamService.getCategoryLabel(team.category) },
                { label: 'Status', value: 'Active' },
              ].map(stat => (
                <div key={stat.label} className="card" style={{ padding: isMobile ? '14px 12px' : '18px 20px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: isMobile ? 22 : 28, lineHeight: 1, color: catColor, fontVariantNumeric: 'tabular-nums' }}>{stat.value}</div>
                  <div className="mono xs muted" style={{ marginTop: isMobile ? 4 : 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Team leads */}
            {team.members && team.members.some((m: any) => m.role === 'lead') && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="mono xs upper" style={{ fontWeight: 800, letterSpacing: '0.06em', color: 'var(--ink-2)' }}>team leads</div>
                </div>
                {team.members.filter((m: any) => m.role === 'lead').map((lead: any, i: number, arr: any[]) => (
                  <div key={lead.uuid} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                    <div className="avatar" style={{ background: catColor, overflow: 'hidden', width: 42, height: 42, fontSize: 14, flexShrink: 0 }}>
                      {lead.avatarUrl ? <img src={lead.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(lead.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{lead.fullName}</div>
                      <div className="mono xs muted">{lead.email}</div>
                    </div>
                    <span className="role role-lead" style={{ fontSize: 10, background: catColor, color: '#0A0A0A', borderColor: catColor }}>LEAD</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="card" style={{ padding: 0 }}>
            <div className="row" style={{ padding: isMobile ? '14px 16px' : 20, justifyContent: 'space-between', borderBottom: '2px solid var(--ink)' }}>
              <div className="h-display" style={{ fontSize: isMobile ? 22 : 28 }}>members</div>
              {canManageMembers && (
                <button onClick={() => setShowAddMemberModal(true)} className="btn btn-sm btn-primary">
                  <I.plus /> {isMobile ? 'ADD' : 'ADD MEMBER'}
                </button>
              )}
            </div>
            {team.members && team.members.length > 0 ? (
              team.members.map((member, i) => (
                <div key={member.uuid} style={{ padding: isMobile ? '14px 16px' : 16, display: 'grid', gridTemplateColumns: isMobile ? 'auto 1fr auto' : 'auto 1fr auto auto', gap: isMobile ? 12 : 16, alignItems: 'center', minHeight: isMobile ? 64 : 52, borderBottom: i < team.members.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                  <Link to={`/profile/${member.uuid}`} style={{ textDecoration: 'none', display: 'flex' }}>
                    <div className="avatar" style={{ background: catColor, overflow: 'hidden' }}>
                      {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(member.fullName)}
                    </div>
                  </Link>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{member.fullName}</div>
                    <div className="mono small muted">{member.email}</div>
                  </div>
                  <span className={'role role-' + member.role}>{teamService.getRoleLabel(member.role)}</span>
                  {canManageMembers && member.uuid !== currentMember?.uuid && (
                    <div style={{ position: 'relative' }}>
                      <button
                        ref={el => { if (el) menuButtonRefs.current.set(member.memberId, el) }}
                        className="btn btn-icon btn-sm"
                        onClick={() => {
                          if (memberMenuOpen === member.memberId) { setMemberMenuOpen(null); setMenuPosition(null); return }
                          const button = menuButtonRefs.current.get(member.memberId)
                          if (button) {
                            const rect = button.getBoundingClientRect()
                            const mw = 180, mh = 160
                            let left = rect.right - mw, top = rect.bottom + 4
                            if (top + mh > window.innerHeight) top = rect.top - mh - 4
                            if (left < 8) left = 8
                            setMenuPosition({ top, left })
                          }
                          setMemberMenuOpen(member.memberId)
                        }}
                        aria-label="Member options"
                      >
                        <I.more />
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: 48, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)' }}>no members yet.</div>
            )}
          </div>
        )}

        {/* Pending Posts */}
        {activeTab === 'pending' && canApprovePosts && (
          <>
            {pendingPostsError && (
              <div className="card" style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(224,92,92,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#e05c5c', fontSize: 13 }}>{pendingPostsError}</span>
                <button onClick={() => setPendingPostsError(null)} style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer' }}>✕</button>
              </div>
            )}
            {pendingPostsLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="mono xs upper muted">loading…</div></div>
            ) : pendingPosts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pendingPosts.length > 0 && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    These posts are awaiting review by a Director or HoD before they can be published.
                  </div>
                )}
                {pendingPosts.map(post => (
                  <div key={post.postId} className="card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <Link to={`/profile/${post.authorUuid}`} style={{ textDecoration: 'none' }}>
                        <div className="avatar" style={{ background: catColor, overflow: 'hidden', width: 36, height: 36, fontSize: 12 }}>
                          {post.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(post.authorName)}
                        </div>
                      </Link>
                      <div>
                        <Link to={`/profile/${post.authorUuid}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', textDecoration: 'none' }}>{post.authorName}</Link>
                        <div className="mono xs muted">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.body}</p>
                    {post.images && post.images.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12, borderRadius: 10, overflow: 'hidden' }}>
                        {post.images.map(img => <img key={img.blobUrl} src={img.blobUrl} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />)}
                      </div>
                    )}
                    {rejectingPost === post.postId ? (
                      <div style={{ marginBottom: 12, padding: 12, background: 'rgba(224,92,92,0.06)', borderRadius: 10 }}>
                        <label className="mono xs upper muted" style={{ fontWeight: 700, color: '#e05c5c', display: 'block', marginBottom: 8 }}>rejection note *</label>
                        <textarea className="textarea" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={2} placeholder="explain why…" style={{ marginBottom: 8 }} />
                        <div className="row gap-2">
                          <button onClick={() => handleRejectPost(post.postId)} disabled={!rejectionNote.trim() || approvingPost === post.postId} className="btn btn-tomato btn-sm">
                            {approvingPost === post.postId ? '…' : 'confirm reject'}
                          </button>
                          <button onClick={() => { setRejectingPost(null); setRejectionNote('') }} className="btn btn-sm">cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="row gap-2" style={{ paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                        <button onClick={() => handleApprovePost(post.postId)} disabled={approvingPost === post.postId} className="btn btn-sm btn-primary">
                          {approvingPost === post.postId ? '…' : '✓ approve'}
                        </button>
                        <button onClick={() => setRejectingPost(post.postId)} className="btn btn-sm" style={{ color: '#e05c5c' }}>✕ reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div className="h-display" style={{ fontSize: 28 }}>all caught up.</div>
                <p className="muted" style={{ marginTop: 8 }}>no posts waiting for review.</p>
              </div>
            )}
          </>
        )}

        {/* ── Openings ── */}
        {activeTab === 'openings' && (
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="h-display" style={{ fontSize: 28, marginBottom: 4 }}>open roles</div>
                <p className="mono xs muted">{openOpenings.length} position{openOpenings.length !== 1 ? 's' : ''} available</p>
              </div>
              {canManageOpenings && (
                <button className="btn btn-sm btn-primary" onClick={() => setEditingOpening('new')}>
                  <I.plus /> Add Opening
                </button>
              )}
            </div>

            {openingsLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="mono xs upper muted">loading…</div></div>
            ) : openings.length === 0 ? (
              <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                <span className="sticker sticker-lemon" style={{ display: 'inline-block', marginBottom: 16 }}>★ nothing yet</span>
                <div className="h-display" style={{ fontSize: 28 }}>no openings posted.</div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {canManageOpenings ? 'Add the first opening to start recruiting.' : 'Check back soon — the team may post openings.'}
                </p>
                {canManageOpenings && (
                  <button className="btn btn-sm btn-primary" style={{ marginTop: 16 }} onClick={() => setEditingOpening('new')}>
                    <I.plus /> Post an opening
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {openings.map(op => {
                  const isOpen = isOpenStatus(op.status)
                  const badge = STATUS_BADGE[op.status]
                  return (
                    <div
                      key={op.id}
                      style={{
                        padding: 0, overflow: 'hidden',
                        borderRadius: 16,
                        border: '2px solid var(--ink)',
                        boxShadow: '3px 3px 0 0 var(--ink)',
                        borderLeft: `5px solid ${isOpen ? catColor : 'var(--line)'}`,
                        background: 'var(--card)',
                        opacity: isOpen ? 1 : 0.55,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{ padding: '20px 22px' }}>
                        {/* Title row */}
                        {isMobile ? (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                              {op.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {op.status !== 'open' && (
                                <span style={{
                                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                                  padding: '3px 10px', borderRadius: 999,
                                  background: badge.color + '22',
                                  color: badge.color,
                                  border: `1px solid ${badge.color}44`,
                                  textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                  {badge.label}
                                </span>
                              )}
                              {canManageOpenings && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                  onClick={() => setEditingOpening(op)}
                                  title="Edit opening"
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                {op.title}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                              {op.status !== 'open' && (
                                <span style={{
                                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                                  padding: '3px 10px', borderRadius: 999,
                                  background: badge.color + '22',
                                  color: badge.color,
                                  border: `1px solid ${badge.color}44`,
                                  textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>
                                  {badge.label}
                                </span>
                              )}
                              {canManageOpenings && (
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: 12 }}
                                  onClick={() => setEditingOpening(op)}
                                  title="Edit opening"
                                >
                                  ✎
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                          {op.description}
                        </p>

                        {/* Skills */}
                        {op.skills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {op.skills.map(s => (
                              <span key={s} className="chip" style={{ fontSize: 11, background: catColor + '18', color: catColor, borderColor: catColor + '44' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer row */}
                        <div className="opening-footer-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                          {op.commitment && (
                            <span className="mono xs muted">⏱ {op.commitment}</span>
                          )}
                          {/* Story card share button */}
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: 12 }}
                            onClick={() => setSharingOpening(op)}
                            title="Generate Instagram story card"
                          >
                            🎨
                          </button>
                          <span style={{ flex: 1 }} />
                          {isOpen ? (
                            currentMember && !isTeamMember ? (
                              myJoinRequest ? (
                                <span className="chip" style={{ fontSize: 11 }}>application pending</span>
                              ) : (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => setApplyingFor(op)}
                                >
                                  Apply for this role →
                                </button>
                              )
                            ) : isTeamMember ? (
                              <span className="mono xs muted">you're in the team</span>
                            ) : (
                              <Link to="/login" className="btn btn-sm">log in to apply</Link>
                            )
                          ) : (
                            <span className="chip" style={{ fontSize: 11, color: 'var(--ink-3)' }}>position {op.status}</span>
                          )}
                        </div>
                        {canManageOpenings && (
                          <div style={{ marginTop: 8 }}>
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 11, color: 'var(--mint)' }}
                              onClick={() => toggleApplicants(op.id)}
                            >
                              {loadingApplicants[op.id] ? 'loading…'
                                : expandedApplicants[op.id]
                                  ? `hide applicants (${expandedApplicants[op.id].length})`
                                  : 'view applicants →'}
                            </button>
                            {expandedApplicants[op.id] && (
                              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {expandedApplicants[op.id].length === 0
                                  ? <div className="mono xs muted">no applications yet.</div>
                                  : expandedApplicants[op.id].map((app: any) => (
                                      <div key={app.id} style={{ padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                          <div style={{ fontWeight: 700, fontSize: 13 }}>{app.applicant_name || 'Anonymous'}</div>
                                          <select
                                            value={app.status}
                                            onChange={async e => {
                                              const newStatus = e.target.value as any
                                              await jobOpenings.updateApplicationStatus(app.id, newStatus)
                                              setExpandedApplicants(prev => ({
                                                ...prev,
                                                [op.id]: prev[op.id].map((a: any) => a.id === app.id ? { ...a, status: newStatus } : a)
                                              }))
                                            }}
                                            style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, border: '1.5px solid var(--line-2)', background: 'var(--card)', color: app.status === 'accepted' ? 'var(--mint)' : app.status === 'rejected' ? '#e05c5c' : 'var(--ink-2)', cursor: 'pointer' }}
                                          >
                                            <option value="pending">Pending</option>
                                            <option value="reviewed">Reviewed</option>
                                            <option value="accepted">Accepted</option>
                                            <option value="rejected">Rejected</option>
                                          </select>
                                        </div>
                                        {app.applicant_email && <div className="mono xs muted" style={{ marginTop: 3 }}>{app.applicant_email}</div>}
                                        {app.message && <p style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '8px 0 0' }}>{app.message}</p>}
                                        <div className="mono xs muted" style={{ marginTop: 6 }}>{new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                      </div>
                                    ))
                                }
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Applications */}
        {activeTab === 'applications' && canManageJoinRequests && (
          <>
            {joinRequestsError && (
              <div className="card" style={{ padding: '10px 14px', marginBottom: 16, background: 'rgba(224,92,92,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#e05c5c', fontSize: 13 }}>{joinRequestsError}</span>
                <button onClick={() => setJoinRequestsError(null)} style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer' }}>✕</button>
              </div>
            )}
            {joinRequestsLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="mono xs upper muted">loading…</div></div>
            ) : joinRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {joinRequests.map(req => (
                  <div key={req.uuid} className="card" style={{ padding: isMobile ? 14 : 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 14 }}>
                      <div className="avatar" style={{ background: catColor, overflow: 'hidden', flexShrink: 0 }}>
                        {req.avatarUrl ? <img src={req.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(req.fullName || '?')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row gap-2" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
                          {req.memberUuid
                            ? <Link to={`/profile/${req.memberUuid}`} style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', textDecoration: 'none' }}>{req.fullName}</Link>
                            : <span style={{ fontWeight: 700, fontSize: 15 }}>{req.fullName}</span>
                          }
                          <span className="mono xs muted">{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="mono xs muted" style={{ marginBottom: 10 }}>{req.email}</div>
                        {req.message && (
                          <div className="card" style={{ padding: '8px 12px', marginBottom: 12, fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)' }}>
                            "{req.message}"
                          </div>
                        )}
                        <div className="row gap-2">
                          <button onClick={() => handleApproveJoinRequest(req.uuid)} disabled={processingRequest === req.uuid} className="btn btn-sm btn-primary">
                            {processingRequest === req.uuid ? '…' : '✓ approve'}
                          </button>
                          <button onClick={() => handleRejectJoinRequest(req.uuid)} disabled={processingRequest === req.uuid} className="btn btn-sm" style={{ color: '#e05c5c' }}>
                            ✕ decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div className="h-display" style={{ fontSize: 28 }}>no applications.</div>
                <p className="muted" style={{ marginTop: 8 }}>no pending join requests.</p>
              </div>
            )}
          </>
        )}
        </div>{/* /paddingTop */}
      </div>{/* /container */}

      <style>{`
        @media (max-width: 600px) {
          .team-detail-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 400px) {
          .team-detail-stats-grid { grid-template-columns: 1fr !important; }
        }
        /* Opening card action buttons — stack on very small screens */
        @media (max-width: 480px) {
          .opening-footer-row { flex-direction: column !important; align-items: flex-start !important; }
        }
        /* Scrollable tabs with fade affordance */
        .team-tabs-scroll {
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          -ms-overflow-style: none;
          position: relative;
        }
        .team-tabs-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 640px) {
          .team-tabs-scroll {
            padding-bottom: 2px;
            mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black calc(100% - 32px), transparent 100%);
          }
          /* Stat cards on mobile */
          .team-detail-stats-grid .card { padding: 14px 12px !important; }
        }
      `}</style>

      {/* Modals */}
      <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} onSuccess={fetchTeam} teamUuid={uuid || ''} existingMemberIds={existingMemberIds} />

      {team && (
        <CreateTeamPostModal
          isOpen={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          onSuccess={() => { if (canApprovePosts) fetchPendingPosts() }}
          teamUuid={uuid || ''}
          teamName={team.name}
          teamCategory={team.category}
          members={team.members || []}
        />
      )}

      {team && (
        <JoinRequestModal
          isOpen={showJoinRequestModal}
          onClose={() => setShowJoinRequestModal(false)}
          teamName={team.name}
          teamUuid={uuid || ''}
          onSuccess={() => {
            if (uuid) teamService.getMyJoinRequest(uuid).then(r => { if (r.success) setMyJoinRequest(r.data.request) }).catch(() => {})
          }}
        />
      )}

      {/* ── Opening Share / Story Modal ── */}
      {sharingOpening && uuid && team && (
        <ShareModal
          url={`${window.location.origin}/teams/${uuid}`}
          storyData={{
            type: 'opening',
            teamName: team.name,
            teamCategory: team.category,
            openingTitle: sharingOpening.title,
            description: sharingOpening.description,
            skills: sharingOpening.skills,
            teamUuid: uuid,
          }}
          onClose={() => setSharingOpening(null)}
        />
      )}

      {/* ── Opening Edit Modal — proper component, no IIFE ── */}
      {editingOpening !== null && uuid && (
        <OpeningEditModal
          opening={editingOpening}
          teamName={team?.name}
          teamCategory={team?.category}
          member={currentMember ? { fullName: currentMember.full_name || '', role: currentMember.role || 'hod' } : null}
          onClose={() => setEditingOpening(null)}
          onSaved={() => { if (team?.name) fetchOpenings(team.name) }}
        />
      )}

      {/* ── Apply for Opening Modal — proper component, no IIFE ── */}
      {applyingFor && uuid && team && (
        <ApplyForOpeningModal
          opening={applyingFor}
          teamName={team.name}
          teamUuid={uuid}
          catColor={catColor}
          onClose={() => setApplyingFor(null)}
          onSuccess={() => {
            if (uuid) teamService.getMyJoinRequest(uuid).then(r => { if (r.success) setMyJoinRequest(r.data.request) }).catch(() => {})
          }}
        />
      )}

      {/* Member Actions Dropdown (Portal) */}
      {memberMenuOpen !== null && menuPosition && createPortal(
        (() => {
          const targetMember = team?.members?.find(m => m.memberId === memberMenuOpen)
          const availableRoles = teamService.getRoles().filter(role => {
            if (role === 'member') return true
            if (role === 'lead') return canChangeRoles
            return false
          })
          return (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setMemberMenuOpen(null); setMenuPosition(null) }} />
              <div className="menu" style={{ position: 'fixed', zIndex: 9999, top: menuPosition.top, left: menuPosition.left }}>
                {canChangeRoles && availableRoles.length > 1 && (
                  <>
                    <div className="mono xs upper muted" style={{ padding: '4px 12px' }}>change role</div>
                    {availableRoles.map(role => (
                      <div key={role} className="menu-item" onClick={() => handleUpdateRole(memberMenuOpen, role)}
                        style={{ color: targetMember?.role === role ? 'var(--mint)' : undefined }}
                      >
                        {teamService.getRoleLabel(role)}{targetMember?.role === role ? ' ✓' : ''}
                      </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  </>
                )}
                <div className="menu-item danger" onClick={() => handleRemoveMember(memberMenuOpen)}>
                  Remove from Team
                </div>
              </div>
            </>
          )
        })(),
        document.body
      )}
    </div>
  )
}

export default TeamDetailPage
