import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──
interface AQNode {
  id: string
  label: string
  desc: string
  stat?: string
  category: string
  children?: string[]
}

interface LayoutNode { id: string; label: string; category: string; hasChildren: boolean; isCenter: boolean }
interface LayoutEdge { from: string; to: string }
interface Position { x: number; y: number }

// ── Data ──
const AQ_DATA: Record<string, AQNode> & { root: AQNode } = {
  root: { id: 'root', label: 'AquaTerra', desc: 'A student-led NGO from Kolkata — welfare work, cultural events, and technology, all under one roof.', stat: 'Since July 2021', category: 'root', children: ['welfare', 'events', 'labs', 'ops'] },
  welfare: { id: 'welfare', label: 'Projects & Welfare', desc: 'The core of what we do — drives, relief, and field operations that directly help animals and communities.', stat: '534+ welfare drives · 3 states', category: 'welfare', children: ['dogs', 'plantation', 'relief', 'medical'] },
  events: { id: 'events', label: 'Events & Culture', desc: 'Workshops, fundraisers, and cultural programs that build the community from within.', stat: '40+ events · 1,100+ attendees', category: 'events', children: ['workshops', 'fundraisers', 'reverie', 'awareness'] },
  labs: { id: 'labs', label: 'Startups & Labs', desc: 'Our experimental arm — incubating technology and media ventures inside the NGO.', stat: '3 active ventures', category: 'labs', children: ['aqtech', 'prism', 'research'] },
  ops: { id: 'ops', label: 'Core Departments', desc: 'The backbone — operations, content, finance, and HR keeping everything running.', stat: '10+ departments · 12 directors', category: 'ops', children: ['operations', 'content', 'finance', 'hr'] },
  dogs: { id: 'dogs', label: 'Dog Feeding Drives', desc: 'Weekly feeding circuits across South Kolkata. The drive that started it all — July 2021.', stat: '1,500+ dogs fed weekly', category: 'welfare', children: [] },
  plantation: { id: 'plantation', label: 'Plantation Drives', desc: 'Tree planting campaigns at schools, parks, and public spaces across Kolkata and beyond.', stat: '4,000+ saplings planted', category: 'welfare', children: [] },
  relief: { id: 'relief', label: 'Community Relief', desc: 'Food, clothing, and essentials distribution to underserved communities including Sundarbans relief.', stat: '3 states reached', category: 'welfare', children: [] },
  medical: { id: 'medical', label: 'Medical Checkups', desc: 'Free medical camps and checkup drives coordinated with healthcare partners.', stat: '1,600+ checkups organized', category: 'welfare', children: [] },
  workshops: { id: 'workshops', label: 'Workshops', desc: 'Skill-building and awareness workshops run by AQ members for schools and communities.', stat: '20+ workshops held', category: 'events', children: [] },
  fundraisers: { id: 'fundraisers', label: 'Fundraisers', desc: 'Creative fundraising events that support welfare drives while engaging the broader community.', category: 'events', children: [] },
  reverie: { id: 'reverie', label: 'Reverie', desc: "AQ's flagship cultural event — our largest gathering, bringing together 800+ attendees.", stat: '800+ attendees', category: 'events', children: [] },
  awareness: { id: 'awareness', label: 'Awareness Campaigns', desc: 'Social media, street, and school campaigns raising awareness on environmental and welfare issues.', category: 'events', children: [] },
  aqtech: { id: 'aqtech', label: 'AQ Tech', desc: 'Our in-house technology team — building tools for NGOs, internal platforms, and welfare-tech projects.', category: 'labs', children: [] },
  prism: { id: 'prism', label: 'Prism Media', desc: "AQ's media arm — documenting fieldwork, producing content, and building the narrative.", category: 'labs', children: [] },
  research: { id: 'research', label: 'Research Projects', desc: 'Data-driven welfare research, impact tracking, and environmental studies led by AQ Labs.', category: 'labs', children: [] },
  operations: { id: 'operations', label: 'Operations', desc: 'Logistics, member management, drive coordination — the engine room of AquaTerra.', category: 'ops', children: [] },
  content: { id: 'content', label: 'Content Team', desc: 'Writing, design, and social media — communicating the work to the world.', category: 'ops', children: [] },
  finance: { id: 'finance', label: 'Finance', desc: 'Budget management, fundraising allocation, and financial transparency for all drives.', category: 'ops', children: [] },
  hr: { id: 'hr', label: 'Human Resources', desc: 'Recruiting, onboarding, and managing 1,100+ members across 15+ partner schools.', stat: '1,100+ members', category: 'ops', children: [] },
} as any

