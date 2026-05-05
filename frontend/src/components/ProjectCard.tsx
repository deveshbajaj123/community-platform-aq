import { Link } from 'react-router-dom'

interface ProjectCardProps {
  slug: string
  header: string
  objective: string
  location?: string | null | undefined
  volunteers?: number | null
  key_statistic?: string | null
  main_image?: string | null | undefined
  main_image_alt?: string | null | undefined
  index: number
  color: string
  norm: string
  reverseNum?: number
}

export default function ProjectCard({ slug, header, location, volunteers, key_statistic, main_image, main_image_alt, color, norm, reverseNum, index }: ProjectCardProps) {
  const displayNum = reverseNum ?? (index + 1)

  return (
    <Link to={`/projects/${slug}`} className="pcard" style={{ '--pcard-accent': color } as React.CSSProperties}>
      <div className="pcard-img">
        {main_image ? (
          <img src={main_image} alt={main_image_alt || header} className="pcard-img-el" loading="lazy" />
        ) : (
          <div className="pcard-no-img">No image</div>
        )}
        <div className="pcard-num">#{String(displayNum).padStart(3, '0')}</div>
      </div>

      <div className="pcard-body">
        <span className="pcard-tag" style={{ '--tag-c': color } as React.CSSProperties}>
          {norm}
        </span>
        <h3 className="pcard-title">{header}</h3>
        <div className="pcard-meta">
          {location && (
            <span className="pcard-location">
              <svg width="8" height="10" viewBox="0 0 8 10" fill="none" aria-hidden>
                <path d="M4 0C2.34 0 1 1.34 1 3c0 2.5 3 5.5 3 5.5s3-3 3-5.5C7 1.34 5.66 0 4 0zm0 4.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
              </svg>
              {location}
            </span>
          )}
          {(volunteers != null || key_statistic) && (
            <span className="pcard-stats">
              {volunteers != null && <span className="tabular-nums">{volunteers} vols</span>}
              {volunteers != null && key_statistic && <span className="pcard-dot" />}
              {key_statistic && <span>{key_statistic}</span>}
            </span>
          )}
        </div>
      </div>

      <div className="pcard-footer">
        <span className="pcard-cta">View project</span>
        <svg className="pcard-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M1 6h9M6.5 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  )
}
