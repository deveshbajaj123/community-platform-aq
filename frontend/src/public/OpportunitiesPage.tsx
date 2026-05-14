import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { hasLeaderAccess } from '../lib/roles'
import { jobOpenings, JobOpening, CAT_COLORS, OpeningStatus, STATUS_COLORS, STATUS_LABELS, ALLOWED_TRANSITIONS } from '../lib/jobOpenings'
import { I } from '../components/v6Shared'
import { useToast } from '../components/Toast'

// ── Opening Form Modal ────────────────────────────────────────────────────────
function OpeningFormModal({
  opening,
  onClose,
  onSaved,
  createdByName,
  createdByRole,
}: {
  opening: JobOpening | null
  onClose: () => void
  onSaved: () => void
  createdByName: string
  createdByRole: string
}) {
  const isNew = !opening
  const { success } = useToast()
  const [title, setTitle]     = useState(opening?.title || '')
  const [desc, setDesc]       = useState(opening?.description || '')
  const [cat, setCat]         = useState(opening?.category || 'welfare')
  const [team, setTeam]       = useState(opening?.teamName || '')
  const [skills, setSkills]   = useState(opening?.skills.join(', ') || '')
  const [commit, setCommit]   = useState(opening?.commitment || '')
  const [deadline, setDeadline] = useState(opening?.deadline ? opening.deadline.slice(0, 10) : '')

  const accent = CAT_COLORS[cat] || '#00E5A0'
  const labelSt: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', display: 'block', marginBottom: 6 }
  const inputSt: React.CSSProperties = { width: '100%', padding: '10px 12px', background: 'var(--bg-2)', border: '1.5px solid var(--line-2)', borderRadius: 12, color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 14, outline: 'none' }

  const handleSave = async () => {
    if (!title.trim() || !desc.trim()) return
    const data = {
      title: title.trim(), description: desc.trim(),
      category: cat, teamName: team.trim() || undefined,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      commitment: commit.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      createdByName, createdByRole,
    }
    if (isNew) {
      await jobOpenings.create(data)
      success('Opening posted!', 'Now live on the board.')
    } else {
      await jobOpenings.update(opening!.id, data)
      success('Opening updated ✓')
    }
    onSaved(); onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 20, overflow: 'hidden', border: '2px solid var(--ink)', maxHeight: '90dvh', overflowY: 'auto' }}>
        {/* Accent header */}
        <div style={{ background: accent, padding: '20px 24px 16px', color: '#0A0A0A' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 20 }}>
            {isNew ? 'post a job opening' : 'edit opening'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {isNew ? 'visible to all members immediately' : `editing: ${opening?.title}`}
          </div>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={labelSt}>Role title *</label><input style={inputSt} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Social Media Manager" maxLength={80} /></div>
          <div>
            <label style={labelSt}>Category *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(CAT_COLORS).map(([c, col]) => (
                <button key={c} onClick={() => setCat(c)} className="btn btn-sm"
                  style={{ background: cat === c ? col : 'var(--bg-2)', color: cat === c ? '#0A0A0A' : 'var(--ink)', borderColor: cat === c ? col : 'transparent', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div><label style={labelSt}>Description *</label><textarea style={{ ...inputSt, minHeight: 100, resize: 'vertical' }} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this role involve? What's expected?" /></div>
          <div className="opening-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelSt}>Team <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label><input style={inputSt} value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. Events Team" /></div>
            <div><label style={labelSt}>Commitment <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label><input style={inputSt} value={commit} onChange={e => setCommit(e.target.value)} placeholder="e.g. 2-3 hrs/week" /></div>
          </div>
          <div><label style={labelSt}>Skills <span style={{ opacity: 0.5, fontWeight: 400 }}>(comma separated)</span></label><input style={inputSt} value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Canva, Excel, Communication" /></div>
          <div>
            <label style={labelSt}>
              Deadline <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional — auto-pauses when passed)</span>
            </label>
            <input type="date" style={inputSt} value={deadline} onChange={e => setDeadline(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', background: accent, borderColor: accent, color: '#0A0A0A' }}
              disabled={!title.trim() || !desc.trim()} onClick={handleSave}>
              {isNew ? '✓ post opening' : '✓ save changes'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Opening Card ──────────────────────────────────────────────────────────────
function OpeningCard({ op, isLeader, onManage }: { op: JobOpening; isLeader: boolean; onManage: (op: JobOpening) => void }) {
  const accent = CAT_COLORS[op.category] || '#00E5A0'
  const isPaused = op.status === 'paused'
  const isClosed = op.status === 'closed'
  const isInactive = isPaused || isClosed
  const daysLeft = op.deadline ? Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000) : null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${isInactive ? STATUS_COLORS[op.status] : accent}`, opacity: isInactive ? 0.65 : 1 }}>
      <div style={{ padding: 'clamp(14px, 3vw, 20px)' }}>
        {/* Header row — chips below title on mobile */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(16px, 3vw, 18px)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {op.title}
            </div>
            {isLeader && (
              <button className="btn btn-sm btn-ghost" style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }} onClick={() => onManage(op)} title="Manage">⋯</button>
            )}
          </div>
          {/* Meta chips row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: accent + '22', color: accent, border: `1px solid ${accent}44`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {op.category}
            </span>
            {op.teamName && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: accent + '22', color: accent, border: `1.5px solid ${accent}55` }}>
                {op.teamName}
              </span>
            )}
            {isInactive && (
              <span className="chip" style={{ fontSize: 10, background: STATUS_COLORS[op.status] + '22', color: STATUS_COLORS[op.status], borderColor: STATUS_COLORS[op.status] + '44' }}>
                {STATUS_LABELS[op.status].toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p style={{ fontFamily: 'var(--eina)', fontSize: 14, lineHeight: 1.65, color: 'var(--ink-2)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>{op.description}</p>

        {/* Skills */}
        {op.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {op.skills.map(s => (
              <span key={s} className="chip" style={{ fontSize: 11, background: accent + '18', color: accent, borderColor: accent + '44' }}>{s}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {op.commitment && <span className="mono xs muted">⏱ {op.commitment}</span>}
              {daysLeft !== null && daysLeft > 0 && (
                <span className="mono xs muted" style={{ color: daysLeft <= 3 ? '#e05c5c' : undefined }}>
                  {daysLeft <= 3 ? `⚠ ${daysLeft}d left` : `${daysLeft}d left`}
                </span>
              )}
              <span className="mono xs muted">— {op.createdByName}</span>
            </div>
            {op.status === 'open' ? (
              <a
                href={`mailto:aquaterrakolkata@gmail.com?subject=${encodeURIComponent('Application for: ' + op.title)}`}
                className="btn btn-sm btn-primary"
                style={{ flexShrink: 0 }}
              >
                Apply →
              </a>
            ) : (
              <span className="mono xs muted" style={{ fontSize: 11 }}>
                {isClosed ? 'role closed' : 'not accepting applications'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Manage Popover (enforces state machine) ───────────────────────────────────
function ManagePopover({ op, onAction, onEdit, onClose }: {
  op: JobOpening
  onAction: (action: () => Promise<void>) => void
  onEdit: () => void
  onClose: () => void
}) {
  const can = (to: OpeningStatus) => ALLOWED_TRANSITIONS[op.status]?.includes(to)
  const do_ = (fn: () => void) => { fn(); onClose() }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--card)', borderRadius: 14, border: '2px solid var(--ink)', padding: 8, minWidth: 200, zIndex: 101, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div className="mono xs muted" style={{ padding: '4px 12px 8px', fontWeight: 700, borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
          {op.title.slice(0, 30)}{op.title.length > 30 ? '…' : ''}
          <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 999, background: STATUS_COLORS[op.status] + '22', color: STATUS_COLORS[op.status] }}>
            {STATUS_LABELS[op.status]}
          </span>
        </div>
        <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => do_(onEdit)}>✎ edit</button>
        {can('open')   && <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: STATUS_COLORS.open }}   onClick={() => do_(() => onAction(async () => { await jobOpenings.resume(op.id) }))}>▶ resume</button>}
        {can('paused') && <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: STATUS_COLORS.paused }} onClick={() => do_(() => onAction(async () => { await jobOpenings.pause(op.id) }))}>⏸ pause</button>}
        {can('closed') && <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: STATUS_COLORS.closed }} onClick={() => do_(() => onAction(async () => { await jobOpenings.close(op.id) }))}>✓ close role <span style={{ fontSize: 9, opacity: 0.6 }}>(terminal)</span></button>}
        <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
        {can('deleted') && <button className="btn btn-sm btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: '#e05c5c' }} onClick={() => do_(() => onAction(async () => { await jobOpenings.delete_(op.id) }))}>✕ delete permanently</button>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OpportunitiesPage() {
  const { member } = useAuth()
  const { success, error: toastError } = useToast()
  const isLeader = hasLeaderAccess(member?.role)
  const [opsList, setOpsList] = useState<JobOpening[]>([])
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<OpeningStatus | 'all'>('all')
  const [dashboardView, setDashboardView] = useState<'public' | 'manage'>('public')
  const [editingOp, setEditingOp] = useState<JobOpening | null | 'new'>(null)
  const [managingOp, setManagingOp] = useState<JobOpening | null>(null)

  const reload = () => {
    const fetch = isLeader ? jobOpenings.getAll() : jobOpenings.getOpen()
    fetch.then(setOpsList).catch(() => setOpsList([]))
  }

  useEffect(() => { reload() }, [isLeader])

  const publicDisplayed = opsList
    .filter(o => o.status === 'open')
    .filter(o => catFilter === 'all' || o.category === catFilter)

  const manageDisplayed = opsList
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => catFilter === 'all' || o.category === catFilter)

  const displayed = dashboardView === 'manage' ? manageDisplayed : publicDisplayed

  const openCount = opsList.filter(o => o.status === 'open').length

  return (
    <div className="route-enter">
      {/* Hero */}
      <section style={{ padding: 'clamp(32px, 6vw, 80px) 20px clamp(24px, 4vw, 48px)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <span className="sticker sticker-mint wobble" style={{ display: 'inline-flex', marginBottom: 14 }}>
            ★ {openCount} OPEN ROLE{openCount !== 1 ? 'S' : ''}
          </span>
          <h1 className="h-display" style={{ fontSize: 'clamp(40px, 8vw, 88px)', margin: '0 0 14px', lineHeight: 0.92, textWrap: 'balance' } as React.CSSProperties}>
            work on <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', color: 'var(--mint)', fontWeight: 400 }}>something real</span>.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', maxWidth: 500, marginBottom: 0 }}>
            AquaTerra runs on student work. Every team here is looking for people who want to build, not observe.
          </p>
          {isLeader && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => setEditingOp('new')}>
                <I.plus /> Post Opening
              </button>
              <button
                className={'btn btn-sm ' + (dashboardView === 'manage' ? 'btn-primary' : 'btn-ghost')}
                onClick={() => setDashboardView(v => v === 'manage' ? 'public' : 'manage')}
              >
                {dashboardView === 'manage' ? '← public view' : `⚙ manage (${opsList.length})`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="container" style={{ paddingTop: 18, paddingBottom: 0 }}>
        {/* Status filter — management view only */}
        {isLeader && dashboardView === 'manage' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' }}>
            <span className="mono xs muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
            {(['all', 'open', 'paused', 'closed'] as const).map(s => (
              <button
                key={s}
                className={'chip ' + (statusFilter === s ? 'chip-active' : '')}
                onClick={() => setStatusFilter(s)}
                style={statusFilter === s && s !== 'all' ? { background: STATUS_COLORS[s as OpeningStatus], color: '#0A0A0A', borderColor: STATUS_COLORS[s as OpeningStatus] } : {}}
              >
                {s === 'all' ? `all (${opsList.length})` : `${s} (${opsList.filter(o => o.status === s).length})`}
              </button>
            ))}
          </div>
        )}
        {/* Category filter — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', overscrollBehaviorX: 'none', marginBottom: 20 }}>
          <button className={'chip ' + (catFilter === 'all' ? 'chip-active' : '')} onClick={() => setCatFilter('all')} style={{ flexShrink: 0 }}>all</button>
          {Object.keys(CAT_COLORS).map(c => (
            <button key={c} className={'chip ' + (catFilter === c ? 'chip-active' : '')} onClick={() => setCatFilter(c)} style={{ flexShrink: 0 }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Openings list */}
      <div className="container" style={{ paddingBottom: 80 }}>
        {displayed.length === 0 ? (
          <div className="card" style={{ padding: 'clamp(32px, 5vw, 60px) 24px', textAlign: 'center' }}>
            <span className="sticker sticker-lemon" style={{ display: 'inline-block', marginBottom: 16 }}>★ all quiet</span>
            <div className="h-display" style={{ fontSize: 'clamp(24px, 5vw, 32px)' }}>no openings right now.</div>
            <p className="muted" style={{ marginTop: 8 }}>
              {isLeader ? 'Post the first opening to start recruiting.' : 'Check back soon — new roles get posted regularly.'}
            </p>
            {isLeader && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setEditingOp('new')}>
                <I.plus /> Post first opening
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayed.map(op => (
              <OpeningCard
                key={op.id}
                op={op}
                isLeader={isLeader}
                onManage={setManagingOp}
              />
            ))}
          </div>
        )}

        {/* Apply to AQ section */}
        <div style={{ marginTop: 48, background: '#0A0A0A', borderRadius: 16, padding: 'clamp(20px, 4vw, 32px)', border: '2px solid var(--mint)' }}>
          <div className="mono xs upper" style={{ color: 'var(--mint)', fontWeight: 700, marginBottom: 12 }}>★ GENERAL APPLICATION</div>
          <div className="h-display" style={{ fontSize: 'clamp(22px, 4vw, 40px)', color: '#fff', marginBottom: 10, textWrap: 'balance' } as React.CSSProperties}>
            don't see your role? apply anyway.
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            AquaTerra runs rolling recruitment. Send an application even if no specific role is open — we review everyone.
          </p>
          <a href="/register" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Apply to AquaTerra →
          </a>
        </div>
      </div>

      {/* Modals */}
      {editingOp !== null && (
        <OpeningFormModal
          opening={editingOp === 'new' ? null : editingOp}
          onClose={() => setEditingOp(null)}
          onSaved={reload}
          createdByName={member?.full_name || 'HoD'}
          createdByRole={member?.role || 'director'}
        />
      )}

      {managingOp && (
        <ManagePopover
          op={managingOp}
          onAction={async (fn) => {
            try {
              await fn()
              success('Opening updated ✓')
            } catch { toastError('Action failed') }
            reload()
          }}
          onEdit={() => { setEditingOp(managingOp); setManagingOp(null) }}
          onClose={() => setManagingOp(null)}
        />
      )}
    </div>
  )
}