const CAT_COLORS: Record<string, string> = { root: '#1b8a5a', welfare: '#3a7d5a', events: '#d4620a', labs: '#7c4dbc', ops: '#1a6b7a' }
const col = (cat: string) => CAT_COLORS[cat] || '#1b8a5a'

// ── Pre-compute layouts at module load (no per-render cost) ──
function runForce(
  nodes: LayoutNode[], edges: LayoutEdge[], centerId: string,
  w: number, h: number, nodeR: number, linkD: number
): Record<string, Position> {
  const cx = w / 2, cy = h / 2
  const pos: Record<string, Position> = {}
  const vel: Record<string, Position> = {}
  const count = nodes.length

  nodes.forEach((n, i) => {
    if (n.id === centerId) { pos[n.id] = { x: cx, y: cy } }
    else {
      // Evenly space children in a circle, offset by half a slot to avoid top collision
      const angle = ((i - 0.5) / Math.max(count - 1, 1)) * Math.PI * 2
      pos[n.id] = { x: cx + Math.cos(angle) * linkD * 0.85, y: cy + Math.sin(angle) * linkD * 0.85 }
    }
    vel[n.id] = { x: 0, y: 0 }
  })

  for (let iter = 0; iter < 150; iter++) {
    const f: Record<string, Position> = {}
    nodes.forEach(n => { f[n.id] = { x: 0, y: 0 } })

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = pos[b.id].x - pos[a.id].x, dy = pos[b.id].y - pos[a.id].y
        const d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2)
        const rep = 7000 / d2
        f[a.id].x -= (dx / d) * rep; f[a.id].y -= (dy / d) * rep
        f[b.id].x += (dx / d) * rep; f[b.id].y += (dy / d) * rep
      }
    }
    edges.forEach(e => {
      const dx = pos[e.to].x - pos[e.from].x, dy = pos[e.to].y - pos[e.from].y
      const d = Math.sqrt(dx * dx + dy * dy + 0.01)
      const force = (d - linkD) * 0.12
      f[e.from].x += (dx / d) * force; f[e.from].y += (dy / d) * force
      f[e.to].x -= (dx / d) * force; f[e.to].y -= (dy / d) * force
    })
    nodes.forEach(n => {
      f[n.id].x += (cx - pos[n.id].x) * (n.id === centerId ? 0.2 : 0.025)
      f[n.id].y += (cy - pos[n.id].y) * (n.id === centerId ? 0.2 : 0.025)
    })
    nodes.forEach(n => {
      vel[n.id].x = (vel[n.id].x + f[n.id].x) * 0.55
      vel[n.id].y = (vel[n.id].y + f[n.id].y) * 0.55
      pos[n.id].x += vel[n.id].x; pos[n.id].y += vel[n.id].y
    })
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = pos[b.id].x - pos[a.id].x, dy = pos[b.id].y - pos[a.id].y
        const d = Math.sqrt(dx * dx + dy * dy), min = nodeR * 2 + 18
        if (d < min) {
          const ov = min - d, ang = Math.atan2(dy, dx)
          pos[a.id].x -= Math.cos(ang) * ov * 0.5; pos[a.id].y -= Math.sin(ang) * ov * 0.5
          pos[b.id].x += Math.cos(ang) * ov * 0.5; pos[b.id].y += Math.sin(ang) * ov * 0.5
        }
      }
    }
    const mg = nodeR + 14
    nodes.forEach(n => {
      pos[n.id].x = Math.max(mg, Math.min(w - mg, pos[n.id].x))
      pos[n.id].y = Math.max(mg, Math.min(h - mg, pos[n.id].y))
    })
  }
  return pos
}

