import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, normalizeObj, OBJ_COLORS, WelfareProject } from '../lib/supabase'
import { useReveal } from '../hooks/useReveal'
import ProjectCard from '../components/ProjectCard'

export default function PublicProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [project, setProject] = useState<WelfareProject | null>(null)
  const [related, setRelated] = useState<Pick<WelfareProject, 'slug' | 'header' | 'main_image' | 'main_image_alt' | 'objective' | 'location' | 'volunteers' | 'key_statistic'>[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  useReveal()

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
          .select('slug, header, main_image, main_image_alt, objective, location, volunteers, key_statistic')
          .eq('is_draft', false)
          .eq('objective', data.objective || '')
          .neq('slug', slug)
          .limit(3)
          .then(({ data: rel }) => rel && setRelated(rel))
      })
  }, [slug])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--txt-3)', fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '0.06em' }}>
        LOADING…
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="aq-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h1 className="aq-title" style={{ marginBottom: 16 }}>Project not found.</h1>
        <Link to="/projects" className="aq-btn aq-btn-outline">← All Projects</Link>
      </div>
    )
  }

  const norm = normalizeObj(project.objective)
  const color = OBJ_COLORS[norm] || OBJ_COLORS['Others']
  const images = [
    project.image_1 && { src: project.image_1, alt: project.image_1_alt, label: project.label_1 },
    project.image_2 && { src: project.image_2, alt: project.image_2_alt, label: project.label_2 },
    project.image_3 && { src: project.image_3, alt: project.image_3_alt, label: project.label_3 },
    project.image_4 && { src: project.image_4, alt: project.image_4_alt, label: project.label_4 },
  ].filter(Boolean) as { src: string; alt: string | null; label: string | null }[]

  const writeupParagraphs = (project.long_writeup || '').split('\n\n').filter(p => p.trim())

  return (
    <div className="aq-page">
      {/* Back */}
      <div className="aq-wrap" style={{ paddingTop: 24, paddingBottom: 0 }}>
        <Link to="/projects" style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--txt-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← All Projects
        </Link>
      </div>

      {/* Hero image — tighter, no wasted space */}
      <div className="aq-proj-hero" style={{ marginTop: 20 }}>
        {project.main_image ? (
          <img src={project.main_image} alt={project.main_image_alt || project.header} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--txt-4)' }}>NO IMAGE</span>
          </div>
        )}
        <div className="aq-proj-hero-overlay" />
        <div className="aq-proj-hero-content">
          <div style={{ marginBottom: 12 }}>
            <span className="aq-obj-tag" style={{ background: `${color}30`, color: '#fff', border: `1px solid ${color}60` }}>{norm}</span>
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 'clamp(22px, 4vw, 48px)', lineHeight: 1.0, letterSpacing: '-0.03em', textTransform: 'uppercase', color: '#f0ede4', marginBottom: 12 }}>
            {project.header}
          </h1>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {project.location && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'rgba(240,237,228,0.7)', letterSpacing: '0.04em' }}>
                📍 {project.location}
              </span>
            )}
            {project.workshop_date && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'rgba(240,237,228,0.7)', letterSpacing: '0.04em' }}>
                {new Date(project.workshop_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            {project.volunteers != null && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'rgba(240,237,228,0.7)', letterSpacing: '0.04em' }}>
                {project.volunteers} volunteers
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="aq-wrap-sm" style={{ padding: '56px 28px 0' }}>
        {/* Key stat */}
        {project.key_statistic && (
          <div style={{ fontWeight: 700, fontSize: 'clamp(28px, 4vw, 52px)', letterSpacing: '-0.04em', color, marginBottom: 28, lineHeight: 1 }}>
            {project.key_statistic}
          </div>
        )}

        {/* Summary */}
        {project.short_summary && (
          <p style={{ fontSize: 'clamp(17px, 2.2vw, 24px)', color: 'var(--txt)', marginBottom: 36, lineHeight: 1.55, fontWeight: 500 }}>
            {project.short_summary}
          </p>
        )}

        {/* Long writeup — show what's there, no placeholder */}
        {writeupParagraphs.length > 0 && (
          <div className="aq-prose" style={{ marginBottom: 48 }}>
            {writeupParagraphs.map((para, i) => <p key={i}>{para}</p>)}
          </div>
        )}

        {/* Meta grid */}
        {(project.collab_name || project.google_drive_link) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, padding: '24px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 48 }}>
            {project.collab_name && (
              <div>
                <div className="aq-label" style={{ marginBottom: 6 }}>Partner</div>
                <div style={{ fontSize: 13, color: 'var(--txt)', fontWeight: 600 }}>{project.collab_name}</div>
              </div>
            )}
            {project.google_drive_link && (
              <div>
                <div className="aq-label" style={{ marginBottom: 6 }}>Photos</div>
                <a href={project.google_drive_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>View Drive →</a>
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {images.length > 0 && (
          <div style={{ marginBottom: 56 }}>
            <div className="aq-label" style={{ marginBottom: 20 }}>Gallery</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', borderRadius: 'var(--r-md)', background: 'var(--bg-2)' }}>
                  <img src={img.src} alt={img.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  {img.label && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.6)', fontFamily: 'var(--f-mono)', fontSize: 10, color: '#fff', letterSpacing: '0.04em' }}>
                      {img.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Projects — no hairline-grid boxing, proper card grid */}
      {related.length > 0 && (
        <section style={{ borderTop: '1px solid var(--line)', padding: '56px 0 80px' }}>
          <div className="aq-wrap">
            <div className="aq-label" style={{ marginBottom: 24 }}>Related Projects</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {related.map(r => {
                const rNorm = normalizeObj(r.objective)
                const rColor = OBJ_COLORS[rNorm] || OBJ_COLORS['Others']
                return (
                  <ProjectCard
                    key={r.slug} slug={r.slug} header={r.header}
                    objective={r.objective ?? ''} location={r.location ?? undefined} volunteers={r.volunteers}
                    key_statistic={r.key_statistic}
                    main_image={r.main_image ?? undefined} main_image_alt={r.main_image_alt ?? undefined}
                    index={0} color={rColor} norm={rNorm}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
