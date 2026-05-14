import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import feedService, { CreatePostData } from '../services/feedService'
import teamService, { Team, TeamMember } from '../services/teamService'
import { useAuth } from '../auth/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { feedService as feedServiceForSearch } from '../services/feedService'
import { DEPT_COLORS } from '../lib/supabase'
import { hasLeaderAccess } from '../lib/roles'
import { jobOpenings } from '../lib/jobOpenings'
import { useToast } from '../components/Toast'
import { useIsMobile } from '../hooks/useMobile'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated: () => void
}

interface SearchedMember {
  memberId: number
  uuid: string
  fullName: string
  avatarUrl?: string
  email: string
  role: string
}

const CATEGORIES = [
  { value: 'events', label: 'Events' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'content', label: 'Content' },
  { value: 'operations', label: 'Operations' },
  { value: 'labs', label: 'Labs' },
]

const initials = (name: string) => (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)

const CreatePostModal = ({ isOpen, onClose, onPostCreated }: CreatePostModalProps) => {
  const { member } = useAuth()
  const { success, error: toastError } = useToast()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [postMode, setPostMode] = useState<'normal' | 'job' | 'blog'>('normal')
  const isJobOpening = postMode === 'job'
  const isBlogPost = postMode === 'blog'
  const [jobCommitment, setJobCommitment] = useState('')
  const [jobDeadline, setJobDeadline] = useState('')
  const [submitDone, setSubmitDone] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  const flashError = (msg: string) => {
    setError(msg)
    setSubmitError(true)
    toastError(msg)                                 // always fire a toast too
    setTimeout(() => setSubmitError(false), 2200)
  }
  const [blogContent, setBlogContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  const [myTeams, setMyTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [selectedTeamUuid, setSelectedTeamUuid] = useState<string>('')
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([])
  const [teamMembersLoading, setTeamMembersLoading] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])

  const [tagQuery, setTagQuery] = useState('')
  const [tagResults, setTagResults] = useState<SearchedMember[]>([])
  const [tagSearching, setTagSearching] = useState(false)
  const [taggedPeople, setTaggedPeople] = useState<SearchedMember[]>([])

  const debouncedTagQuery = useDebounce(tagQuery, 300)
  const isDirector = hasLeaderAccess(member?.role)
  const [shake, setShake] = useState(false)

  // Escape key closes modal; Cmd/Ctrl+Enter submits
  // Note: we deliberately re-register on every state change so handleSubmit always
  // captures the latest body/category/title/images (avoids stale closure bugs)
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!isOpen) return
    setTeamsLoading(true)
    teamService.getMyTeams({ limit: 50 })
      .then(result => { if (result.success) setMyTeams(result.data) })
      .catch(() => {})
      .finally(() => setTeamsLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!selectedTeamUuid) { setSelectedTeamMembers([]); setSelectedMemberIds([]); return }
    setTeamMembersLoading(true)
    teamService.getTeam(selectedTeamUuid)
      .then(result => {
        if (result.success) {
          setSelectedTeamMembers(result.data.team.members.filter(m => m.uuid !== member?.uuid))
        }
      })
      .catch(() => {})
      .finally(() => setTeamMembersLoading(false))
  }, [selectedTeamUuid, member?.uuid])

  const searchPeople = useCallback(async (query: string) => {
    if (query.length < 2) { setTagResults([]); return }
    setTagSearching(true)
    try {
      const response = await feedServiceForSearch.searchMembers(query)
      if (response.success) {
        // Show all results except the current user; already-tagged members stay
        // visible so users can see who they've already tagged (shown with ✓).
        setTagResults(response.data.members.filter(
          (m: SearchedMember) => m.uuid !== member?.uuid
        ))
      }
    } catch { } finally { setTagSearching(false) }
  }, [member?.uuid])

  useEffect(() => {
    if (!selectedTeamUuid) searchPeople(debouncedTagQuery)
  }, [debouncedTagQuery, selectedTeamUuid, searchPeople])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 4) { setError('Maximum 4 images allowed'); return }
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (evt) => setImageUrls(prev => [...prev, evt.target?.result as string])
      reader.readAsDataURL(file)
    })
    setImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const toggleTeamMember = (memberId: number) =>
    setSelectedMemberIds(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId])

  const addTaggedPerson = (person: SearchedMember) => {
    setTaggedPeople(prev => [...prev, person]); setTagQuery(''); setTagResults([])
  }

  const removeTaggedPerson = (memberId: number) =>
    setTaggedPeople(prev => prev.filter(p => p.memberId !== memberId))

  const handleSubmit = async () => {
    const activeTeam = myTeams.find(t => t.uuid === selectedTeamUuid) || null
    const finalCategory = activeTeam ? activeTeam.category : category
    const triggerShake = () => {
      setShake(true); setTimeout(() => setShake(false), 500)
      // Scroll error into view after state update
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
    const fail = (msg: string) => { setError(msg); toastError(msg); triggerShake() }
    if (!finalCategory)                              { fail('Please select a category'); return }
    if (!isBlogPost && !body.trim())                 { fail('Please write something before posting'); return }
    if (!isBlogPost && body.trim().length < 10)      { fail('Post must be at least 10 characters'); return }
    if (isBlogPost && !blogContent.trim())           { fail('Article content is empty'); return }
    if (isJobOpening && !title.trim())               { fail('Job opening requires a role title — fill in the Title field above'); return }

    // Directors get more room; standard members stay under 1000
    const bodyLimit = isDirector ? 5000 : 1000
    if (body.trim().length > bodyLimit) { fail(`Post must be ${bodyLimit} characters or fewer`); return }

    // Combine title + body for directors (title becomes the natural headline on the card)
    const finalBody = (() => {
      if (isDirector && isBlogPost && title.trim() && blogContent.trim()) {
        // blog: title \n\n teaser \n\n article content
        return body.trim()
          ? `${title.trim()}\n\n${body.trim()}\n\n${blogContent.trim()}`
          : `${title.trim()}\n\n${blogContent.trim()}`
      }
      if (isDirector && title.trim()) {
        return `${title.trim()}\n\n${body.trim()}`
      }
      return body.trim()
    })()

    setIsSubmitting(true); setError(null)
    try {
      let uploadedImageUrls: string[] = []
      if (images.length > 0) {
        const uploadResult = await feedService.uploadImages(images)
        if (uploadResult.success) uploadedImageUrls = uploadResult.data.images.map(img => img.url)
      }
      if (selectedTeamUuid) {
        const result = await teamService.createTeamPost(selectedTeamUuid, {
          category: finalCategory, body: finalBody,
          taggedMemberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
          linkUrl: linkUrl || undefined,
        })
        if (result.success) {
          // Also register as job opening if job mode is on
          if (isJobOpening && title.trim()) {
            const activeTeamObj = myTeams.find(t => t.uuid === selectedTeamUuid)
            try {
              await jobOpenings.createFromPost(result.data?.post?.uuid || Date.now().toString(), {
                title: title.trim(),
                description: body.trim(),
                category: finalCategory,
                teamName: activeTeamObj?.name,
                skills: [],
                commitment: jobCommitment.trim() || undefined,
                deadline: jobDeadline ? new Date(jobDeadline).toISOString() : undefined,
                createdByName: member?.full_name || 'HoD',
                createdByRole: member?.role || 'hod',
              })
              success('Opening posted!', 'Now live on the Opportunities page.')
            } catch (openingErr: any) {
              // Post succeeded — just warn about opening
              toastError('Post created but opening failed to save', openingErr?.message || 'Try adding it from the team page.')
            }
          } else {
            const isHoD = member?.role === 'director' || member?.role === 'super_admin' || member?.role === 'hod'
            if (isHoD) {
              success('Post submitted!', 'Published immediately.')
            } else {
              success('Post submitted for review ✓', 'Your HoD will approve it shortly. Check Notifications for updates.')
            }
          }
          setSubmitDone(true); onPostCreated(); setTimeout(() => handleClose(), 800)
        }
        else { toastError(result.message || 'Failed to create post', 'Please try again.'); flashError(result.message || 'Failed to create post') }
      } else {
        const postData: CreatePostData = {
          category: finalCategory, body: finalBody,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
          linkUrl: linkUrl || undefined,
          taggedMemberIds: taggedPeople.length > 0 ? taggedPeople.map(p => p.memberId) : undefined,
        }
        const result = await feedService.createPost(postData)
        if (result.success) {
          // If marked as job opening, register it in the job openings system
          if (isJobOpening && title.trim()) {
            try {
              await jobOpenings.createFromPost(result.data?.post?.uuid || Date.now().toString(), {
                title: title.trim(),
                description: body.trim(),
                category: finalCategory,
                skills: [],
                commitment: jobCommitment.trim() || undefined,
                deadline: jobDeadline ? new Date(jobDeadline).toISOString() : undefined,
                createdByName: member?.full_name || 'HoD',
                createdByRole: member?.role || 'director',
              })
              success('Opening posted!', 'Now live on the Opportunities page.')
            } catch (openingErr: any) {
              // Post succeeded — warn about the opening separately
              toastError('Post created but opening failed to save', openingErr?.message || 'Try adding it from the team page.')
            }
          } else {
            const isHoD = member?.role === 'director' || member?.role === 'super_admin' || member?.role === 'hod'
            if (isHoD) {
              success('Post submitted!', 'Published immediately.')
            } else {
              success('Post submitted for review ✓', 'Your HoD will approve it shortly. Check Notifications for updates.')
            }
          }
          setSubmitDone(true); onPostCreated(); setTimeout(() => handleClose(), 800)
        }
        else { toastError('Failed to create post', 'Please try again.'); flashError('Failed to create post') }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create post'
      toastError(msg)
      flashError(msg)
    } finally { setIsSubmitting(false) }
  }

  const handleClose = () => {
    setCategory(''); setTitle(''); setBody(''); setLinkUrl(''); setShowLinkInput(false)
    setPostMode('normal'); setJobCommitment(''); setJobDeadline(''); setBlogContent('')
    setSubmitDone(false); setSubmitError(false)
    setImages([]); setImageUrls([]); setError(null)
    setSelectedTeamUuid(''); setSelectedTeamMembers([]); setSelectedMemberIds([])
    setTagQuery(''); setTagResults([]); setTaggedPeople([])
    onClose()
  }

  const selectedTeam = myTeams.find(t => t.uuid === selectedTeamUuid) || null

  if (!isOpen) return null

  const labelSt: React.CSSProperties = {
    fontFamily: 'var(--display)', fontWeight: 700, fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)',
    display: 'block', marginBottom: 8,
  }

  return (
    <div
      className="aq-modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={shake ? 'aq-shake' : ''}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 580, width: '100%',
          background: 'var(--card)',
          borderRadius: 20,
          padding: 28,
          maxHeight: '90dvh', overflowY: 'auto',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 24px 64px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--ink)', lineHeight: 1 }}>
              New post
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isDirector ? 'publishes immediately' : 'goes to HoD review'}
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--ink-3)', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--ink-3)'; }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>


        {/* Team Selector */}
        {myTeams.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="post-team" style={labelSt}>Post Through Team <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
            {teamsLoading ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>LOADING...</div>
            ) : (
              <select
                id="post-team"
                value={selectedTeamUuid}
                onChange={e => { setSelectedTeamUuid(e.target.value); setSelectedMemberIds([]); setTaggedPeople([]) }}
                className="input"
              >
                <option value="">No team (general post)</option>
                {myTeams.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Category */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelSt}>Category <span style={{ color: 'var(--accent)' }}>*</span></label>
          {selectedTeam ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chip on" style={{ background: DEPT_COLORS[selectedTeam.category] || 'var(--accent)', color: '#fff', border: 'none' }}>
                {CATEGORIES.find(c => c.value === selectedTeam.category)?.label || selectedTeam.category}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>Team category</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`chip ${category === cat.value ? 'on' : ''}`}
                  style={category === cat.value ? { background: DEPT_COLORS[cat.value] || 'var(--accent)', borderColor: 'transparent', color: '#fff' } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title — directors only */}
        {isDirector && (
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="post-title" style={labelSt}>
              Title <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional — becomes the post headline)</span>
            </label>
            <input
              id="post-title"
              className="input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Short, punchy headline..."
              maxLength={120}
              style={{ fontFamily: 'var(--eina)', fontWeight: 700, fontSize: 15 }}
            />
            {title && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: title.length > 100 ? '#e05c5c' : 'var(--ink-3)', marginTop: 4, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {title.length}/120
              </div>
            )}
          </div>
        )}

        {/* ── Mode toggles — directors / HoDs, any post type ── */}
        {isDirector && (
          <div style={{ marginBottom: 18 }}>
            <div className="mono xs upper muted" style={{ marginBottom: 6 }}>Post type</div>
            {/* Compact toggle row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { mode: 'job',  label: '⚡ job opening', color: 'var(--mint)' },
                { mode: 'blog', label: '📝 blog post',   color: 'var(--sky)'  },
              ] as const).map(({ mode, label, color }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setPostMode(prev => prev === mode ? 'normal' : mode)
                    if (mode === 'blog') setBlogContent('')
                    if (mode === 'job') { setJobCommitment(''); setJobDeadline('') }
                  }}
                  style={{
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                    padding: '5px 12px', borderRadius: 999, cursor: 'pointer',
                    border: `1.5px solid ${postMode === mode ? color : 'var(--line-2)'}`,
                    background: postMode === mode ? color + '18' : 'transparent',
                    color: postMode === mode ? color : 'var(--ink-3)',
                    transition: 'background 0.14s, border-color 0.14s, color 0.14s',
                  }}
                >
                  {postMode === mode ? '● ' : '○ '}{label}
                </button>
              ))}
            </div>

            {/* Job opening extra fields */}
            {isJobOpening && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(0,229,160,0.06)', borderRadius: 12, border: '1px dashed var(--mint)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }} className="opening-form-grid">
                <div>
                  <label style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>
                    Commitment <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input className="input" value={jobCommitment} onChange={e => setJobCommitment(e.target.value)} placeholder="e.g. 2-3 hrs/week" />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 5 }}>
                    Deadline <span style={{ opacity: 0.5, fontWeight: 400 }}>(auto-pauses)</span>
                  </label>
                  <input type="date" className="input" value={jobDeadline} onChange={e => setJobDeadline(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
            )}

            {/* Blog article content field */}
            {isBlogPost && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--sky)', display: 'block' }}>
                  Article content
                </label>
                <textarea
                  className="input"
                  rows={8}
                  value={blogContent}
                  onChange={e => setBlogContent(e.target.value)}
                  placeholder="Write the full article here..."
                  style={{ resize: 'vertical', minHeight: 180, fontFamily: 'var(--eina)', fontSize: 14, lineHeight: 1.7 }}
                />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textAlign: 'right', color: blogContent.length > 4500 ? '#e05c5c' : 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {blogContent.length}/5000
                </div>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="post-body" style={labelSt}>
            {isDirector ? (isBlogPost ? 'Teaser / subtitle' : 'Body') : "What's happening?"}
            <span style={{ color: 'var(--accent)' }}> *</span>
          </label>
          <textarea
            id="post-body"
            className="input"
            rows={isDirector ? 6 : 4}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={isDirector ? (isBlogPost ? 'Short teaser shown on the feed card…' : 'Write the full content of your post...') : 'Share your thoughts, ideas, or updates with the community...'}
            style={{ resize: 'vertical', minHeight: isDirector ? 140 : 96, fontFamily: 'var(--eina)', fontSize: 14, lineHeight: 1.7 }}
          />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: body.length > (isDirector ? 4500 : 900) ? '#e05c5c' : 'var(--ink-3)', marginTop: 4, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {body.length}/{isDirector ? 5000 : 1000}
          </div>
        </div>

        {/* Team Member Tagging */}
        {selectedTeamUuid && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelSt}>Tag Team Members <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
            {teamMembersLoading ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>LOADING...</div>
            ) : selectedTeamMembers.length === 0 ? (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-3)' }}>No other members in this team.</p>
            ) : (
              <div style={{ maxHeight: 176, overflowY: 'auto', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--bg-2)' }}>
                {selectedTeamMembers.map(m => (
                  <label key={m.memberId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(m.memberId)}
                      onChange={() => toggleTeamMember(m.memberId)}
                      style={{ width: 14, height: 14, accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(m.fullName)}
                    </div>
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</span>
                    {m.role === 'lead' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lead</span>}
                  </label>
                ))}
              </div>
            )}
            {selectedMemberIds.length > 0 && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 6 }}>
                {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} tagged
              </div>
            )}
          </div>
        )}

        {/* Tag People (non-team) */}
        {!selectedTeamUuid && (
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="post-tag-search" style={labelSt}>Tag People <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
            {taggedPeople.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {taggedPeople.map(p => (
                  <span key={p.memberId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid var(--accent)', borderRadius: 'var(--r-pill)', fontFamily: 'var(--display)', fontWeight: 700, fontSize: 11, color: 'var(--accent)' }}>
                    {p.fullName}
                    <button type="button" onClick={() => removeTaggedPerson(p.memberId)} style={{ background: 'none', color: 'var(--accent)', fontSize: 12, marginLeft: 2, opacity: 0.7 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <input
                id="post-tag-search"
                className="input"
                value={tagQuery}
                onChange={e => setTagQuery(e.target.value)}
                placeholder="Search members to tag..."
                autoComplete="off"
              />
              {tagSearching && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>...</span>
              )}
            </div>
            {tagResults.length > 0 && (
              <div style={{ border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--bg-3)', boxShadow: 'var(--shadow-lg)', marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {tagResults.map(m => {
                  const alreadyTagged = taggedPeople.some(p => p.memberId === m.memberId)
                  return (
                    <button key={m.memberId} type="button"
                      onClick={() => alreadyTagged ? removeTaggedPerson(m.memberId) : addTaggedPerson(m)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left',
                        background: alreadyTagged ? 'var(--bg-2)' : 'transparent',
                        opacity: alreadyTagged ? 0.7 : 1,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = alreadyTagged ? 'var(--bg-2)' : 'transparent')}
                    >
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(m.fullName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alreadyTagged && <span style={{ color: 'var(--mint)', marginRight: 5 }}>✓</span>}
                          {m.fullName}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: alreadyTagged ? 'var(--ink-3)' : 'var(--accent)' }}>
                        {alreadyTagged ? 'tagged' : '+ tag'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {tagQuery.length >= 2 && tagResults.length === 0 && !tagSearching && (
              <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>No members found</p>
            )}
          </div>
        )}

        {/* Image Previews — concentric: modal r-2xl ~36px, image r-sm 10px */}
        {imageUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 18 }}>
            {imageUrls.map((url, index) => (
              <div key={index} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <img src={url} alt="" style={{ width: '100%', height: 112, objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => removeImage(index)} aria-label={`Remove image ${index + 1}`}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 26, height: 26, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.12s var(--ease), background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.78)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onMouseUp={e => (e.currentTarget.style.transform = '')}
                >
                  <span aria-hidden style={{ position: 'absolute', inset: -7 }} />
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Link Input */}
        {!selectedTeamUuid && showLinkInput && (
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="post-link-url" style={labelSt}>Link URL</label>
            <input id="post-link-url" className="input" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" />
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={images.length >= 4}
            className="aq-post-action" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: images.length >= 4 ? 0.4 : 1 }}
            title="Add photos (max 4)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><path d="M21 15l-5-5L5 21"/></svg>
            Photo{images.length > 0 ? ` (${images.length})` : ''}
          </button>
          {!selectedTeamUuid && (
            <button type="button" onClick={() => setShowLinkInput(!showLinkInput)}
              className="aq-post-action"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: showLinkInput ? 'var(--accent)' : undefined }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Link
            </button>
          )}
        </div>

        {/* Review notice */}
        {!isDirector && (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 18, fontFamily: 'var(--display)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.02em' }}>
            {selectedTeamUuid
              ? 'Team leads will review your post before it appears on the feed.'
              : 'Your post will be reviewed by an HoD before appearing on the feed.'
            }
          </div>
        )}

        {/* Error — placed just above submit so it's visible without scrolling up */}
        {error && (
          <div
            ref={errorRef}
            style={{
              background: 'rgba(224,92,92,0.14)',
              border: '1.5px solid rgba(224,92,92,0.45)',
              borderRadius: 12,
              padding: '11px 14px',
              marginBottom: 14,
              color: '#e05c5c',
              fontFamily: 'var(--display)',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠ {error}</span>
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: '#e05c5c', fontSize: 16, cursor: 'pointer', width: 32, height: 32, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 4, transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,92,92,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              aria-label="Dismiss error"
            >✕</button>
          </div>
        )}

        {/* Footer actions — sticky so the submit button stays visible when keyboard is open on mobile */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
          position: 'sticky', bottom: 0,
          background: 'var(--card)',
          padding: '12px 28px',
          borderTop: '1px solid var(--line)',
          margin: '0 -28px -28px',
          zIndex: 1,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.04em', marginRight: 'auto' }}>⌘↵ to submit</span>
          <button onClick={handleClose} className="btn btn-sm" disabled={isSubmitting}>cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submitDone}
            className="btn btn-primary"
            style={{
              minWidth: 140,
              justifyContent: 'center',
              background: submitDone ? 'var(--mint)' : submitError ? '#e05c5c' : undefined,
              borderColor: submitDone ? 'var(--mint)' : submitError ? '#e05c5c' : undefined,
              color: submitDone || submitError ? '#fff' : undefined,
              transition: 'background 0.18s, color 0.18s, border-color 0.18s, transform 0.1s',
              transform: submitError ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            {submitDone ? (
              '✓ posted!'
            ) : submitError ? (
              '✕ failed — retry'
            ) : isSubmitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                posting…
              </span>
            ) : (
              isDirector ? 'POST →' : 'SUBMIT FOR REVIEW →'
            )}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </div>
  )
}

export default CreatePostModal