function buildLevel(centerId: string) {
  const center = AQ_DATA[centerId]
  if (!center) return { nodes: [] as LayoutNode[], edges: [] as LayoutEdge[] }
  const nodes: LayoutNode[] = [{ id: center.id, label: center.label, category: center.category, hasChildren: (center.children?.length ?? 0) > 0, isCenter: true }]
  const edges: LayoutEdge[] = []
  center.children?.forEach(cid => {
    const c = AQ_DATA[cid]
    if (c) { nodes.push({ id: c.id, label: c.label, category: c.category, hasChildren: (c.children?.length ?? 0) > 0, isCenter: false }); edges.push({ from: centerId, to: cid }) }
  })
  return { nodes, edges }
}

// Pre-bake layouts for all known nav levels at standard size
const BAKED_W = 640, BAKED_H = 460, BAKED_R = 46, BAKED_LINK = 170
const BAKED_LAYOUTS: Record<string, { nodes: LayoutNode[]; edges: LayoutEdge[]; pos: Record<string, Position> }> = {}
;['root', 'welfare', 'events', 'labs', 'ops'].forEach(id => {
  const { nodes, edges } = buildLevel(id)
  BAKED_LAYOUTS[id] = { nodes, edges, pos: runForce(nodes, edges, id, BAKED_W, BAKED_H, BAKED_R, BAKED_LINK) }
})

// Scale baked positions to actual container size
function scaledPos(baked: Record<string, Position>, sw: number, sh: number): Record<string, Position> {
  const sx = sw / BAKED_W, sy = sh / BAKED_H
  const result: Record<string, Position> = {}
  for (const id in baked) result[id] = { x: baked[id].x * sx, y: baked[id].y * sy }
  return result
}

