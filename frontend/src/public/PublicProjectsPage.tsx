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
  const [filterPill, setFilterPill] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const heroRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  useReveal()

  /* Filter bar pill morph when hero exits */
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const obs = new IntersectionObserver(
      ([entry]) => setFilterPill(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )
    obs.observe(hero)
    return () => obs.disconnect()
  }, [])

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
    supabase
      .from('welfare_projects')
      .select('id,slug,header,objective,location,workshop_date,volunteers,main_image,main_image_alt,featured,key_statistic')
      .eq('is_draft', false)
      .order('workshop_date', { ascending: true })  /* ascending = oldest first → oldest gets #001 */
      .then(({ data }) => { if (data) setProjects(data); setLoading(false) })
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
    <div className="aq-page">
      {/* Hero */}
      <section ref={heroRef} style={{ position: 'relative', padding: 'clamp(72px, 12vw, 140px) 0 clamp(48px, 8vw, 80px)', overflow: 'hidden' }}>
        <div className="aq-rule-v" />
        <div className="aq-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div className="aq-label aq-reveal" style={{ marginBottom: 16, color: 'var(--c-welfare)' }}>534+ welfare drives</div>
          <h1 className="aq-hero aq-reveal aq-reveal-d1" style={{ marginBottom: 20 }}>
            Our<br />Projects.
          </h1>
          <p className="aq-serif aq-reveal aq-reveal-d2" style={{ color: 'var(--txt-2)', maxWidth: 480 }}>
            Every welfare drive, plantation, distribution run, and workshop — documented since 2021.
          </p>
        </div>
      </section>

      {/* Spacer for fixed filter bar */}
      {filterPill && <div style={{ height: 54 }} aria-hidden />}

      {/* Filter bar */}
      <div className={`aq-filter-bar${filterPill ? ' pill' : ''}`}>
        <div className={filterPill ? 'aq-filter-bar-inner' : 'aq-wrap'}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-4)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text" className="aq-input" placeholder="Search…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 30, height: 34, borderRadius: 'var(--r-pill)', fontSize: 12, width: filterPill ? 140 : 200, transition: 'width 0.35s cubic-bezier(0.2,0,0,1)' }}
              />
            </div>
            <div className="aq-scroll-x" style={{ display: 'flex', gap: 5 }}>
              {OBJ_FILTER_OPTIONS.map(o => (
                <button key={o} onClick={() => setObjFilter(o)} className={`aq-chip ${objFilter === o ? 'on' : ''}`}
                  style={objFilter !== o && o !== 'All' ? { borderColor: `${OBJ_COLORS[o]}40`, color: OBJ_COLORS[o] } : {}}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Projects — show only on initial "All" view with no search */}
      {featured.length > 0 && objFilter === 'All' && !search && (
        <section className="aq-band-sm">
          <div className="aq-wrap">
            <div className="aq-label aq-reveal" style={{ marginBottom: 24 }}>Featured Projects</div>
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
      <section className="aq-band-sm">
        <div className="aq-wrap">
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="aq-label aq-reveal">All Projects</div>
            <span className="aq-mono tabular-nums" style={{ color: 'var(--txt-3)', fontSize: 11 }}>
              {loading ? '…' : `${filtered.length} projects`}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius: 'var(--r-md)', background: 'var(--surface)', aspectRatio: '3/4', animation: 'aq-pulse 1.8s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'left' }}>
              <p style={{ fontStyle: 'italic', fontSize: 16, color: 'var(--txt-3)' }}>No projects match your search.</p>
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
