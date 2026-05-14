import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import teamService from '../services/teamService'
import { supabase, DEPT_COLORS } from '../lib/supabase'
import { supabaseCommunity } from '../lib/supabaseCommunity'
import { I } from '../components/v6Shared'

const CATEGORIES = ['events', 'welfare', 'content', 'operations', 'labs']
const CAT_COLORS: Record<string, string> = DEPT_COLORS as any

type Team = { uuid: string; name: string; category: string; description: string; memberCount: number; logoUrl?: string }

// ── Team form modal ──────────────────────────────────────────────────────────
function TeamFormModal({
  team,
  onClose,
  onSaved,
}: {
  team: Team | null   // null = creating new
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !team
  const [name, setName]       = useState(team?.name || '')
  const [desc, setDesc]       = useState(team?.description || '')
  const [cat, setCat]         = useState(team?.category || 'welfare')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const accent = CAT_COLORS[cat] || 'var(--mint)'
  const labelSt: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--ink-3)', display: 'block', marginBottom: 6,
  }
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-2)', border: '1.5px solid var(--line-2)',
    borderRadius: 12, color: 'var(--ink)', fontFamily: 'var(--sans)',
    fontSize: 14, outline: 'none',
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Team name is required'); return }
    if (!cat) { setError('Please select a category'); return }
    setSaving(true); setError(null)
    try {
      if (isNew) {
        const result = await teamService.createTeam({ name: name.trim(), description: desc.trim(), category: cat })
        // Mirror to public Supabase project so TeamsPage reads it
        if (result.success) {
          await supabase.from('teams').upsert({
            uuid: result.data.team.uuid,
            name: name.trim(),
            category: cat,
            bio: desc.trim(),
            member_count: 0,
          }, { onConflict: 'uuid' })

          // Auto-assign creator as lead in team_members
          const { data: { session } } = await supabaseCommunity.auth.getSession()
          if (session?.user) {
            const { data: creatorMember } = await supabaseCommunity
              .from('members')
              .select('member_id')
              .eq('auth_uid', session.user.id)
              .single()

            if (creatorMember) {
              const { data: newTeam } = await supabaseCommunity
                .from('teams')
                .select('team_id')
                .eq('uuid', result.data.team.uuid)
                .single()

              if (newTeam?.team_id) {
                await supabaseCommunity
                  .from('team_members')
                  .insert({
                    team_id: newTeam.team_id,
                    member_id: creatorMember.member_id,
                    role: 'lead',
                  })
                  .throwOnError()
              }
            }
          }
        }
      } else {
        await teamService.updateTeam(team.uuid, { name: name.trim(), description: desc.trim(), category: cat })
        // Mirror update to public Supabase project
        await supabase.from('teams').update({
          name: name.trim(),
          category: cat,
          bio: desc.trim(),
        }).eq('uuid', team.uuid)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--ink)' }}>
        {/* Colored header */}
        <div style={{ background: accent, padding: '20px 24px', color: '#0A0A0A' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 22 }}>
            {isNew ? 'new team' : `edit · ${team.name}`}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 2, opacity: 0.7 }}>
            {isNew ? 'fill in the details and create' : 'update team info'}
          </div>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ background: 'rgba(224,92,92,0.12)', border: '1.5px solid rgba(224,92,92,0.3)', borderRadius: 10, padding: '10px 14px', color: '#e05c5c', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={labelSt}>Team name *</label>
            <input
              style={{ ...inputSt, fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16 }}
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Welfare Team"
              maxLength={60}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelSt}>Category *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(c => {
                const cc = CAT_COLORS[c] || 'var(--mint)'
                return (
                  <button
                    key={c} onClick={() => setCat(c)}
                    className="btn btn-sm"
                    style={{
                      background: cat === c ? cc : 'var(--bg-2)',
                      color: cat === c ? '#0A0A0A' : 'var(--ink)',
                      borderColor: cat === c ? cc : 'transparent',
                      fontWeight: cat === c ? 800 : 600,
                      textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em',
                    }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelSt}>Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(shown on team page)</span></label>
            <textarea
              style={{ ...inputSt, minHeight: 100, resize: 'vertical' }}
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What does this team do? What's the vibe? What should people know before joining?"
              maxLength={500}
            />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: desc.length > 450 ? '#e05c5c' : 'var(--ink-3)', textAlign: 'right', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {desc.length}/500
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: 'center', background: accent, borderColor: accent, color: '#0A0A0A' }}
              disabled={saving || !name.trim()}
              onClick={handleSave}
            >
              {saving ? 'saving…' : isNew ? '✓ create team' : '✓ save changes'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={saving}>cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ team, onClose, onDeleted }: { team: Team; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true); setError(null)
    try {
      await teamService.deleteTeam(team.uuid)
      onDeleted(); onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to delete team'); setDeleting(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: 'var(--card)', borderRadius: 20, padding: 28, border: '2px solid #e05c5c' }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 22, marginBottom: 8 }}>delete team?</div>
        <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 16 }}>
          This will permanently delete <strong>{team.name}</strong> and remove all members from it. Posts are not deleted.
        </p>
        {error && <div style={{ color: '#e05c5c', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            style={{ flex: 1, justifyContent: 'center', background: '#e05c5c', color: '#fff', borderColor: '#e05c5c' }}
            disabled={deleting} onClick={handleDelete}
          >
            {deleting ? 'deleting…' : 'yes, delete permanently'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TeamManagement() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [editing, setEditing] = useState<Team | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Team | null>(null)

  const fetchTeams = async () => {
    setLoading(true); setError(null)
    try {
      const result = await teamService.getTeams({ limit: 100 })
      if (result.success) setTeams(result.data || [])
      else setError('Failed to load teams')
    } catch (e: any) {
      setError(`Could not load teams — ${e?.message || String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeams() }, [])

  const filtered = teams.filter(t => {
    const matchCat = catFilter === 'all' || t.category === catFilter
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="dir-page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 className="h-display" style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: 0, lineHeight: 1 }}>team management</h2>
          <p className="mono xs muted" style={{ marginTop: 4 }}>{teams.length} teams total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing('new')}>
          <I.plus /> Create Team
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-2)', border: '1.5px solid var(--line-2)', borderRadius: 10, padding: '0 12px', flex: 1, minWidth: 200, maxWidth: 300 }}>
          <I.search />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search teams…"
            style={{ border: 'none', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', padding: '8px 0', flex: 1 }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 14 }}>✕</button>}
        </div>
        {/* Category chips */}
        {['all', ...CATEGORIES].map(c => (
          <button key={c} className={'chip ' + (catFilter === c ? 'chip-active' : '')} onClick={() => setCatFilter(c)} style={{ fontSize: 11 }}>
            {c}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(224,92,92,0.1)', border: '1.5px solid rgba(224,92,92,0.3)', borderRadius: 12, padding: '12px 16px', color: '#e05c5c', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Team list */}
      {loading ? (
        <div className="sk-group" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="v6-skeleton" style={{ height: 76, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>{search ? 'no matches.' : 'no teams yet.'}</div>
          <p className="muted" style={{ marginTop: 8 }}>
            {search ? `Try a different search term.` : 'Create the first team to get started.'}
          </p>
          {!search && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setEditing('new')}>
              <I.plus /> Create first team
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(team => {
            const accent = CAT_COLORS[team.category] || 'var(--mint)'
            return (
              <div
                key={team.uuid}
                style={{
                  display: 'grid', gridTemplateColumns: '4px 1fr auto',
                  gap: 14, background: 'var(--card)',
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid var(--line)',
                  transition: 'border-color 0.14s, box-shadow 0.14s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px ${accent}33` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                {/* Color stripe */}
                <div style={{ background: accent }} />
                {/* Info */}
                <div style={{ padding: '12px 4px 12px 2px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16 }}>{team.name}</div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: accent + '22', color: accent, letterSpacing: '0.05em' }}>{team.category}</span>
                    <span className="mono xs muted">{team.memberCount || 0} members</span>
                  </div>
                  {team.description && (
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {team.description}
                    </p>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px' }}>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '5px 12px', fontSize: 12 }}
                    onClick={() => navigate(`/teams/${team.uuid}`)}
                    title="View team page"
                  >
                    view
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '5px 10px', fontSize: 13 }}
                    onClick={() => setEditing(team)}
                    title="Edit team"
                  >
                    ✎
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '5px 10px', fontSize: 13, color: '#e05c5c', borderColor: 'transparent' }}
                    onClick={() => setDeleting(team)}
                    title="Delete team"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {editing !== null && (
        <TeamFormModal
          team={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={fetchTeams}
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          team={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchTeams}
        />
      )}
    </div>
  )
}
