import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, normalizeObj, OBJ_COLORS, WelfareProject } from '../lib/supabase'

const OBJ_CAT_MAP: Record<string, string> = {
  'Workshop': 'welfare',
  'Feeding Dogs': 'welfare',
  'Plantation Drive': 'welfare',
  'Distribution Drive': 'welfare',
  'Sundarbans Relief': 'welfare',
  'Old Age Home Visit': 'welfare',
  'Fundraising Event': 'events',
  'Others': 'operations',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

type RelatedProject = Pick<WelfareProject, 'slug' | 'header' | 'main_image' | 'main_image_alt' | 'objective' | 'location' | 'volunteers' | 'key_statistic'>

export default function PublicProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [project, setProject] = useState<WelfareProject | null>(null)
  const [related, setRelated] = useState<RelatedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAutoplay = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const resetAutoplay = useCallback((total: number) => {
    clearAutoplay()
    if (total <= 1) return
    intervalRef.current = setInterval(() => {
      setActiveImg(i => (i + 1) % total)
    }, 3800)
  }, [clearAutoplay])

  const goTo = useCallback((idx: number, total: number) => {
    setActiveImg(idx)
    resetAutoplay(total)
  }, [resetAutoplay])

  // Start autoplay once images are known
  useEffect(() => {
    if (!project) return
    const imgs = [
      project.main_image,
      project.image_1, project.image_2, project.image_3, project.image_4,
    ].filter(Boolean)
    if (imgs.length > 1 && isPlaying) resetAutoplay(imgs.length)
    return clearAutoplay
  }, [project, isPlaying, resetAutoplay, clearAutoplay])

  useEffect(() => {
    if (!slug) return
    supabase
      .from('welfare_projects')
      .select('*')
      .eq('slug', slug)
      .eq('is_draft', false)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return }
        setProject(data)
        setLoading(false)
        supabase
          .from('welfare_projects')
          .select('slug,header,main_image,main_image_alt,objective,location,volunteers,key_statistic')
          .eq('is_draft', false)
          .eq('objective', data.objective || '')
          .neq('slug', slug)
          .limit(4)
          .then(({ data: rel }) => rel && setRelated(rel))
      })
  }, [slug])

  if (loading) {
    return (
      <div className="route-enter container" style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)', textAlign: 'center' }}>
        <div className="mono xs upper muted">loading...</div>
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="route-enter container" style={{ padding: 'clamp(44px, 8vw, 80px) var(--page-px,24px) clamp(32px, 5vw, 56px)', textAlign: 'center' }}>
        <div className="h-display" style={{ fontSize: 40 }}>project not found.</div>
        <Link to="/projects" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>← all projects</Link>
      </div>
    )
  }

  const norm = normalizeObj(project.objective)
  const accentColor = OBJ_COLORS[norm] || OBJ_COLORS['Others']
  const category = OBJ_CAT_MAP[norm] || 'welfare'

  const images = [
    project.image_1 && { src: project.image_1, alt: project.image_1_alt, label: project.label_1 },
    project.image_2 && { src: project.image_2, alt: project.image_2_alt, label: project.label_2 },
    project.image_3 && { src: project.image_3, alt: project.image_3_alt, label: project.label_3 },
    project.image_4 && { src: project.image_4, alt: project.image_4_alt, label: project.label_4 },
  ].filter(Boolean) as { src: string; alt: string | null; label: string | null }[]

  const allImages = project.main_image
    ? [{ src: project.main_image, alt: project.main_image_alt, label: null }, ...images]
    : images

  const writeupParagraphs = (project.long_writeup || '').split('\n\n').filter(p => p.trim())

  return (
    <div className="route-enter">

      {/* ── BACK NAV ── */}
      <div className="container" style={{ padding: '20px 16px 0' }}>
        <Link to="/projects" className="btn btn-sm">← all projects</Link>
      </div>

      {/* ── HERO MEDIA + TITLE OVERLAY ── */}
      <div className="proj-hero">
        {project.main_image ? (
          <img
            src={project.main_image}
            alt={project.main_image_alt || project.header}
            className="proj-hero-img"
          />
        ) : (
          <div className="proj-hero-img proj-hero-placeholder" style={{ background: accentColor + '33' }}>
            <div className="h-display" style={{ fontSize: 48, opacity: 0.3 }}>{norm}</div>
          </div>
        )}
        <div className="proj-hero-scrim" />
        <div className="proj-hero-content">
          <span className={'chip cat-' + category} style={{ marginBottom: 12, display: 'inline-flex', background: 'rgba(0,0,0,0.4)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
            {norm}
          </span>
          <h1 className="h-display proj-hero-title">{project.header}</h1>
          <div className="proj-meta-row">
            {project.location && <span className="proj-meta-chip">📍 {project.location}</span>}
            {project.workshop_date && <span className="proj-meta-chip">{formatDate(project.workshop_date)}</span>}
            {project.volunteers != null && <span className="proj-meta-chip">{project.volunteers} volunteers</span>}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY ── */}
      <div className="proj-body">

        {/* Key stat — huge pull-quote */}
        {project.key_statistic && (
          <div className="proj-stat-pull" style={{ color: accentColor }}>
            {project.key_statistic}
          </div>
        )}

        {/* Summary */}
        {project.short_summary && (
          <p className="proj-summary">{project.short_summary}</p>
        )}

        {/* Meta chips on mobile — second row */}
        <div className="row gap-2 flex-wrap" style={{ margin: '0 0 28px' }}>
          {project.collab_name && (
            <div className="card" style={{ padding: '10px 14px', display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <span className="mono xs upper muted" style={{ fontWeight: 700 }}>partner</span>
              {project.collab_logo && (
                <img
                  src={project.collab_logo}
                  alt={project.collab_name}
                  style={{
                    height: 24, width: 'auto', maxWidth: 80,
                    objectFit: 'contain', display: 'block',
                    outline: '1px solid rgba(0,0,0,0.08)',
                    outlineOffset: -1,
                    borderRadius: 4,
                  }}
                />
              )}
              <span style={{ fontWeight: 700, fontSize: 14 }}>{project.collab_name}</span>
            </div>
          )}
          {project.google_drive_link && (
            <a href={project.google_drive_link} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
              view photos ↗
            </a>
          )}
        </div>

        {/* Long writeup */}
        {writeupParagraphs.length > 0 && (
          <div className="proj-writeup">
            {writeupParagraphs.map((para, i) => <p key={i}>{para}</p>)}
          </div>
        )}

        {/* ── PHOTO GALLERY ── */}
        {allImages.length > 1 && (
          <div className="proj-gallery">
            {/* Thumbnail strip — horizontal scroll on mobile */}
            <div className="proj-gallery-strip">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  className={'proj-thumb ' + (activeImg === i ? 'active' : '')}
                  onClick={() => goTo(i, allImages.length)}
                  aria-label={`View photo ${i + 1}`}
                >
                  <img src={img.src} alt={img.alt || ''} loading="lazy" />
                </button>
              ))}
            </div>

            {/* Main viewer */}
            <div className="proj-gallery-main">
              <img
                src={allImages[activeImg].src}
                alt={allImages[activeImg].alt || ''}
                loading="lazy"
              />
              {allImages[activeImg].label && (
                <div className="proj-gallery-caption">{allImages[activeImg].label}</div>
              )}
              <div className="proj-gallery-counter">
                {String(activeImg + 1).padStart(2, '0')} / {String(allImages.length).padStart(2, '0')}
              </div>
              {/* Auto-advance progress bar */}
              {isPlaying && allImages.length > 1 && (
                <div className="proj-progress-bar" key={activeImg}>
                  <div className="proj-progress-fill" style={{ animationDuration: '3.8s' }} />
                </div>
              )}
              {/* Play/pause toggle */}
              <button
                className="proj-gallery-playpause"
                onClick={() => setIsPlaying(p => !p)}
                aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              {/* Prev / Next */}
              {allImages.length > 1 && (
                <>
                  <button
                    className="proj-gallery-nav proj-gallery-prev"
                    onClick={() => goTo((activeImg - 1 + allImages.length) % allImages.length, allImages.length)}
                    aria-label="Previous photo"
                  >
                    ←
                  </button>
                  <button
                    className="proj-gallery-nav proj-gallery-next"
                    onClick={() => goTo((activeImg + 1) % allImages.length, allImages.length)}
                    aria-label="Next photo"
                  >
                    →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Single image — just show it */}
        {allImages.length === 1 && (
          <div className="proj-single-img">
            <img src={allImages[0].src} alt={allImages[0].alt || ''} loading="lazy" />
            {allImages[0].label && <div className="proj-gallery-caption">{allImages[0].label}</div>}
          </div>
        )}

      </div>

      {/* ── SIMILAR PROJECTS ── */}
      {related.length > 0 && (
        <div style={{
          borderTop: '2px solid var(--ink)',
          padding: 'clamp(32px,5vw,56px) 0 0',
          marginTop: 'clamp(32px,5vw,48px)',
        }}>
          <div className="container">
            {/* Section label */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span className="sticker sticker-mint" style={{ display: 'inline-flex', fontSize: 10, marginBottom: 10 }}>
                  ★ MORE LIKE THIS
                </span>
                <h2 className="h-display" style={{ fontSize: 'clamp(28px,4vw,42px)', margin: 0, lineHeight: 0.95 }}>
                  similar <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: accentColor }}>projects.</span>
                </h2>
              </div>
              <Link to="/projects" className="btn btn-sm btn-ghost" style={{ flexShrink: 0 }}>
                all projects →
              </Link>
            </div>

            {/* Ticket grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
              paddingBottom: 'clamp(32px,5vw,60px)',
            }}>
              {related.map(r => {
                const rNorm = normalizeObj(r.objective)
                const rColor = OBJ_COLORS[rNorm] || OBJ_COLORS['Others']
                return (
                  <Link
                    key={r.slug}
                    to={`/projects/${r.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      border: '2px solid var(--ink)',
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: 'var(--card)',
                      boxShadow: '3px 3px 0 0 var(--ink)',
                      transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '5px 7px 0 0 var(--ink)' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '3px 3px 0 0 var(--ink)' }}
                    >
                      {/* Image */}
                      {r.main_image ? (
                        <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                          <img
                            src={r.main_image}
                            alt={r.main_image_alt || r.header}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div style={{ aspectRatio: '4/3', background: rColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 32, color: rColor, opacity: 0.5 }}>{rNorm[0]}</span>
                        </div>
                      )}

                      {/* Content */}
                      <div style={{ padding: '14px 16px 16px' }}>
                        {/* Category tag */}
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: rColor, display: 'block', marginBottom: 6,
                        }}>
                          {rNorm}
                        </span>
                        {/* Title */}
                        <div style={{
                          fontFamily: 'var(--display)', fontWeight: 800, fontSize: 15,
                          lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}>
                          {r.header}
                        </div>
                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          {r.location && (
                            <span className="mono xs muted">📍 {r.location}</span>
                          )}
                          {r.volunteers != null && (
                            <span className="mono xs muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.volunteers} vol.</span>
                          )}
                          {r.key_statistic && (
                            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 12, color: rColor, marginLeft: 'auto' }}>
                              {r.key_statistic}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div className="container" style={{ padding: '0 16px 80px' }}>
        <div className="card" style={{ padding: 'clamp(28px, 5vw, 48px) clamp(20px, 4vw, 36px)', background: 'var(--ink)', color: 'var(--bg)', textAlign: 'center' }}>
          <div className="h-display" style={{ fontSize: 'clamp(28px, 6vw, 44px)', lineHeight: 0.95, marginBottom: 12 }}>
            want to be<br />part of the next one<span style={{ color: 'var(--mint)' }}>?</span>
          </div>
          <p style={{ fontSize: 15, opacity: 0.75, marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
            welfare drives happen regularly. join AquaTerra to get notified and show up.
          </p>
          <div className="row gap-2" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary">apply to join</Link>
            <Link to="/projects" className="btn" style={{ background: 'transparent', color: 'var(--bg)' }}>browse all projects</Link>
          </div>
        </div>
      </div>

      <style>{`
        /* ─── PROJECT DETAIL — mobile-first ─── */

        .proj-hero {
          position: relative;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 0;
          background: var(--bg-2);
          aspect-ratio: 4/3;
        }
        @media (min-width: 640px) {
          .proj-hero { aspect-ratio: 16/7; border-radius: 0; margin: 16px 0 0; }
        }
        .proj-hero-img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .proj-hero-placeholder {
          display: grid; place-items: center;
        }
        .proj-hero-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.22) 50%, transparent 80%);
        }
        .proj-hero-content {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 20px 16px;
        }
        @media (min-width: 640px) {
          .proj-hero-content { padding: 32px 32px; }
        }
        .proj-hero-title {
          font-size: clamp(26px, 6vw, 52px);
          line-height: 1.0;
          color: #fff;
          margin: 0 0 12px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .proj-meta-row {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .proj-meta-chip {
          font-family: var(--mono); font-size: 11px;
          color: rgba(255,255,255,0.8);
          background: rgba(0,0,0,0.35);
          padding: 4px 10px; border-radius: 999px;
          letter-spacing: 0.02em;
          backdrop-filter: blur(6px);
        }

        /* ─── BODY ─── */
        .proj-body {
          padding: 28px 16px 0;
          max-width: 720px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .proj-body { padding: 44px 28px 0; }
        }

        .proj-stat-pull {
          font-family: var(--display);
          font-weight: 800;
          font-size: clamp(38px, 9vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.04em;
          margin: 0 0 22px;
          font-family: var(--eina);
        }

        .proj-summary {
          font-family: var(--eina);
          font-size: clamp(17px, 2.5vw, 22px);
          line-height: 1.55;
          font-weight: 500;
          color: var(--ink);
          margin: 0 0 28px;
        }

        .proj-writeup {
          font-family: var(--eina);
          margin-bottom: 40px;
        }
        .proj-writeup p {
          font-family: var(--eina);
          font-size: 16px;
          line-height: 1.75;
          color: var(--ink-2);
          margin: 0 0 18px;
        }

        /* ─── GALLERY ─── */
        .proj-gallery { margin-bottom: 40px; }

        .proj-gallery-strip {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-bottom: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          overscroll-behavior-x: none;
        }
        .proj-gallery-strip::-webkit-scrollbar { display: none; }

        .proj-thumb {
          width: 64px; height: 64px;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: border-color 0.15s, transform 0.15s;
          cursor: pointer;
          padding: 0;
          background: none;
        }
        .proj-thumb.active {
          border-color: var(--ink);
          transform: scale(1.05);
        }
        .proj-thumb img {
          width: 100%; height: 100%; object-fit: cover;
        }

        .proj-gallery-main {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: var(--bg-2);
          border: 2px solid var(--ink);
          aspect-ratio: 16/10;
        }
        .proj-gallery-main img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .proj-gallery-caption {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.92);
          background: linear-gradient(transparent, rgba(0,0,0,0.65));
          letter-spacing: -0.01em;
        }
        .proj-gallery-counter {
          position: absolute; top: 10px; left: 10px;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.85);
          font-family: var(--mono); font-size: 10px; font-weight: 700;
          padding: 3px 8px; border-radius: 999px;
        }
        .proj-gallery-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 40px; height: 40px;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(8px);
          color: #fff;
          border: none; border-radius: 50%; cursor: pointer;
          font-size: 18px; display: grid; place-items: center;
          transition: background 0.15s, transform 0.15s;
        }
        .proj-gallery-nav:hover { background: rgba(0,0,0,0.7); }
        .proj-gallery-nav:active { transform: translateY(-50%) scale(0.96); }
        .proj-gallery-prev { left: 10px; }
        .proj-gallery-next { right: 10px; }

        .proj-single-img {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid var(--ink);
          margin-bottom: 40px;
        }
        .proj-single-img img { width: 100%; display: block; }

        /* ─── RELATED ─── */
        .proj-related {
          padding: 40px 0 48px;
          border-top: 2px solid var(--ink);
          margin-top: 40px;
        }
        .proj-related-scroll {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }
        @media (max-width: 640px) {
          .proj-related-scroll {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 8px;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-x: none;
            scrollbar-width: none;
          }
          .proj-related-scroll::-webkit-scrollbar { display: none; }
        }
        .proj-related-card {
          background: var(--card);
          border: 2px solid var(--ink);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 200px;
          transition: transform 0.15s;
          color: var(--ink);
        }
        @media (max-width: 640px) {
          .proj-related-card { min-width: 200px; flex-shrink: 0; }
        }
        .proj-related-card:hover { transform: translateY(-3px); }
        .proj-related-img {
          aspect-ratio: 16/10; overflow: hidden;
          border-bottom: 2px solid var(--ink);
        }
        .proj-related-img img { width: 100%; height: 100%; object-fit: cover; }
        .proj-related-placeholder { display: grid; place-items: center; }
        .proj-related-body { padding: 14px 16px 16px; }

        /* ─── Slideshow progress bar ─── */
        .proj-progress-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 3px; background: rgba(255,255,255,0.18);
          pointer-events: none;
        }
        .proj-progress-fill {
          height: 100%;
          background: rgba(255,255,255,0.82);
          animation: proj-progress linear forwards;
          width: 0%;
        }
        @keyframes proj-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .proj-gallery-playpause {
          position: absolute; bottom: 10px; right: 10px; z-index: 3;
          width: 28px; height: 28px; border-radius: 50%;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: rgba(255,255,255,0.85);
          border: none; cursor: pointer; font-size: 10px;
          display: grid; place-items: center;
          transition: background 0.15s;
        }
        .proj-gallery-playpause:hover { background: rgba(0,0,0,0.7); }
      `}</style>
    </div>
  )
}
