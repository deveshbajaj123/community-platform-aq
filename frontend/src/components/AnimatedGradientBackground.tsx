import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedGradientBackgroundProps {
  startingGap?: number
  breathing?: boolean
  gradientColors?: string[]
  gradientStops?: number[]
  animationSpeed?: number
  breathingRange?: number
  topOffset?: number
  containerStyle?: React.CSSProperties
  containerClassName?: string
}

export const AQ_GRADIENT_ABOUT = {
  gradientColors: ['#0A0A0A', '#0A1825', '#002D1F', '#00B87A', '#00E5A0', '#0A2540', '#050A10'],
  gradientStops:  [0,          25,        40,        52,        62,        75,        100],
}

export const AQ_GRADIENT_LOGIN = {
  gradientColors: ['#060606', '#0A0A0A', '#002518', '#00C580', '#00E5A0', '#0A1520', '#040404'],
  gradientStops:  [0,          28,        42,        54,        63,        78,        100],
}

export default function AnimatedGradientBackground({
  startingGap    = 120,
  breathing      = false,
  gradientColors = AQ_GRADIENT_ABOUT.gradientColors,
  gradientStops  = AQ_GRADIENT_ABOUT.gradientStops,
  animationSpeed = 0.012,
  breathingRange = 4,
  topOffset      = 0,
  containerStyle = {},
  containerClassName = '',
}: AnimatedGradientBackgroundProps) {

  if (gradientColors.length !== gradientStops.length) {
    throw new Error(
      `AnimatedGradientBackground: gradientColors (${gradientColors.length}) and gradientStops (${gradientStops.length}) must have the same length.`
    )
  }

  const shouldReduce = useReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Build the gradient string at a fixed width (no animation)
    const paintOnce = (w: number) => {
      const stops = gradientStops.map((stop, i) => `${gradientColors[i]} ${stop}%`).join(', ')
      if (containerRef.current) {
        containerRef.current.style.background =
          `radial-gradient(${w}% ${w + topOffset}% at 50% 0%, ${stops})`
      }
    }

    // Respect prefers-reduced-motion — paint once and stop
    if (shouldReduce) {
      paintOnce(startingGap)
      return
    }

    let raf: number
    let active = true
    let width = startingGap
    let dir   = 1

    const tick = () => {
      if (!active) return
      if (breathing) {
        if (width >= startingGap + breathingRange) dir = -1
        if (width <= startingGap - breathingRange) dir =  1
        width += dir * animationSpeed
      }
      paintOnce(width)
      raf = requestAnimationFrame(tick)
    }

    // Pause rAF when the tab is hidden — saves battery and GPU on mobile
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        active = false
      } else {
        active = true
        raf = requestAnimationFrame(tick)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [startingGap, breathing, gradientColors, gradientStops, animationSpeed, breathingRange, topOffset, shouldReduce])

  // Skip framer-motion entry animation when reduced-motion is preferred
  if (shouldReduce) {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }} className={containerClassName}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, ...containerStyle }} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}
      className={containerClassName}
    >
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, ...containerStyle }}
      />
    </motion.div>
  )
}
