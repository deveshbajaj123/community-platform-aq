import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase, normalizeObj, OBJ_COLORS, WelfareProject } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'
import ProjectCard from '../components/ProjectCard'

type ProjectCard = Pick<WelfareProject, 'id' | 'slug' | 'header' | 'objective' | 'location' | 'workshop_date' | 'volunteers' | 'main_image' | 'main_image_alt' | 'featured' | 'key_statistic'>

const OBJ_FILTER_OPTIONS = ['All', 'Workshop', 'Feeding Dogs', 'Plantation Drive', 'Distribution Drive', 'Sundarbans Relief', 'Old Age Home Visit', 'Fundraising Event', 'Others']
const PAGE_SIZE = 20

export default function PublicProjectsPage() {
  const [projects, setProjects] = useState<ProjectCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [objFilter, setObjFilter] = useState('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const heroRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useReveal()

  /* Infinite scroll sentinel */
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(c => c + PAGE_SIZE)
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [])

  /* Reset visible count when filters change */
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, objFilter])

  useEffect(() => {
    const CACHE_KEY = 'aq_projects_cache'
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data: cachedData, ts } = JSON.parse(cached)
        if (Date.now() - ts < CACHE_TTL && cachedData?.length) {
          setProjects(cachedData)
          setLoading(false)
          return
        }
      }
    } catch {}
    supabase
      .from('welfare_projects')
      .select('id,slug,header,objective,location,workshop_date,volunteers,main_image,main_image_alt,featured,key_statistic')
      .eq('is_draft', false)
      .order('workshop_date', { ascending: true })
      .limit(600)
      .then(({ data }) => {
        if (data) {
          setProjects(data)
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
        }
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const norm = normalizeObj(p.objective)
      const matchesObj = objFilter === 'All' || norm === objFilter
      const matchesSearch = !search || p.header.toLowerCase().includes(search.toLowerCase()) || (p.location || '').toLowerCase().includes(search.toLowerCase())
      return matchesObj && matchesSearch
    })
  }, [projects, search, objFilter])

  /* Featured: always from full project list, show up to 3 */
  const featured = useMemo(() => projects.filter(p => p.featured).slice(0, 3), [projects])

  const visibleFiltered = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const totalCount = projects.length


  return (
    <div className="route-enter">
      {/* ── HERO — split: typography left, 3D marquee right ── */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: 'clamp(340px, 50vh, 520px)',
          background: '#0A0A0A',
          overflow: 'hidden',
          display: 'block',
        }}
        className="projects-hero"
      >

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }} />

        {/* ── LEFT: text content ── */}
        <div style={{
          position: 'relative', zIndex: 5,
          padding: 'clamp(48px, 7vw, 88px) clamp(24px, 5vw, 64px)',
          color: '#fff',
        }}>
          <span
            className="sticker sticker-mint sticker-float"
            style={{ marginBottom: 20, display: 'inline-flex' }}
          >
            ★ {loading ? '534+' : `${projects.length}+`} welfare drives
          </span>

          <h1 style={{
            fontFamily: 'var(--display)',
            fontWeight: 900,
            fontSize: 'clamp(56px, 9vw, 112px)',
            lineHeight: 0.88,
            letterSpacing: '-0.04em',
            margin: '0 0 20px',
            color: '#fff',
            textTransform: 'uppercase',
          }}>
            OUR<br />
            <span style={{ color: 'var(--mint)' }}>PROJ</span>
            <span style={{
              fontStyle: 'italic',
              fontFamily: 'var(--serif)',
              fontWeight: 400,
              color: 'var(--lemon)',
              textTransform: 'none',
              fontSize: '0.9em',
            }}>ects</span>
            <span style={{ color: 'var(--mint)' }}>.</span>
          </h1>

          <p style={{
            fontFamily: 'var(--eina)',
            fontSize: 'clamp(15px, 1.6vw, 18px)',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.6)',
            maxWidth: 420,
            margin: '0 0 32px',
          }}>
            Every welfare drive, plantation, distribution run, and workshop.
            Documented since 2021.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { k: '4,000+', v: 'saplings planted' },
              { k: '3,500+', v: 'kids reached' },
              { k: '8',      v: 'Sundarbans trips' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '10px 16px',
              }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: 22, color: 'var(--mint)', lineHeight: 1, letterSpacing: '-0.03em' }}>{s.k}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* Sticky search bar only */}
      <div style={{
        position: 'sticky',
        top: 'var(--nav-h, 70px)',
        zIndex: 9,
        background: 'rgba(var(--bg-rgb, 10,37,64), 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)',
        padding: '10px var(--page-px, 24px)',
      }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="input"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36, borderRadius: 999, fontSize: 13, width: '100%' }}
          />
        </div>
      </div>

      {/* Category chips — not sticky, scroll with content */}
      <div style={{ padding: '12px var(--page-px, 24px) 0', overflowX: 'auto', display: 'flex', gap: 6, scrollbarWidth: 'none' }}>
        {OBJ_FILTER_OPTIONS.map(o => (
          <button key={o} onClick={() => setObjFilter(o)}
            className={`chip ${objFilter === o ? 'on' : ''}`}
            style={{ flexShrink: 0, ...(objFilter !== o && o !== 'All' ? { borderColor: `${OBJ_COLORS[o]}40`, color: OBJ_COLORS[o] } : {}) }}>
            {o}
          </button>
        ))}
      </div>

      {/* Featured Projects — show only on initial "All" view with no search */}
      {featured.length > 0 && objFilter === 'All' && !search && (
        <section style={{ padding: 'clamp(24px,3vw,40px) var(--page-px,24px) 0' }}>
          <div className="container">
            <div className="mono xs upper muted" style={{ fontWeight: 700, marginBottom: 24, letterSpacing: '0.06em' }}>Featured Projects</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginBottom: 8 }}>
              {featured.map((p) => {
                const norm = normalizeObj(p.objective)
                const color = OBJ_COLORS[norm] || OBJ_COLORS['Others']
                const projectIndex = projects.findIndex(pr => pr.slug === p.slug)
                const displayNum = totalCount - projectIndex
                return (
                  <ProjectCard
                    key={p.slug} slug={p.slug} header={p.header} objective={p.objective ?? ''}
                    location={p.location ?? undefined} volunteers={p.volunteers} key_statistic={p.key_statistic}
                    main_image={p.main_image ?? undefined} main_image_alt={p.main_image_alt ?? undefined}
                    index={displayNum - 1} color={color} norm={norm} reverseNum={displayNum}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* All Projects */}
      <section style={{ padding: 'clamp(24px,3vw,40px) var(--page-px,24px) 60px' }}>
        <div className="container">
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="mono xs upper muted" style={{ fontWeight: 700, letterSpacing: '0.06em' }}>All Projects</div>
            <span className="mono tabular-nums" style={{ color: 'var(--ink-3)', fontSize: 11 }}>
              {loading ? '…' : `${filtered.length} projects`}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius: 12, background: 'var(--bg-2)', aspectRatio: '3/4', animation: 'aq-pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'left' }}>
              <p style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)' }}>No projects match your search.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {visibleFiltered.map((p) => {
                  const norm = normalizeObj(p.objective)
                  const color = OBJ_COLORS[norm] || OBJ_COLORS['Others']
                  /* Reverse numbering: most recent = highest number */
                  const projectIndex = projects.findIndex(pr => pr.slug === p.slug)
                  const displayNum = totalCount - projectIndex
                  return (
                    <ProjectCard
                      key={p.slug} slug={p.slug} header={p.header} objective={p.objective ?? ''}
                      location={p.location ?? undefined} volunteers={p.volunteers} key_statistic={p.key_statistic}
                      main_image={p.main_image ?? undefined} main_image_alt={p.main_image_alt ?? undefined}
                      index={displayNum - 1} color={color} norm={norm} reverseNum={displayNum}
                    />
                  )
                })}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid var(--line-2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'aqSpin 0.7s linear infinite' }} />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
