import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface VolApp {
  id: number
  created_at: string
  full_name: string
  email: string
  phone: string | null
  age: number | null
  college: string | null
  year_of_study: string | null
  interests: string[]
  availability: string | null
  why_aquaterra: string
  previous_experience: string | null
  instagram_handle: string | null
  reviewed: boolean | null
  review_note: string | null
}

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const INTEREST_COLORS: Record<string, string> = {
  'Animal Welfare': '#00E5A0',
  'Plantation / Environment': '#7BCB6A',
  'Community Relief': '#FF7A1A',
  'Events & Culture': '#FF6BD6',
  'Content Creation': '#FFC700',
  'Technology (AQ Tech)': '#3DA9FC',
  'Media (Prism)': '#7E5BFF',
  'Operations / HR': '#e05c5c',
  'Finance': '#3DA9FC',
}

export default function VolunteerApplications() {
  const [apps, setApps] = useState<VolApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const PAGE = 20

  const fetchApps = useCallback(async (pg: number, append = false) => {
    if (!append) setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('volunteer_applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((pg - 1) * PAGE, pg * PAGE - 1)

      if (filter === 'pending') query = query.or('reviewed.is.null,reviewed.eq.false')
      if (filter === 'reviewed') query = query.eq('reviewed', true)
      if (search.trim()) query = query.or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)

      const { data, count, error: err } = await query
      if (err) throw err
      if (append) setApps(prev => [...prev, ...(data || [])])
      else setApps(data || [])
      setTotal(count || 0)
      setHasMore(pg * PAGE < (count || 0))
    } catch (e: any) {
      setError(`Failed to load applications — ${e?.message || String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { setPage(1); fetchApps(1) }, [filter, search, fetchApps])

  const markReviewed = async (id: number, reviewed: boolean) => {
    setMarkingId(id)
    const { error: err } = await supabase
      .from('volunteer_applications')
      .update({ reviewed })
      .eq('id', id)
    setMarkingId(null)
    if (err) { setError(`Failed to update — ${err.message}`); return }
    setApps(prev => prev.map(a => a.id === id ? { ...a, reviewed } : a))
  }

  return (
    <div className="aq-wrap" style={{ paddingTop: 'clamp(20px,4vw,28px)', paddingBottom: 80, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 className="h-display" style={{ fontSize: 'clamp(24px, 4vw, 36px)', margin: 0, lineHeight: 1 }}>
            volunteer applications<span style={{ color: 'var(--lemon)' }}>.</span>
          </h2>
          <span className="mono xs muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '…' : `${total} ${filter === 'all' ? 'total' : filter}`}
          </span>
        </div>
        <p style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          From the public /volunteer/apply form · public database
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['pending', 'all', 'reviewed'] as const).map(f => (
          <button
            key={f}
            className={`chip${filter === f ? ' on' : ''}`}
            onClick={() => setFilter(f)}
            style={{ fontSize: 11, textTransform: 'capitalize' }}
          >
            {f === 'pending' ? '★ pending' : f}
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36, borderRadius: 999, fontSize: 12 }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(224,92,92,0.1)', border: '1.5px solid rgba(224,92,92,0.3)', borderRadius: 10, padding: '12px 16px', color: '#e05c5c', fontSize: 13, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="sk-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="v6-skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28 }}>
            {filter === 'pending' ? 'all caught up.' : 'nothing here.'}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {filter === 'pending' ? 'No pending volunteer applications.' : 'No applications match your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {apps.map(app => {
            const isOpen = expanded === app.id
            const isPending = !app.reviewed
            return (
              <div
                key={app.id}
                style={{
                  background: 'var(--card)',
                  border: `1.5px solid ${isPending ? 'var(--lemon)' : 'var(--line)'}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : app.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isPending ? 'var(--lemon)' : 'var(--mint)',
                  }} />
                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.full_name}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.email}{app.college ? ` · ${app.college}` : ''}{app.year_of_study ? `, ${app.year_of_study}` : ''}
                    </div>
                  </div>
                  {/* Date */}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', flexShrink: 0, display: 'none' }} className="vol-date">
                    {formatDate(app.created_at)}
                  </span>
                  {/* Review badge */}
                  {!isPending && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mint)', border: '1px solid var(--mint)', borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
                      reviewed
                    </span>
                  )}
                  {/* Chevron */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--ink-3)' }}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div style={{ padding: '0 18px 20px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginTop: 16, marginBottom: 16 }}>
                      {/* Contact */}
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>Contact</div>
                        <div style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                          <a href={`mailto:${app.email}`} style={{ color: 'var(--accent)' }}>{app.email}</a>
                          {app.phone && <><br />{app.phone}</>}
                          {app.instagram_handle && <><br />@{app.instagram_handle}</>}
                        </div>
                      </div>
                      {/* Background */}
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>Background</div>
                        <div style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                          {app.age && <>{app.age} years old<br /></>}
                          {app.college && <>{app.college}<br /></>}
                          {app.year_of_study && <>{app.year_of_study}<br /></>}
                          {app.availability && <>Available: {app.availability}</>}
                        </div>
                      </div>
                      {/* Applied */}
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>Applied</div>
                        <div style={{ fontFamily: 'var(--eina)', fontSize: 13, color: 'var(--ink-2)' }}>{formatDate(app.created_at)}</div>
                      </div>
                    </div>

                    {/* Interests */}
                    {app.interests?.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>Interests</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {app.interests.map(i => (
                            <span key={i} style={{
                              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                              color: INTEREST_COLORS[i] || 'var(--ink-2)',
                              border: `1px solid ${INTEREST_COLORS[i] || 'var(--line-2)'}`,
                              borderRadius: 999, padding: '3px 10px',
                            }}>
                              {i}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Why */}
                    <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>Why AquaTerra</div>
                      <p style={{ fontFamily: 'var(--eina)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                        "{app.why_aquaterra}"
                      </p>
                    </div>

                    {/* Previous experience */}
                    {app.previous_experience && (
                      <div style={{ background: 'var(--bg-2)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8 }}>Previous Experience</div>
                        <p style={{ fontFamily: 'var(--eina)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.65, margin: 0 }}>
                          {app.previous_experience}
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {isPending ? (
                        <button
                          onClick={() => markReviewed(app.id, true)}
                          disabled={markingId === app.id}
                          className="btn btn-sm btn-primary"
                          style={{ background: 'var(--mint)', borderColor: 'var(--mint)', color: '#0A0A0A' }}
                        >
                          {markingId === app.id ? '…' : '✓ mark as reviewed'}
                        </button>
                      ) : (
                        <button
                          onClick={() => markReviewed(app.id, false)}
                          disabled={markingId === app.id}
                          className="btn btn-sm"
                          style={{ color: 'var(--ink-3)' }}
                        >
                          {markingId === app.id ? '…' : '↩ mark as pending'}
                        </button>
                      )}
                      <a
                        href={`mailto:${app.email}?subject=Your AquaTerra volunteer application&body=Hi ${app.full_name.split(' ')[0]},%0A%0A`}
                        className="btn btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        ✉ Email applicant
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <button
                className="btn btn-sm"
                disabled={loading}
                onClick={() => { const p = page + 1; setPage(p); fetchApps(p, true) }}
              >
                load more →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 520px) { .vol-date { display: inline !important; } }
      `}</style>
    </div>
  )
}
