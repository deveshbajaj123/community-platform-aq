// @ts-nocheck
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Variants } from 'framer-motion'

/** Properly typed motion-Link — avoids Framer Motion 12 element-inference nesting <a> in <a> */
export const MotionLink = motion.create(Link)

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

export const stagger = (delay = 0.07): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
})

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 30 } },
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

export const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 180, damping: 22 } as const