// ── Detail Panel ──
function DetailPanel({ node, onClose, onDrill }: { node: AQNode; onClose: () => void; onDrill?: () => void }) {
  const c = col(node.category)

  return (
    <motion.div
      key={node.id}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 38, bounce: 0 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
        background: 'var(--bg-card)',
        boxShadow: '-2px 0 0 0 var(--line), -12px 0 32px rgba(0,0,0,0.1)',
        overflowY: 'auto', zIndex: 20,
        display: 'flex', flexDirection: 'column',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Colour header band */}
      <div style={{
        position: 'relative', padding: '28px 20px 22px',
        background: `linear-gradient(135deg, ${c}22 0%, ${c}08 100%)`,
        borderBottom: `1px solid ${c}20`, flexShrink: 0,
      }}>
        {/* Big ghost letter — decorative */}
        <div style={{
          position: 'absolute', right: 14, top: 8,
          fontFamily: 'var(--f-display)', fontWeight: 900,
          fontSize: 72, lineHeight: 1, letterSpacing: '-0.06em',
          color: c, opacity: 0.1, userSelect: 'none', pointerEvents: 'none',
        }}>{node.label.charAt(0)}</div>

        {/* Close — 40×40 hit area */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: '1px solid var(--line)', borderRadius: '50%',
          width: 40, height: 40, cursor: 'pointer', color: 'var(--txt-3)', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.1s, color 0.1s, border-color 0.1s',
          zIndex: 1,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--txt)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-3)' }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Close"
        >×</button>

        {/* Category pill */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', marginBottom: 12,
          background: `${c}20`, border: `1px solid ${c}40`,
          // Concentric: header padding=20px, panel outer uses no explicit r (overflow:hidden clips) → badge r=var(--r-xs)
          borderRadius: 'var(--r-xs)',
          fontFamily: 'var(--fm)', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: c,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />
          {node.category}
        </span>

        <h3 style={{
          fontFamily: 'var(--f-display)', fontWeight: 900,
          fontSize: 'clamp(17px,2vw,23px)', letterSpacing: '-0.04em',
          color: 'var(--txt)', lineHeight: 1.15,
          textWrap: 'balance' as any, margin: 0,
        }}>{node.label}</h3>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <p style={{
          fontFamily: 'var(--f-body)', fontSize: 13, lineHeight: 1.75,
          color: 'var(--txt-2)', margin: 0, textWrap: 'pretty' as any,
        }}>{node.desc}</p>

        {node.stat && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: `${c}0e`,
            // Concentric: body padding=20px, panel has no outer r visible here → inner r=var(--r-xs)
            borderRadius: 'var(--r-xs)',
            border: `1px solid ${c}25`,
          }}>
            <div style={{ width: 3, height: 28, background: c, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--fm)', fontSize: 11, color: c, letterSpacing: '0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.5 }}>
              {node.stat}
            </span>
          </div>
        )}

        {onDrill && (
          <button onClick={onDrill} style={{
            marginTop: 'auto', padding: '12px 16px', background: c, color: '#fff',
            border: 'none',
            // Concentric: body padding=20px, panel outer → inner r=var(--r-xs)
            borderRadius: 'var(--r-xs)',
            fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            WebkitFontSmoothing: 'antialiased',
            transition: 'opacity 0.1s, transform 0.1s',
            boxShadow: `0 2px 8px ${c}40`,
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.86')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Explore {node.label} →
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Canvas ──
function Canvas({
  nodes, edges, pos, onNodeClick, selectedId, nodeR, centerR, darkMode,
}: {
  nodes: LayoutNode[]; edges: LayoutEdge[]; pos: Record<string, Position>
  onNodeClick: (id: string) => void; selectedId: string | null
  nodeR: number; centerR: number; darkMode: boolean
}) {
  const [hov, setHov] = useState<string | null>(null)
  const [pressed, setPressed] = useState<string | null>(null)

  return (
    <svg style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {/* Static edges — no animated values, just CSS opacity transition */}
      {edges.map(e => {
        const from = pos[e.from], to = pos[e.to]
        if (!from || !to) return null
        const toNode = nodes.find(n => n.id === e.to)
        const c = col(toNode?.category || 'root')
        const lit = hov === e.from || hov === e.to || selectedId === e.to
        return (
          <line key={`${e.from}-${e.to}`}
            x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={c} strokeWidth={lit ? 2 : 1.5}
            strokeOpacity={lit ? 0.55 : 0.2}
            style={{ transition: 'stroke-opacity 0.12s, stroke-width 0.12s' }}
          />
        )
      })}

      {/* Nodes */}
      <AnimatePresence initial={false}>
        {nodes.map((node, i) => {
          const p = pos[node.id]
          if (!p) return null
          const c = col(node.category)
          const r = node.isCenter ? centerR : nodeR
          const isSel = selectedId === node.id
          const isHov = hov === node.id
          const isPrs = pressed === node.id
          // text box inscribed square: r*√2 ≈ r*1.41, minus 8px padding each side
          const ts = r * 1.38

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: isPrs ? 0.96 : isHov ? 1.05 : 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              // Snappy: no stagger, fast spring
              transition={{ type: 'spring', stiffness: 380, damping: 28, delay: i * 0.02, bounce: 0 }}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeClick(node.id)}
              onMouseEnter={() => setHov(node.id)}
              onMouseLeave={() => { setHov(null); setPressed(null) }}
              onMouseDown={() => setPressed(node.id)}
              onMouseUp={() => setPressed(null)}
              role="button" aria-label={node.label} tabIndex={0}
              onKeyDown={ke => ke.key === 'Enter' && onNodeClick(node.id)}
            >
              {/* Glow — CSS transition, not framer */}
              <circle cx={p.x} cy={p.y} r={r + 12} fill={c}
                style={{ opacity: isSel ? 0.25 : isHov ? 0.18 : node.isCenter ? 0.1 : 0, transition: 'opacity 0.1s' }} />

              {/* Pulsing ring on center */}
              {node.isCenter && (
                <motion.circle cx={p.x} cy={p.y} r={r + 8}
                  stroke={c} strokeWidth={1.5} strokeDasharray="5 5" fill="none"
                  animate={{ scale: [1, 1.07, 1], opacity: [0.4, 0.6, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Selection ring */}
              {isSel && !node.isCenter && (
                <motion.circle cx={p.x} cy={p.y} r={r + 5}
                  stroke={c} strokeWidth={2} fill="none"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 0.8, scale: 1 }}
                  transition={{ duration: 0.18 }}
                />
              )}

              {/* Main circle — CSS transitions for fill/stroke */}
              <circle cx={p.x} cy={p.y} r={r} fill={c} stroke={c}
                style={{
                  fillOpacity: isPrs ? 0.3 : isHov ? 0.2 : 0.12,
                  strokeWidth: isSel ? 2.5 : isHov ? 2 : 1.5,
                  strokeOpacity: isPrs ? 0.95 : isSel ? 1 : isHov ? 0.85 : 0.6,
                  transition: 'fill-opacity 0.1s, stroke-opacity 0.1s, stroke-width 0.1s',
                }}
              />

              {/* Label */}
              <foreignObject x={p.x - ts / 2} y={p.y - ts / 2} width={ts} height={ts} style={{ pointerEvents: 'none' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 5 }}>
                  <span style={{
                    fontFamily: 'var(--f-display)', color: 'var(--txt)',
                    fontSize: node.isCenter ? 13 : 11,
                    fontWeight: node.isCenter ? 800 : 600,
                    lineHeight: 1.2, letterSpacing: '-0.02em',
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                    WebkitFontSmoothing: 'antialiased',
                  }}>{node.label}</span>
                </div>
              </foreignObject>

              {/* Expand badge */}
              {node.hasChildren && !node.isCenter && (
                <>
                  <circle cx={p.x + r - 9} cy={p.y - r + 9} r={9} fill={c} />
                  <text x={p.x + r - 9} y={p.y - r + 9}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={darkMode ? '#0c0c0a' : '#fff'} fontSize={11} fontWeight={700}
                    style={{ pointerEvents: 'none', fontFamily: 'var(--f-display)' }}
                  >+</text>
                </>
              )}
            </motion.g>
          )
        })}
      </AnimatePresence>
    </svg>
  )
}

// ── Breadcrumbs ──
function Crumbs({ path, onNav }: { path: string[]; onNav: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--fm)', fontSize: 11, letterSpacing: '0.04em', flexWrap: 'wrap' }}>
      {path.map((id, i) => {
        const n = AQ_DATA[id]
        const isLast = i === path.length - 1
        return (
          <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button onClick={() => !isLast && onNav(id)} disabled={isLast} style={{
              background: 'none', border: 'none', padding: 0,
              cursor: isLast ? 'default' : 'pointer',
              color: isLast ? 'var(--txt)' : 'var(--txt-3)',
              fontWeight: isLast ? 700 : 400, fontFamily: 'inherit', fontSize: 'inherit',
              textTransform: 'uppercase', textDecoration: isLast ? 'none' : 'underline',
              transition: 'color 0.1s',
            }}>{n?.label || id}</button>
            {!isLast && <span style={{ color: 'var(--txt-4)' }}>/</span>}
          </span>
        )
      })}
    </div>
  )
}

// ── Legend ──
const LEGEND = [{ label: 'Welfare', cat: 'welfare' }, { label: 'Events', cat: 'events' }, { label: 'Labs', cat: 'labs' }, { label: 'Ops', cat: 'ops' }]
function Legend() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--fm)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {LEGEND.map(it => (
        <div key={it.cat} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--txt-3)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col(it.cat), display: 'inline-block' }} />
          {it.label}
        </div>
      ))}
    </div>
  )
}

