import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { feedService } from '../services/feedService'
import teamService from '../services/teamService'
import { I } from '../components/v6Shared'
import FeedPostCard from '../feed/FeedPostCard'
import { Post } from '../services/api'

const AVATAR_COLORS = ['#00E5A0','#FF6BD6','#FFC700','#7E5BFF','#FF7A1A','#3DA9FC']
function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { member } = useAuth()
  // URL state — enables bookmarking and sharing search results
  const [q, setQ] = useState(() => searchParams.get('q') || '')
  const [type, setType] = useState(() => searchParams.get('type') || 'all')
  const [posts, setPosts] = useState<Post[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync state to URL so searches are bookmarkable/shareable
  useEffect(() => {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (type !== 'all') params.type = type
    setSearchParams(params, { replace: true })
  }, [q, type, setSearchParams])

  useEffect(() => {
    // preload all data on mount
    Promise.all([
      feedService.getFeed({ page: 1, limit: 50 }),
      feedService.searchMembers(''),
      teamService.getTeams({ limit: 30 }),
    ]).then(([postsRes, membersRes, teamsRes]) => {
      if (postsRes.success) setPosts(postsRes.data)
      if (membersRes.success) setMembers((membersRes.data as any)?.members || membersRes.data || [])
      if (teamsRes.success) setTeams((teamsRes as any).data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!q) return
    if (debounce.current) clearTimeout(debounce.current)
    setLoading(true)
    debounce.current = setTimeout(async () => {
      try {
        const [membersRes] = await Promise.all([
          feedService.searchMembers(q),
        ])
        if (membersRes.success) setMembers((membersRes.data as any)?.members || membersRes.data || [])
      } catch {}
      setLoading(false)
    }, 300)
  }, [q])

  const lc = q.toLowerCase()
  const matchPosts = posts.filter(p => !lc || (p.body || '').toLowerCase().includes(lc) || (p.authorName || '').toLowerCase().includes(lc) || (p.category || '').toLowerCase().includes(lc))
  const matchMembers = members.filter(m => !lc || (m.full_name || m.fullName || m.name || '').toLowerCase().includes(lc) || (m.school_name || m.schoolName || '').toLowerCase().includes(lc))
  const matchTeams = teams.filter(t => !lc || (t.name || '').toLowerCase().includes(lc) || (t.category || '').toLowerCase().includes(lc))

  const showPosts = type === 'all' || type === 'posts'
  const showMembers = type === 'all' || type === 'members'
  const showTeams = type === 'all' || type === 'teams'
  const totalResults = (showPosts ? matchPosts.length : 0) + (showMembers ? matchMembers.length : 0) + (showTeams ? matchTeams.length : 0)

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(24px, 4vw, 48px)', paddingBottom: 80, maxWidth: 960 }}>
      <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 64px)', margin: 0, lineHeight: 0.92 }}>
        find your <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--mint)' }}>people</span>.
      </h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>posts, members, and teams — all in one place.</p>

      {/* search bar */}
      <div style={{
        marginTop: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--card)',
        border: '2px solid var(--line-2)',
        borderRadius: 16,
        padding: '0 16px',
        height: 56,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
        onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--mint)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,229,160,0.15)' }}
        onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
      >
        <label htmlFor="aq-search" style={{ flexShrink: 0, color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
          <I.search />
        </label>
        <input
          id="aq-search"
          autoFocus
          placeholder="search anything..."
          value={q}
          onChange={e => setQ(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search AquaTerra"
          style={{
            flex: 1,
            border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 16,
            fontFamily: 'var(--sans)',
            color: 'var(--ink)',
            padding: 0,
            minWidth: 0,
          }}
        />
        {q && (
          <button
            className="btn btn-sm"
            onClick={() => setQ('')}
            aria-label="Clear search"
            style={{ flexShrink: 0, padding: '4px 10px', fontSize: 11 }}
          >
            clear
          </button>
        )}
      </div>

      {/* filters */}
      <div className="row gap-2" style={{ marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'posts', 'members', 'teams'].map(t => (
          <button key={t} className={'chip ' + (type === t ? 'chip-active' : '')} onClick={() => setType(t)}>{t}</button>
        ))}
        {q && (
          <span className="mono xs muted" aria-live="polite" aria-atomic="true" style={{ marginLeft: 'auto' }}>
            {totalResults} result{totalResults !== 1 ? 's' : ''}{loading ? '…' : ''}
          </span>
        )}
      </div>

      {/* empty state */}
      {!q && (
        <div style={{ marginTop: 64, textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 28, color: 'var(--ink-3)' }}>start typing to search.</div>
        </div>
      )}

      {/* results */}
      {q && (
        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* members */}
          {showMembers && matchMembers.length > 0 && (
            <section>
              <h3 className="h-display" style={{ fontSize: 28, marginBottom: 14 }}>members</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {matchMembers.slice(0, 8).map((m: any) => {
                  const name = m.full_name || m.fullName || m.name || 'Member'
                  const school = m.school_name || m.schoolName || m.school || ''
                  const role = m.role || 'member'
                  const uuid = m.uuid || m.id
                  const color = hashColor(name)
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  const path = member ? `/profile/${uuid}` : `/member/${uuid}`
                  return (
                    <div
                      key={uuid}
                      className="card card-hover"
                      style={{ padding: 14, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => navigate(path)}
                    >
                      <div className="avatar avatar-lg" style={{ background: color, margin: '4px auto', overflow: 'hidden' }}>
                        {m.avatar_url || m.avatarUrl
                          ? <img src={m.avatar_url || m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                          : initials}
                      </div>
                      <div style={{ fontWeight: 700, marginTop: 8, fontSize: 14 }}>{name}</div>
                      {school && <div className="mono xs muted">{school}</div>}
                      <span className={'role role-' + role} style={{ marginTop: 8 }}>{role}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* teams */}
          {showTeams && matchTeams.length > 0 && (
            <section>
              <h3 className="h-display" style={{ fontSize: 28, marginBottom: 14 }}>teams</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {matchTeams.slice(0, 6).map((t: any) => (
                  <div
                    key={t.uuid || t.id}
                    className="card card-hover"
                    style={{ overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => navigate('/teams/' + (t.uuid || t.id))}
                  >
                    <div style={{ background: hashColor(t.name || ''), padding: 20, borderBottom: '2px solid var(--ink)', color: '#0A0A0A', position: 'relative', overflow: 'hidden' }}>
                      <div className="mono xs upper" style={{ fontWeight: 700 }}>★ {t.category}</div>
                      <div className="h-display" style={{ fontSize: 28, marginTop: 6 }}>{t.name}</div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 10px', minHeight: 36 }}>{t.description || t.bio || ''}</p>
                      <div className="mono xs muted">{t.memberCount || 0} members</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* posts */}
          {showPosts && matchPosts.length > 0 && (
            <section>
              <h3 className="h-display" style={{ fontSize: 28, marginBottom: 14 }}>posts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                {matchPosts.slice(0, 6).map((p, i) => (
                  <FeedPostCard key={p.uuid} post={p} seed={i} />
                ))}
              </div>
            </section>
          )}

          {/* no results */}
          {totalResults === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="h-display" style={{ fontSize: 32, color: 'var(--ink-3)' }}>no results for "{q}"</div>
              <p className="muted" style={{ marginTop: 8 }}>try different keywords.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
