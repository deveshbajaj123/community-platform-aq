import { motion, useReducedMotion } from 'framer-motion'
import { useIsMobile } from '../hooks/useMobile'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1483354483454-4cd359948304?w=600&auto=format&fit=crop&q=70',
]

interface ThreeDMarqueeProps {
  images?: string[]
  height?: string | number
}

export default function ThreeDMarquee({
  images,
  height = 'clamp(380px, 44vw, 560px)',
}: ThreeDMarqueeProps) {
  const shouldReduce = useReducedMotion()
  const isMobile = useIsMobile(768)

  const raw = (images && images.length >= 6 ? images : FALLBACK_IMAGES)
  const padded = raw.length < 12
    ? [...raw, ...raw, ...raw].slice(0, 12)
    : raw.slice(0, Math.min(raw.length, 24))

  // ── Mobile: simple static 2-column photo grid ─────────────────
  if (isMobile) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        borderRadius: 16,
        overflow: 'hidden',
        width: '100%',
      }}>
        {padded.slice(0, 4).map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Project ${i + 1}`}
            loading="lazy"
            draggable={false}
            style={{
              width: '100%',
              aspectRatio: '4/3',
              objectFit: 'cover',
              borderRadius: 10,
              display: 'block',
              border: '2px solid rgba(255,255,255,0.08)',
            }}
            onError={e => {
              const el = e.currentTarget
              el.style.display = 'none'
              const parent = el.parentElement
              if (parent) {
                parent.style.background = 'linear-gradient(135deg, #0A2540, #003D2B)'
                parent.style.aspectRatio = '4/3'
              }
            }}
          />
        ))}
      </div>
    )
  }

  const chunkSize = Math.ceil(padded.length / 3)
  const chunks = Array.from({ length: 3 }, (_, i) =>
    padded.slice(i * chunkSize, i * chunkSize + chunkSize)
  )

  return (
    <div style={{
      display: 'block',
      height,
      width: '100%',
      overflow: 'hidden',
      borderRadius: 16,
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          aspectRatio: '1',
          width: '45rem',
          height: '45rem',
          flexShrink: 0,
          transform: 'scale(1.3)',
          maxWidth: '100%',
        }}>
          <div style={{
            transform: 'rotateX(45deg) rotateY(0deg) rotateZ(45deg)',
            transformStyle: 'preserve-3d',
            transformOrigin: 'top left',
            position: 'relative',
            top: 0,
            right: '-55%',
            display: 'grid',
            width: '100%',
            height: '100%',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.1rem',
          }}>
            {chunks.map((col, colIdx) => {
              const colStyle: React.CSSProperties = {
                display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1.1rem',
              }
              return (
                <motion.div
                  key={colIdx}
                  animate={shouldReduce ? undefined : { y: colIdx % 2 === 0 ? 60 : -60 }}
                  transition={shouldReduce ? undefined : {
                    duration: colIdx % 2 === 0 ? 10 : 15,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                  }}
                  style={colStyle}
                >
                  {col.map((src, imgIdx) => (
                    <div
                      key={imgIdx}
                      style={{
                        position: 'relative',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Project ${imgIdx + 1}`}
                        draggable={false}
                        style={{
                          display: 'block',
                          width: '100%',
                          aspectRatio: '4/3',
                          objectFit: 'cover',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                        loading="lazy"
                        onError={e => {
                          const el = e.currentTarget
                          el.style.display = 'none'
                          const parent = el.parentElement
                          if (parent) {
                            parent.style.background = 'linear-gradient(135deg, #0A2540, #003D2B)'
                            parent.style.aspectRatio = '4/3'
                          }
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
