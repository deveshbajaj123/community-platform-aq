import { useState, useEffect, useRef, useCallback } from 'react'
import feedService, { CreatePostData } from '../services/feedService'
import teamService, { Team, TeamMember } from '../services/teamService'
import { useAuth } from '../auth/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import api from '../services/api'
import { DEPT_COLORS } from '../lib/supabase'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [category, setCategory] = useState('')
  const [body, setBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const isDirector = member?.role === 'director'
  const [shake, setShake] = useState(false)

  // Escape key closes modal; Cmd/Ctrl+Enter submits
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, body, category, selectedTeamUuid, selectedTeam])

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
      const response = await api.get('/search', { params: { q: query, type: 'people', limit: 10 } })
      if (response.data.success) {
        const alreadyTaggedIds = taggedPeople.map(p => p.memberId)
        setTagResults(response.data.data.results.people.filter(
          (m: SearchedMember) => !alreadyTaggedIds.includes(m.memberId) && m.uuid !== member?.uuid
        ))
      }
    } catch { } finally { setTagSearching(false) }
  }, [taggedPeople, member?.uuid])

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
    const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500) }
    if (!finalCategory) { setError('Please select a category'); triggerShake(); return }
    if (!body.trim()) { setError('Please write something'); triggerShake(); return }
    if (body.trim().length < 10) { setError('Post must be at least 10 characters'); triggerShake(); return }
    if (body.trim().length > 1000) { setError('Post must be 1000 characters or fewer'); triggerShake(); return }

    setIsSubmitting(true); setError(null)
    try {
      let uploadedImageUrls: string[] = []
      if (images.length > 0) {
        const uploadResult = await feedService.uploadImages(images)
        if (uploadResult.success) uploadedImageUrls = uploadResult.data.images.map(img => img.url)
      }
      if (selectedTeamUuid) {
        const result = await teamService.createTeamPost(selectedTeamUuid, {
          category: finalCategory, body: body.trim(),
          taggedMemberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        })
        if (result.success) { onPostCreated(); handleClose() }
        else setError(result.message || 'Failed to create post')
      } else {
        const postData: CreatePostData = {
          category: finalCategory, body: body.trim(),
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
          linkUrl: linkUrl || undefined,
          taggedMemberIds: taggedPeople.length > 0 ? taggedPeople.map(p => p.memberId) : undefined,
        }
        const result = await feedService.createPost(postData)
        if (result.success) { onPostCreated(); handleClose() }
        else setError('Failed to create post')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create post. Please try again.')
    } finally { setIsSubmitting(false) }
  }

  const handleClose = () => {
    setCategory(''); setBody(''); setLinkUrl(''); setShowLinkInput(false)
    setImages([]); setImageUrls([]); setError(null)
    setSelectedTeamUuid(''); setSelectedTeamMembers([]); setSelectedMemberIds([])
    setTagQuery(''); setTagResults([]); setTaggedPeople([])
    onClose()
  }

  const selectedTeam = myTeams.find(t => t.uuid === selectedTeamUuid) || null

  if (!isOpen) return null

  const labelSt: React.CSSProperties = {
    fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 10,
    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--txt-3)',
    display: 'block', marginBottom: 8,
  }

  return (
    <div className="aq-modal-overlay" onClick={handleClose}>
      <div className={`aq-modal-card${shake ? ' aq-shake' : ''}`} onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            New Post
          </div>
          <button onClick={handleClose} className="aq-nav-ghost-btn" aria-label="Close">✕</button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 18, color: '#e05c5c', fontFamily: 'var(--f-display)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button onClick={() => setError(null)} style={{ background: 'none', color: '#e05c5c', fontSize: 14, marginLeft: 8 }}>✕</button>
          </div>
        )}

        {/* Team Selector */}
        {myTeams.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="post-team" style={labelSt}>Post Through Team <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
            {teamsLoading ? (
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)' }}>LOADING...</div>
            ) : (
              <select
                id="post-team"
                value={selectedTeamUuid}
                onChange={e => { setSelectedTeamUuid(e.target.value); setSelectedMemberIds([]); setTaggedPeople([]) }}
                className="aq-input"
              >
                <option value="">— No team (general post) —</option>
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
              <span className="aq-chip on" style={{ background: DEPT_COLORS[selectedTeam.category] || 'var(--accent)', color: '#fff', border: 'none' }}>
                {CATEGORIES.find(c => c.value === selectedTeam.category)?.label || selectedTeam.category}
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>Team category</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`aq-chip ${category === cat.value ? 'on' : ''}`}
                  style={category === cat.value ? { background: DEPT_COLORS[cat.value] || 'var(--accent)', borderColor: 'transparent', color: '#fff' } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="post-body" style={labelSt}>What's happening? <span style={{ color: 'var(--accent)' }}>*</span></label>
          <textarea
            id="post-body"
            className="aq-input"
            rows={4}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Share your thoughts, ideas, or updates with the community..."
            style={{ resize: 'vertical', minHeight: 96 }}
          />
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: body.length > 900 ? '#e05c5c' : 'var(--txt-4)', marginTop: 4, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {body.length}/1000
          </div>
        </div>

        {/* Team Member Tagging */}
        {selectedTeamUuid && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelSt}>Tag Team Members <span style={{ fontWeight: 400, opacity: 0.6 }}>(Optional)</span></label>
            {teamMembersLoading ? (
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)' }}>LOADING...</div>
            ) : selectedTeamMembers.length === 0 ? (
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--txt-4)' }}>No other members in this team.</p>
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
                    <div className="aq-avatar" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(m.fullName)}
                    </div>
                    <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</span>
                    {m.role === 'lead' && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lead</span>}
                  </label>
                ))}
              </div>
            )}
            {selectedMemberIds.length > 0 && (
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', marginTop: 6 }}>
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
                  <span key={p.memberId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', border: '1px solid var(--accent)', borderRadius: 'var(--r-pill)', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 11, color: 'var(--accent)' }}>
                    {p.fullName}
                    <button type="button" onClick={() => removeTaggedPerson(p.memberId)} style={{ background: 'none', color: 'var(--accent)', fontSize: 12, marginLeft: 2, opacity: 0.7 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <input
                id="post-tag-search"
                className="aq-input"
                value={tagQuery}
                onChange={e => setTagQuery(e.target.value)}
                placeholder="Search members to tag..."
                autoComplete="off"
              />
              {tagSearching && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)' }}>...</span>
              )}
            </div>
            {tagResults.length > 0 && (
              <div style={{ border: '1px solid var(--line-2)', borderRadius: 'var(--r)', background: 'var(--bg-3)', boxShadow: 'var(--shadow-lg)', marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {tagResults.map(m => (
                  <button key={m.memberId} type="button" onClick={() => addTaggedPerson(m)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--line)', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="aq-avatar" style={{ width: 28, height: 28, fontSize: 10, background: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : initials(m.fullName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 12, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--txt-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--accent)' }}>+ tag</span>
                  </button>
                ))}
              </div>
            )}
            {tagQuery.length >= 2 && tagResults.length === 0 && !tagSearching && (
              <p style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--txt-4)', marginTop: 6 }}>No members found</p>
            )}
          </div>
        )}

        {/* Image Previews — concentric: modal r-2xl ~36px, image r-sm 10px */}
        {imageUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
            {imageUrls.map((url, index) => (
              <div key={index} style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
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
            <input id="post-link-url" className="aq-input" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" />
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
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 18, fontFamily: 'var(--f-display)', fontSize: 11, color: 'var(--txt-3)', letterSpacing: '0.02em' }}>
            {selectedTeamUuid
              ? 'Team leads will review your post before it appears on the feed.'
              : 'Your post will be reviewed by a director before appearing on the feed.'
            }
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--txt-4)', letterSpacing: '0.04em', marginRight: 'auto' }}>⌘↵ to submit</span>
          <button onClick={handleClose} className="aq-btn aq-btn-outline aq-btn-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !body.trim() || (!selectedTeamUuid && !category) || (!!selectedTeamUuid && !selectedTeam?.category)}
            className="aq-btn aq-btn-accent aq-btn-sm"
          >
            {isSubmitting ? 'Posting...' : isDirector ? 'Post' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreatePostModal
