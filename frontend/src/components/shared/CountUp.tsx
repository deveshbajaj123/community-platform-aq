import { useState, useEffect, useRef } from 'react'

export default function CountUp({ to, suffix = '+', duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let started = false
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        started = true
        const t0 = performance.now()
        const step = (now: number) => {
          const p = Math.min((now - t0) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setN(Math.floor(ease * to))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.2 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [to, duration])
  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {n.toLocaleString('en-IN')}{suffix}
    </span>
  )
}
