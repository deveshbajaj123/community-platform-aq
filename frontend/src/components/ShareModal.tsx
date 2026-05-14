import { useState } from 'react'
import { generateStory, downloadStory, type StoryData } from './StoryGenerator'

interface ShareModalProps {
  url: string
  storyData: StoryData
  onClose: () => void
}

const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export default function ShareModal({ url, storyData, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {
      const el = document.createElement('input'); el.value = url
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: storyData.type === 'post' ? (storyData.title || 'AquaTerra post') : (storyData.openingTitle || 'Open role'),
        url,
      })
    } catch { /* user cancelled */ }
  }

  const handleGenerateStory = async () => {
    setGenerating(true)
    try {
      const dataUrl = await generateStory(storyData)
      setPreview(dataUrl); setGenerated(true)
    } catch (e) {
      console.error('Story generation failed:', e)
    } finally { setGenerating(false) }
  }

  const handleDownload = () => {
    if (!preview) return
    const name = storyData.type === 'post'
      ? `aq-post-${(storyData.uuid || 'post').slice(0, 6)}.png`
      : `aq-${(storyData.teamName || 'team').toLowerCase().replace(/\s+/g, '-')}-opening.png`
    downloadStory(preview, name)
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 18px',
    borderBottom: '1px solid var(--line)',
    cursor: 'pointer', background: 'none', border: 'none',
    width: '100%', textAlign: 'left',
    transition: 'background 0.12s, transform 0.1s cubic-bezier(0.2, 0, 0, 1)',
  }

  return (
    <div
      onClick={e => { e.stopPropagation(); onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 12px 12px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: 'var(--card)',
          borderRadius: 20,
          border: '2px solid var(--ink)',
          overflow: 'hidden',
          animation: 'sheetUp 0.2s cubic-bezier(0.2,0,0,1)',
        }}
      >
        {/* Handle + header */}
        <div style={{ padding: '14px 18px 12px', borderBottom: '2px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 17 }}>share</div>
          <button
            onClick={e => { e.stopPropagation(); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 8, transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >✕</button>
        </div>

        {/* 1 — Native share (only on mobile / browsers that support it) */}
        {canNativeShare && (
          <button
            style={{ ...rowStyle, borderBottom: '1px solid var(--line)' }}
            onClick={handleNativeShare}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-2)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
            onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.96)')}
            onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
          >
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0, border: '1.5px solid var(--line)' }}>↗</span>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14 }}>Share</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>open in messages, whatsapp, more</div>
            </div>
          </button>
        )}

        {/* 2 — Copy link */}
        <button
          style={{ ...rowStyle }}
          onClick={handleCopy}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-2)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}
          onMouseDown={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.96)')}
          onMouseUp={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
        >
          <span style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: copied ? 'var(--mint)' : 'var(--bg-2)',
            display: 'grid', placeItems: 'center', fontSize: 18,
            border: `1.5px solid ${copied ? 'var(--mint)' : 'var(--line)'}`,
            transition: 'background 0.2s, border-color 0.2s',
            color: copied ? '#0A0A0A' : 'var(--ink)',
          }}>
            {copied ? '✓' : '🔗'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: copied ? 'var(--mint)' : 'var(--ink)' }}>
              {copied ? 'Link copied!' : 'Copy link'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {url.replace(/^https?:\/\//, '')}
            </div>
          </div>
        </button>

        {/* 3 — Instagram story card */}
        <div style={{ padding: '14px 18px 18px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-3)', marginBottom: 10 }}>
            ✦ story card
          </div>

          {!generated ? (
            <button
              onClick={handleGenerateStory}
              disabled={generating}
              style={{
                width: '100%', padding: '13px 0',
                borderRadius: 14, border: '2px dashed var(--mint)',
                background: 'rgba(0,229,160,0.06)',
                cursor: generating ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                transition: 'background 0.15s, transform 0.1s cubic-bezier(0.2, 0, 0, 1)',
              }}
              onMouseEnter={e => !generating && ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,160,0.11)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,160,0.06)')}
              onMouseDown={e => !generating && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)')}
              onMouseUp={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
            >
              {generating ? (
                <>
                  <div style={{ width: 26, height: 26, border: '2.5px solid var(--line-2)', borderTopColor: 'var(--mint)', borderRadius: '50%', animation: 'login-spin 0.8s linear infinite' }} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--mint)' }}>designing…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 26 }}>🎨</span>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, color: 'var(--mint)' }}>generate story card</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)' }}>1080×1920 · instagram ready</span>
                </>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {preview && (
                <div style={{ flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--line)', width: 80, aspectRatio: '9/16' }}>
                  <img src={preview} alt="Story preview" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14 }}>story ready ✓</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  1080×1920 PNG · instagram, whatsapp &amp; snapchat
                </div>
                <button className="btn btn-sm btn-primary" onClick={handleDownload} style={{ alignSelf: 'flex-start', transition: 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)' }} onMouseDown={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)')} onMouseUp={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}>
                  ↓ download PNG
                </button>
                <button
                  onClick={handleGenerateStory} disabled={generating}
                  style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                  regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
