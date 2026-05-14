import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabaseCommunity } from '../lib/supabaseCommunity'

interface Notification {
  type: string
  i: string
  t: string
  s: string
  fullNote?: string
  time: string
  ts: number
  link?: string
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60)    return 'just now'
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`
  return `${Math.floor(d / 604800)}wk ago`
}

export default function NotificationsPage() {
  const { member } = useAuth()
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  // Fix 2: track which notification indices have expanded rejection notes
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())
  // Fix 3: tick state to force re-render every 60s so relative timestamps stay fresh
  const [tick, setTick] = useState(0)

  // Fix 3: interval to refresh timestamps
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!member?.member_id) return
    const memberId = member.member_id

    const fetchNotifications = async () => {
      setLoading(true)
      setFetchError(false)

      const results: Notification[] = []
      let hadError = false

      // 1. Posts approved/rejected — individual try/catch
      try {
        const { data: myPosts } = await supabaseCommunity
          .from('posts')
          .select('uuid, body, status, reviewed_at, rejection_note')
          .eq('author_id', memberId)
          .in('status', ['published', 'rejected'])
          .not('reviewed_at', 'is', null)
          .order('reviewed_at', { ascending: false })
          .limit(20)

        for (const post of (myPosts || [])) {
          if (post.status === 'published') {
            results.push({
              type: 'approve',
              i: '✓',
              t: 'Your post was approved',
              s: `"${(post.body || '').slice(0, 60)}" is now live`,
              time: timeAgo(post.reviewed_at!),
              ts: new Date(post.reviewed_at!).getTime(),
              link: `/post/${post.uuid}`,
            })
          } else if (post.status === 'rejected') {
            const note = post.rejection_note || ''
            results.push({
              type: 'approve',
              i: '✗',
              t: 'Your post was not approved',
              s: note ? `Note: "${note.slice(0, 80)}"` : `"${(post.body || '').slice(0, 60)}"`,
              // store full note so we can expand it
              fullNote: note.length > 80 ? note : undefined,
              time: timeAgo(post.reviewed_at!),
              ts: new Date(post.reviewed_at!).getTime(),
              link: `/post/${post.uuid}`,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load approval notifications:', err)
        hadError = true
      }

      // 2. Tagged in a post — individual try/catch
      try {
        const { data: tags } = await supabaseCommunity
          .from('post_tags')
          .select(`
            created_at,
            post:posts!post_id(uuid, body, status, author:members!author_id(full_name))
          `)
          .eq('tagged_member_id', memberId)
          .order('created_at', { ascending: false })
          .limit(10)

        for (const tag of (tags || [])) {
          const post = (tag as any).post
          if (!post || post.status !== 'published') continue
          const authorName = post.author?.full_name || 'Someone'
          results.push({
            type: 'tag',
            i: '@',
            t: `${authorName} tagged you in a post`,
            s: `"${(post.body || '').slice(0, 60)}"`,
            time: timeAgo(tag.created_at),
            ts: new Date(tag.created_at).getTime(),
            link: `/post/${post.uuid}`,
          })
        }
      } catch (err) {
        console.error('Failed to load tag notifications:', err)
        hadError = true
      }

      // 3. Likes on your posts — individual try/catch
      try {
        const { data: myPostIds } = await supabaseCommunity
          .from('posts')
          .select('post_id, uuid, body')
          .eq('author_id', memberId)
          .eq('status', 'published')
          .limit(30)

        if (myPostIds && myPostIds.length > 0) {
          const postIdMap = Object.fromEntries(myPostIds.map(p => [p.post_id, p]))
          const { data: likes } = await supabaseCommunity
            .from('likes')
            .select(`
              created_at, post_id,
              liker:members!member_id(full_name)
            `)
            .in('post_id', myPostIds.map(p => p.post_id))
            .order('created_at', { ascending: false })
            .limit(15)

          for (const like of (likes || [])) {
            const post = postIdMap[like.post_id]
            const likerName = (like as any).liker?.full_name || 'Someone'
            if (!post) continue
            results.push({
              type: 'like',
              i: '♥',
              t: `${likerName} liked your post`,
              s: `"${(post.body || '').slice(0, 60)}"`,
              time: timeAgo(like.created_at),
              ts: new Date(like.created_at).getTime(),
              link: `/post/${post.uuid}`,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load like notifications:', err)
        hadError = true
      }

      if (hadError) setFetchError(true)

      // Sort all notifications by timestamp desc
      results.sort((a, b) => b.ts - a.ts)
      setNotifications(results)
      setLoading(false)
    }

    fetchNotifications()
  }, [member?.member_id])

  // Fix 2: toggle expanded state for a notification index
  const toggleNote = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  const FILTER_KEYS = [
    ['all','All'],
    ['like','♥ Likes'],
    ['approve','✓ Approved'],
    ['tag','@ Tags'],
  ]

  // Fix 3: recompute times on every tick so they stay fresh
  const filtered = useMemo(
    () => (filter === 'all' ? notifications : notifications.filter(x => x.type === filter))
      .map(n => ({ ...n, time: timeAgo(new Date(n.ts).toISOString()) })),
    [notifications, filter, tick] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div className="route-enter aq-wrap" style={{ paddingTop: 'clamp(28px, 4vw, 48px)', paddingBottom: 80 }}>
      <span className="sticker sticker-mint wobble">★ NOTIFICATIONS</span>
      <h1 className="h-display" style={{ fontSize: 'clamp(44px, 7vw, 72px)', margin: '12px 0 20px', lineHeight: 0.95 }}>
        what's new<span style={{ color: 'var(--pink)' }}>.</span>
      </h1>

      {/* Fix 1: error banner rendered when any fetch failed */}
      {fetchError && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: 'var(--r, 12px)',
          background: 'rgba(255,77,46,0.10)',
          border: '2px solid rgba(255,77,46,0.45)',
          color: 'var(--tomato, #FF4D2E)',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Some notifications couldn't be loaded. Pull to refresh.
        </div>
      )}

      <div className="row gap-2 flex-wrap" style={{ marginBottom: 20 }}>
        {FILTER_KEYS.map(([k, l]) => (
          <button key={k} className={'chip ' + (filter === k ? 'chip-active' : '')} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="v6-skeleton" style={{ height: 64, borderRadius: 0, marginBottom: 2, animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div className="mono xs muted">nothing here yet.</div>
            </div>
          ) : (
            filtered.map((n, i) => {
              const isExpanded = expandedNotes.has(i)
              const hasLongNote = Boolean(n.fullNote)
              return (
                <div
                  key={i}
                  className="notif-row"
                  style={{ borderBottom: i < filtered.length - 1 ? '2px solid var(--line)' : 'none', cursor: n.link ? 'pointer' : 'default' }}
                  onClick={() => n.link && (window.location.href = n.link)}
                >
                  <div className="notif-mark">{n.i}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{n.t}</div>
                    {/* Fix 2: expandable rejection note */}
                    {hasLongNote ? (
                      <div className="muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                        {isExpanded
                          ? `Note: "${n.fullNote}"`
                          : n.s
                        }
                        <button
                          className="mono xs"
                          onClick={(e) => toggleNote(i, e)}
                          style={{
                            color: 'var(--mint)',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                            marginLeft: 6,
                            padding: 0,
                          }}
                        >
                          {isExpanded ? 'show less ←' : 'read more →'}
                        </button>
                      </div>
                    ) : (
                      <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.s}</div>
                    )}
                  </div>
                  <div className="mono xs muted" style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }}>{n.time}</div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
