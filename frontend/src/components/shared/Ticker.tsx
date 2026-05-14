export default function Ticker({ items }: { items: string[] }) {
  const doubled = [...items, ...items]
  return (
    <div className="aq-ticker-wrap">
      <div className="aq-ticker-track">
        {doubled.map((item, i) => (
          <span key={i} className="aq-ticker-item">
            <span className="aq-ticker-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
