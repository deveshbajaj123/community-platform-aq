import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import teamService, { TeamDetails, PendingTeamPost, JoinRequest } from '../services/teamService'
import AddMemberModal from './AddMemberModal'
import CreateTeamPostModal from './CreateTeamPostModal'
import JoinRequestModal from './JoinRequestModal'
import { useAuth } from '../auth/AuthContext'
import { DEPT_COLORS } from '../lib/supabase'

const initials = (name: string) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)

const TeamDetailPage = () => {
  const { uuid } = useParams<{ uuid: string }>()
  const { member: currentMember } = useAuth()
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'about' | 'members' | 'pending' | 'applications'>('about')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [showJoinRequestModal, setShowJoinRequestModal] = useState(false)
  const [memberMenuOpen, setMemberMenuOpen] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [updatingMember, setUpdatingMember] = useState<number | null>(null)

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
  const isGlobalDirector = currentMember?.role === 'director'
  const isTeamCreator = team?.createdByUuid === currentMember?.uuid
  const isTeamLead = team?.members?.some(m => m.uuid === currentMember?.uuid && m.role === 'lead')
  const isTeamMember = team?.members?.some(m => m.uuid === currentMember?.uuid)
  const canManageMembers = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canChangeRoles = isSuperAdmin || isTeamCreator
  const canApprovePosts = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canManageJoinRequests = isSuperAdmin || isGlobalDirector || isTeamCreator || isTeamLead
  const canApply = !!currentMember && !isTeamMember && !myJoinRequest && !isSuperAdmin && !isGlobalDirector

  const fetchTeam = async () => {
    if (!uuid) return
    setIsLoading(true)
    try {
      const result = await teamService.getTeam(uuid)
      if (result.success) setTeam(result.data.team)
    } catch (error) { console.error('Failed to fetch team:', error) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { fetchTeam() }, [uuid])

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
      if (result.success) { setPendingPosts(prev => prev.filter(p => p.postId !== postId)); setPendingPostsCount(prev => Math.max(0, prev - 1)) }
    } catch (error: any) { setPendingPostsError(error.response?.data?.message || 'Failed to approve post') }
    finally { setApprovingPost(null) }
  }

  const handleRejectPost = async (postId: number) => {
    if (!uuid || !rejectionNote.trim()) { setPendingPostsError('Please provide a rejection note'); return }
    setApprovingPost(postId)
    try {
      const result = await teamService.rejectPost(uuid, postId, rejectionNote.trim())
      if (result.success) {
        setPendingPosts(prev => prev.filter(p => p.postId !== postId))
        setPendingPostsCount(prev => Math.max(0, prev - 1))
        setRejectingPost(null); setRejectionNote('')
      }
    } catch (error: any) { setPendingPostsError(error.response?.data?.message || 'Failed to reject post') }
    finally { setApprovingPost(null) }
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!uuid || !window.confirm('Remove this member from the team?')) return
    setUpdatingMember(memberId)
    try {
      const result = await teamService.removeMember(uuid, memberId)
      if (result.success) fetchTeam()
    } catch { console.error('Failed to remove member') }
    finally { setUpdatingMember(null); setMemberMenuOpen(null); setMenuPosition(null) }
  }

  const handleUpdateRole = async (memberId: number, newRole: string) => {
    if (!uuid) return
    setUpdatingMember(memberId)
    try {
      const result = await teamService.updateMemberRole(uuid, memberId, newRole)
      if (result.success) fetchTeam()
    } catch { console.error('Failed to update role') }
    finally { setUpdatingMember(null); setMemberMenuOpen(null); setMenuPosition(null) }
  }

  const handleCancelJoinRequest = async () => {
    if (!uuid || !myJoinRequest) return
    setCancellingRequest(true)
    try { await teamService.cancelJoinRequest(uuid, myJoinRequest.uuid); setMyJoinRequest(null) }
    catch { console.error('Failed to cancel request') }
    finally { setCancellingRequest(false) }
  }

  const handleApproveJoinRequest = async (requestUuid: string) => {
    if (!uuid) return
    setProcessingRequest(requestUuid)
    try {
      const result = await teamService.approveJoinRequest(uuid, requestUuid)
      if (result.success) {
        setJoinRequests(prev => prev.filter(r => r.uuid !== requestUuid))
        setJoinRequestsCount(prev => Math.max(0, prev - 1))
        fetchTeam()
      }
    } catch (err: any) { setJoinRequestsError(err?.response?.data?.message || 'Failed to approve application') }
    finally { setProcessingRequest(null) }
  }

  const handleRejectJoinRequest = async (requestUuid: string) => {
    if (!uuid) return
    setProcessingRequest(requestUuid)
    try {
      const result = await teamService.rejectJoinRequest(uuid, requestUuid)
      if (result.success) { setJoinRequests(prev => prev.filter(r => r.uuid !== requestUuid)); setJoinRequestsCount(prev => Math.max(0, prev - 1)) }
    } catch (err: any) { setJoinRequestsError(err?.response?.data?.message || 'Failed to reject application') }
    finally { setProcessingRequest(null) }
  }

  if (isLoading) {
    return (
      <div className="aq-page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 320, gap: 16 }}>
        <div className="aq-spinner" />
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.08em' }}>LOADING TEAM</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="aq-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 14, color: 'var(--txt)', marginBottom: 8 }}>Team not found</div>
          <Link to="/teams" className="aq-btn aq-btn-accent aq-btn-sm">Back to Teams</Link>
        </div>
      </div>
    )
  }

  const catColor = DEPT_COLORS[team.category] || 'var(--accent)'
  const existingMemberIds = team.members?.map(m => m.memberId) || []

  const errStyle: React.CSSProperties = {
    background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)',
    borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 16,
    color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }

  return (
    <div className="aq-page">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 20px 64px' }}>
        {/* Back */}
        <Link to="/teams" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--f-display)', fontSize: 12, color: 'var(--txt-3)', marginBottom: 20, textDecoration: 'none' }}>
          ← Back to Teams
        </Link>

        {/* Header card */}
        <div className="aq-post-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ height: 4, background: catColor }} />
          <div style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Logo */}
              <div className="aq-avatar" style={{ width: 60, height: 60, fontSize: 22, background: catColor, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0 }}>
                {team.logoUrl
                  ? <img src={team.logoUrl} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : team.name.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: catColor, border: `1px solid ${catColor}`, padding: '2px 8px', borderRadius: 'var(--r-pill)', marginRight: 8 }}>
                    {teamService.getCategoryLabel(team.category)}
                  </span>
                </div>
                <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.03em', color: 'var(--txt)', marginBottom: 8 }}>{team.name}</h1>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 16 }}>
                  {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {isTeamMember && (
                    <button onClick={() => setShowCreatePostModal(true)} className="aq-btn aq-btn-accent aq-btn-sm">✎ Create Post</button>
                  )}
                  {canApply && (
                    <button onClick={() => setShowJoinRequestModal(true)} className="aq-btn aq-btn-outline aq-btn-sm">Apply to Join</button>
                  )}
                  {!isTeamMember && myJoinRequest && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-3)', letterSpacing: '0.04em' }}>Application pending</span>
                      <button onClick={handleCancelJoinRequest} disabled={cancellingRequest} className="aq-btn aq-btn-outline aq-btn-sm">
                        {cancellingRequest ? '...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="aq-profile-tabs" style={{ marginBottom: 20 }}>
          {(['about', 'members'] as const).map(tab => (
            <button key={tab} className={`aq-profile-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'members' ? ` (${team.memberCount})` : ''}
            </button>
          ))}
          {canApprovePosts && (
            <button className={`aq-profile-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Pending Posts
              {pendingPostsCount > 0 && (
                <span style={{ background: 'rgba(212,98,10,0.18)', color: 'var(--c-events)', fontFamily: 'var(--f-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-pill)' }}>{pendingPostsCount}</span>
              )}
            </button>
          )}
          {canManageJoinRequests && (
            <button className={`aq-profile-tab ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Applications
              {joinRequestsCount > 0 && (
                <span style={{ background: 'rgba(42,157,110,0.18)', color: 'var(--accent)', fontFamily: 'var(--f-mono)', fontSize: 9, padding: '1px 6px', borderRadius: 'var(--r-pill)' }}>{joinRequestsCount}</span>
              )}
            </button>
          )}
        </div>

        {/* About */}
        {activeTab === 'about' && (
          <div className="aq-post-card">
            <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--txt-3)', marginBottom: 12 }}>About this Team</div>
            {team.description
              ? <p style={{ fontFamily: 'var(--f-body)', fontSize: 15, lineHeight: 1.7, color: 'var(--txt)', whiteSpace: 'pre-wrap' }}>{team.description}</p>
              : <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-4)' }}>No description provided.</p>
            }
          </div>
        )}

        {/* Members */}
        {activeTab === 'members' && (
          <div className="aq-post-card">
            {canManageMembers && (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAddMemberModal(true)} className="aq-btn aq-btn-accent aq-btn-sm">+ Add Members</button>
              </div>
            )}
            {team.members && team.members.length > 0 ? (
              <div>
                {team.members.map(member => (
                  <div key={member.uuid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', minHeight: 56, borderBottom: '1px solid var(--line)' }}>
                    <Link to={`/profile/${member.uuid}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: catColor, flexShrink: 0, overflow: 'hidden' }}>
                        {member.avatarUrl ? <img src={member.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(member.fullName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.fullName}</div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</div>
                      </div>
                    </Link>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: member.role === 'lead' ? 'var(--accent)' : 'var(--txt-4)', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {teamService.getRoleLabel(member.role)}
                    </span>
                    {canManageMembers && member.uuid !== currentMember?.uuid && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          ref={el => { if (el) menuButtonRefs.current.set(member.memberId, el) }}
                          className="aq-nav-ghost-btn"
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
                          ⋯
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', color: 'var(--txt-4)', textAlign: 'center', padding: '32px 0' }}>No members yet.</p>
            )}
          </div>
        )}

        {/* Pending Posts */}
        {activeTab === 'pending' && canApprovePosts && (
          <>
            {pendingPostsError && (
              <div style={errStyle}>{pendingPostsError}<button onClick={() => setPendingPostsError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button></div>
            )}
            {pendingPostsLoading ? (
              <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div className="aq-spinner" />
              </div>
            ) : pendingPosts.length > 0 ? (
              <div>
                {pendingPosts.map(post => (
                  <div key={post.postId} className="aq-post-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Link to={`/profile/${post.authorUuid}`}>
                        <div className="aq-avatar" style={{ width: 32, height: 32, fontSize: 11, background: catColor, overflow: 'hidden', flexShrink: 0 }}>
                          {post.authorAvatar ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(post.authorName)}
                        </div>
                      </Link>
                      <div>
                        <Link to={`/profile/${post.authorUuid}`} style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', textDecoration: 'none' }}>{post.authorName}</Link>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'var(--f-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--txt)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.body}</p>
                    {post.images && post.images.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                        {post.images.map(img => <img key={img.blobUrl} src={img.blobUrl} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 'var(--r-xs)' }} />)}
                      </div>
                    )}
                    {rejectingPost === post.postId && (
                      <div style={{ marginBottom: 12, padding: '12px', background: 'rgba(224,92,92,0.06)', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r)' }}>
                        <label style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e05c5c', display: 'block', marginBottom: 8 }}>Rejection Note *</label>
                        <textarea className="aq-input" value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} rows={2} placeholder="Explain why this post is being rejected..." style={{ marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleRejectPost(post.postId)} disabled={!rejectionNote.trim() || approvingPost === post.postId}
                            style={{ background: 'rgba(224,92,92,0.15)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r-pill)', padding: '8px 16px', minHeight: 36, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.15s, transform 0.12s var(--ease)' }}
                            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                            onMouseUp={e => (e.currentTarget.style.transform = '')}
                            onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                            {approvingPost === post.postId ? '...' : 'Confirm Reject'}
                          </button>
                          <button onClick={() => { setRejectingPost(null); setRejectionNote('') }} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
                        </div>
                      </div>
                    )}
                    {rejectingPost !== post.postId && (
                      <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                        <button onClick={() => handleApprovePost(post.postId)} disabled={approvingPost === post.postId}
                          style={{ background: 'rgba(42,157,110,0.15)', color: 'var(--accent)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r-pill)', padding: '8px 16px', minHeight: 36, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.15s, transform 0.12s var(--ease)' }}
                          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                          onMouseUp={e => (e.currentTarget.style.transform = '')}
                          onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                          {approvingPost === post.postId ? '...' : '✓ Approve'}
                        </button>
                        <button onClick={() => setRejectingPost(post.postId)}
                          style={{ background: 'rgba(224,92,92,0.1)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r-pill)', padding: '8px 16px', minHeight: 36, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.15s, transform 0.12s var(--ease)' }}
                          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                          onMouseUp={e => (e.currentTarget.style.transform = '')}
                          onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>All posts reviewed.</p>
              </div>
            )}
          </>
        )}

        {/* Applications */}
        {activeTab === 'applications' && canManageJoinRequests && (
          <>
            {joinRequestsError && (
              <div style={errStyle}>{joinRequestsError}<button onClick={() => setJoinRequestsError(null)} style={{ background: 'none', color: '#e05c5c' }}>✕</button></div>
            )}
            {joinRequestsLoading ? (
              <div style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div className="aq-spinner" />
              </div>
            ) : joinRequests.length > 0 ? (
              <div>
                {joinRequests.map(req => (
                  <div key={req.uuid} className="aq-post-card" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div className="aq-avatar" style={{ width: 36, height: 36, fontSize: 12, background: catColor, flexShrink: 0, overflow: 'hidden' }}>
                        {req.avatarUrl ? <img src={req.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(req.fullName || '?')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                          {req.memberUuid
                            ? <Link to={`/profile/${req.memberUuid}`} style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)', textDecoration: 'none' }}>{req.fullName}</Link>
                            : <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{req.fullName}</span>
                          }
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginBottom: 8 }}>{req.email}</div>
                        {req.message && (
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '8px 12px', marginBottom: 12, fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--txt-2)' }}>
                            "{req.message}"
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleApproveJoinRequest(req.uuid)} disabled={processingRequest === req.uuid}
                            style={{ background: 'rgba(42,157,110,0.15)', color: 'var(--accent)', border: '1px solid rgba(42,157,110,0.3)', borderRadius: 'var(--r-pill)', padding: '8px 16px', minHeight: 36, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.15s, transform 0.12s var(--ease)' }}
                          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                          onMouseUp={e => (e.currentTarget.style.transform = '')}
                          onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                            {processingRequest === req.uuid ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={() => handleRejectJoinRequest(req.uuid)} disabled={processingRequest === req.uuid}
                            style={{ background: 'rgba(224,92,92,0.1)', color: '#e05c5c', border: '1px solid rgba(224,92,92,0.2)', borderRadius: 'var(--r-pill)', padding: '8px 16px', minHeight: 36, fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'background 0.15s, transform 0.12s var(--ease)' }}
                          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                          onMouseUp={e => (e.currentTarget.style.transform = '')}
                          onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aq-post-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--txt-2)' }}>No pending applications.</p>
              </div>
            )}
          </>
        )}
      </div>

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
              <div style={{ position: 'fixed', width: 180, background: 'var(--bg-3)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', boxShadow: 'var(--shadow-lg)', zIndex: 9999, top: menuPosition.top, left: menuPosition.left, padding: 6 }}>
                {canChangeRoles && availableRoles.length > 1 && (
                  <>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--txt-4)', padding: '6px 10px' }}>Change Role</div>
                    {availableRoles.map(role => (
                      <button key={role} onClick={() => handleUpdateRole(memberMenuOpen, role)}
                        disabled={updatingMember === memberMenuOpen || targetMember?.role === role}
                        style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', minHeight: 40, fontFamily: 'var(--f-display)', fontSize: 12, color: targetMember?.role === role ? 'var(--accent)' : 'var(--txt)', borderRadius: 'var(--r-sm)', background: 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        {teamService.getRoleLabel(role)}{targetMember?.role === role ? ' ✓' : ''}
                      </button>
                    ))}
                    <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
                  </>
                )}
                <button onClick={() => handleRemoveMember(memberMenuOpen)} disabled={updatingMember === memberMenuOpen}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', minHeight: 40, fontFamily: 'var(--f-display)', fontSize: 12, color: '#e05c5c', borderRadius: 'var(--r-sm)', background: 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,92,92,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  Remove from Team
                </button>
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