// ── Main ──
export default function AQNodeExplorer({ darkMode = false }: { darkMode?: boolean }) {
  const [path, setPath] = useState(['root'])
  const [panel, setPanel] = useState<AQNode | null>(null)
  const [dims, setDims] = useState({ w: BAKED_W, h: BAKED_H })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const currentId = path[path.length - 1]

  // Use baked layout if available, otherwise compute on-the-fly (shouldn't happen in practice)
  const { nodes, edges, scaledPositions } = useMemo(() => {
    const graphW = panel ? dims.w - 300 : dims.w
    if (BAKED_LAYOUTS[currentId]) {
      const baked = BAKED_LAYOUTS[currentId]
      return { nodes: baked.nodes, edges: baked.edges, scaledPositions: scaledPos(baked.pos, graphW, dims.h) }
    }
    // Fallback: compute live for any unlisted level
    const { nodes: ns, edges: es } = buildLevel(currentId)
    const nodeR = dims.w < 500 ? 38 : 46
    const linkD = dims.w < 500 ? 130 : 165
    return { nodes: ns, edges: es, scaledPositions: runForce(ns, es, currentId, graphW, dims.h, nodeR, linkD) }
  }, [currentId, dims, panel])

  const nodeR = dims.w < 500 ? 38 : 46
  const centerR = dims.w < 500 ? 50 : 60

  const handleNodeClick = useCallback((id: string) => {
    const node = AQ_DATA[id]
    if (!node) return
    // Nodes with children: drill down immediately. Leaf nodes: open panel.
    if ((node.children?.length ?? 0) > 0 && id !== currentId) {
      setPath(prev => [...prev, id])
      setPanel(null)
    } else {
      // Toggle panel — clicking same node closes it
      setPanel(prev => prev?.id === id ? null : node)
    }
  }, [currentId])

  const drillDown = useCallback((id: string) => {
    setPath(prev => [...prev, id])
    setPanel(null)
  }, [])

  const goBack = useCallback(() => {
    setPath(prev => prev.length > 1 ? prev.slice(0, -1) : prev)
    setPanel(null)
  }, [])

  const navTo = useCallback((id: string) => {
    setPath(prev => {
      const idx = prev.indexOf(id)
      return idx !== -1 ? prev.slice(0, idx + 1) : prev
    })
    setPanel(null)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (panel) setPanel(null); else goBack() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [panel, goBack])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--bg-card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', overflow: 'hidden', display: 'flex' }}>
      {/* Dot grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: darkMode ? 0.04 : 0.07 }}>
        <defs><pattern id="aq-dots" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill={darkMode ? '#fff' : '#000'} /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#aq-dots)" />
      </svg>

      {/* Graph area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Top bar */}
        <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, zIndex: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AnimatePresence initial={false}>
              {path.length > 1 && (
                <motion.button
                  key="back"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  onClick={goBack}
                  style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 14px', color: 'var(--txt)', fontFamily: 'var(--f-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.1s', WebkitFontSmoothing: 'antialiased' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                  whileTap={{ scale: 0.96 }}
                >← Back</motion.button>
              )}
            </AnimatePresence>
            <Crumbs path={path} onNav={navTo} />
          </div>
          <Legend />
        </div>

        <Canvas
          nodes={nodes} edges={edges} pos={scaledPositions}
          onNodeClick={handleNodeClick} selectedId={panel?.id ?? null}
          nodeR={nodeR} centerR={centerR} darkMode={darkMode}
        />

        {/* Hint */}
        {path.length === 1 && !panel && (
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--fm)', fontSize: 10, color: 'var(--txt-4)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            Click dept nodes to drill in · leaf nodes show details
          </div>
        )}
      </div>

      {/* Panel */}
      <AnimatePresence initial={false}>
        {panel && (
          <DetailPanel
            key={panel.id}
            node={panel}
            onClose={() => setPanel(null)}
            onDrill={(panel.children?.length ?? 0) > 0 ? () => drillDown(panel.id) : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
