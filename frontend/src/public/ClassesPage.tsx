const CLASSES = [
  { name: 'Class of 2025', members: 89, color: '#FF4D8C', grad: "Spring '25" },
  { name: 'Class of 2026', members: 112, color: '#00E5A0', grad: "Spring '26" },
  { name: 'Class of 2027', members: 94, color: '#FFC700', grad: "Spring '27" },
  { name: 'Class of 2028', members: 67, color: '#7E5BFF', grad: "Spring '28" },
  { name: 'Class of 2029', members: 41, color: '#FF7A1A', grad: "Spring '29" },
  { name: "Alumni · '20–'24", members: 38, color: '#3DA9FC', grad: 'graduated' },
]

const totalMembers = CLASSES.reduce((s, c) => s + c.members, 0)

export default function ClassesPage() {
  return (
    <div className="route-enter container" style={{ padding: 'clamp(28px, 5vw, 48px) var(--page-px,24px) clamp(48px, 8vw, 80px)' }}>
      <span className="sticker sticker-pink wobble">★ {totalMembers} ACROSS 6 CLASSES</span>
      <h1 className="h-display" style={{ fontSize: 'clamp(60px, 9vw, 96px)', margin: '12px 0 32px', lineHeight: 0.9 }}>
        your<br/><span style={{ fontStyle: 'italic', fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--pink)' }}>cohort</span>.
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {CLASSES.map((c, i) => {
          const yearMatch = c.grad.match(/\d\d/)
          const shortYear = yearMatch ? yearMatch[0] : c.grad
          return (
            <div
              key={c.name}
              className="card card-hover"
              style={{ padding: 26, background: c.color, color: '#0A0A0A', cursor: 'pointer', transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
            >
              <div className="serif" style={{ fontSize: 80, lineHeight: 0.9, fontStyle: 'italic' }}>'{shortYear}</div>
              <div className="h-display" style={{ fontSize: 32, marginTop: 12 }}>{c.name}</div>
              <div className="mono xs upper" style={{ fontWeight: 700, marginTop: 6 }}>{c.members} members · {c.grad}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
