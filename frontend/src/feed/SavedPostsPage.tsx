import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Post } from '../services/api'
import feedService from '../services/feedService'
import FeedPostCard from './FeedPostCard'

function getSavedUuids(): string[] {
  try {
    const uuids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('aq_bm_') && localStorage.getItem(key) === '1') {
        uuids.push(key.replace('aq_bm_', ''))
      }
    }
    return uuids
  } catch { return [] }
}

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [count] = useState(() => getSavedUuids().length)

  useEffect(() => {
    const uuids = getSavedUuids()
    if (uuids.length === 0) { setLoading(false); return }

    Promise.allSettled(uuids.map(uuid => feedService.getPost(uuid)))
      .then(results => {
        const loaded = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value?.success)
          .map(r => r.value.data.post as Post)
        // Sort newest first based on createdAt
        loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setPosts(loaded)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleUnsave = (uuid: string) => {
    setPosts(prev => prev.filter(p => p.uuid !== uuid))
    try { localStorage.removeItem(`aq_bm_${uuid}`) } catch {}
  }

  return (
    <div className="route-enter">
      {/* ── Hero ── */}
      <section style={{
        background: '#0A0A0A', color: '#fff',
        padding: 'clamp(32px,5vw,56px) var(--page-px,24px) clamp(24px,3vw,40px)',
        borderBottom: '2px solid var(--ink)', position: 'relative', overflow: 'hidden',
      }}>
        <div className="halftone" style={{ position: 'absolute', inset: 0, color: 'var(--lemon)', opacity: 0.1 }} />
        <div className="container" style={{ position: 'relative' }}>
          <span className="sticker sticker-lemon wobble" style={{ display: 'inline-flex', marginBottom: 16 }}>
            ★ SAVED
          </span>
          <h1 className="h-display" style={{
            fontSize: 'clamp(48px, 8vw, 84px)', margin: 0, lineHeight: 0.92, color: '#fff',
          }}>
            your <span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--lemon)' }}>bookmarks</span>.
          </h1>
          <p style={{ fontSize: 15, marginTop: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--mono)' }}>
            {count} post{count !== 1 ? 's' : ''} saved · stored on this device
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="aq-wrap" style={{ paddingTop: 'clamp(20px,4vw,28px)', paddingBottom: 100, maxWidth: 680 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} className="v6-skeleton" style={{ height: 260, borderRadius: 20, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'clamp(44px,8vw,80px) var(--page-px,24px)' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🔖</div>
            <div className="h-display" style={{ fontSize: 'clamp(28px,5vw,42px)', marginBottom: 10 }}>
              nothing saved yet.
            </div>
            <p style={{ color: 'var(--ink-3)', fontSize: 15, marginBottom: 28, fontFamily: 'var(--eina)' }}>
              tap the bookmark icon on any post to save it here.
            </p>
            <Link to="/feed" className="btn btn-primary">
              browse the feed →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {posts.map((post, i) => (
                <div key={post.uuid} style={{ position: 'relative' }}>
                  <FeedPostCard post={post} seed={i} />
                  {/* Unsave button — floats top-right inside the card */}
                  <button
                    onClick={() => handleUnsave(post.uuid)}
                    title="Remove bookmark"
                    style={{
                      position: 'absolute', top: 14, right: 14, zIndex: 10,
                      background: 'var(--card)', border: '1.5px solid var(--line-2)',
                      borderRadius: 999, padding: '5px 10px',
                      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                      color: 'var(--ink-3)', cursor: 'pointer',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e05c5c'; e.currentTarget.style.borderColor = '#e05c5c' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-3)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}
                  >
                    unsave
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32, padding: '16px 0', borderTop: '1px dashed var(--line-2)', textAlign: 'center' }}>
              <p className="mono xs muted" style={{ fontSize: 11 }}>
                bookmarks are saved on this device only — they won't sync across browsers.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
