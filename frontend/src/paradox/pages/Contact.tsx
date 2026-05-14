// @ts-nocheck
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { scaleIn, fadeUp, stagger, SPRING } from '../lib/motion'
import { useToast } from '../components/ui/Toast'

type Form = { name: string; email: string; message: string; inquiry_type: string }
type Errors = Partial<Record<keyof Form, string>>

function validate(f: Form): Errors {
  const e: Errors = {}
  if (!f.name.trim()) e.name = 'name required'
  if (!f.email.trim()) e.email = 'email required'
  else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'looks off'
  if (!f.message.trim()) e.message = 'tell us something'
  return e
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

type ContactCard = {
  label: string
  value: string
  href: string | null
  hoverBg: string
  hoverText: string
  ccClass: 'cc-1' | 'cc-2' | 'cc-3' | 'cc-4'
}

const INFO_CARDS: ContactCard[] = [
  {
    label: 'Email',
    value: 'ngo.aquaterra@gmail.com',
    href: 'mailto:ngo.aquaterra@gmail.com',
    hoverBg: 'var(--c1)',
    hoverText: 'var(--bg)',
    ccClass: 'cc-1',
  },
  {
    label: 'Instagram',
    value: '@ngo.aquaterra',
    href: 'https://instagram.com/ngo.aquaterra',
    hoverBg: 'var(--c3)',
    hoverText: 'var(--ink)',
    ccClass: 'cc-3',
  },
  {
    label: 'Site',
    value: 'aquaterra.org.in',
    href: 'https://aquaterra.org.in',
    hoverBg: 'var(--ink)',
    hoverText: 'var(--bg)',
    ccClass: 'cc-4',
  },
]

function ContactCard({ card }: { card: ContactCard }) {
  const [hovered, setHovered] = useState(false)

  const cardStyle: React.CSSProperties = {
    padding: '20px 18px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '120px',
    // Interruptible transitions — explicit properties, never 'all'
    transition: 'transform 0.18s, background-color 0.18s, color 0.18s, box-shadow 0.18s',
    border: '1.5px solid var(--ink)',
    background: hovered ? card.hoverBg : 'var(--bg)',
    color: hovered ? card.hoverText : 'var(--ink)',
    transform: hovered ? 'translateY(-3px) scale(0.97)' : 'translateY(0) scale(1)',
    cursor: card.href ? 'pointer' : 'default',
    boxShadow: hovered ? '4px 4px 0 var(--ink)' : '3px 3px 0 var(--ink)',
  }

  const lblStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    opacity: 0.7,
  }

  // Boldonse at clamp(17px, 2.2vw, 21px) — heavy enough for branding, won't overflow
  const valStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(17px, 2.2vw, 21px)',
    lineHeight: 1.15,
    wordBreak: 'break-word',
  }

  const inner = (
    <>
      <div style={lblStyle}>{card.label}</div>
      <div style={valStyle}>{card.value}</div>
    </>
  )

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {card.href ? (
        <a
          href={card.href}
          target={card.href.startsWith('http') ? '_blank' : undefined}
          rel={card.href.startsWith('http') ? 'noreferrer' : undefined}
          style={{ color: 'inherit', textDecoration: 'none', display: 'contents' }}
        >
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  )
}

function Field({
  label,
  type = 'text',
  value,
  error,
  touched,
  onChange,
  onBlur,
}: {
  label: string
  type?: string
  value: string
  error?: string
  touched?: boolean
  onChange: (v: string) => void
  onBlur: () => void
}) {
  const showErr = touched && error
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">
          {label}
        </label>
        <AnimatePresence initial={false}>
          {showErr && (
            <motion.span
              key="err"
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="font-mono text-[11px]"
              style={{ color: 'var(--c1)' }}
            >
              ↘ {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`rounded-xl border-[1.5px] bg-bg px-4 py-3 w-full min-h-[48px] font-body focus:ring-2 focus:ring-[var(--c1)] focus:outline-none text-[16px] text-ink transition-[border-color,box-shadow] ${
          showErr ? 'border-[var(--c1)]' : 'border-ink'
        }`}
      />
    </div>
  )
}

export function ContactPage() {
  const { success, error: toastError } = useToast()
  const emptyForm: Form = { name: '', email: '', message: '', inquiry_type: 'event' }

  const [form, setForm] = useState<Form>(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({})
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [submitting, setSubmitting] = useState(false)

  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (touched[k]) setErrors(validate(next))
  }

  const submit = async () => {
    setTouched({ name: true, email: true, message: true })
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('paradox_contact_messages').insert({
        name: form.name,
        email: form.email,
        message: form.message,
        inquiry_type: form.inquiry_type,
      })
      if (error) throw error
      success('Message sent!', "We'll get back to you within 24 hours")
      setForm(emptyForm)
      setTouched({})
      setErrors({})
      setStep('success')
    } catch {
      const fallback = await supabase.from('paradox_inquiries').insert({
        company: '(contact form)',
        contact: form.name,
        email: form.email,
        phone: '—',
        tier: form.inquiry_type,
        message: form.message,
      })
      if (fallback.error) {
        toastError('Failed to send', 'Please try emailing us directly')
        setErrors({ message: 'Could not send. Email us at ngo.aquaterra@gmail.com instead.' })
      } else {
        success('Message sent!', "We'll get back to you within 24 hours")
        setForm(emptyForm)
        setTouched({})
        setErrors({})
        setStep('success')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-8"
        style={{ background: 'var(--bg)', position: 'relative', zIndex: 1 }}
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="show"
          className="max-w-md w-full text-center"
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            className="w-20 h-20 rounded-2xl border-[1.5px] border-ink flex items-center justify-center mx-auto mb-6 -rotate-6"
            style={{ background: 'var(--c2)', boxShadow: '4px 4px 0 var(--ink)' }}
          >
            <svg width="36" height="36" viewBox="0 0 40 40">
              <path
                d="M8 20 L17 29 L33 12"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">/sent</div>
          <div
            className="font-display mt-1.5"
            style={{
              fontSize: 'clamp(34px, 6vw, 66px)',
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              textWrap: 'balance',
            }}
          >
            got it.{' '}
            <span style={{ color: 'var(--c1)' }}>we&apos;ll reply.</span>
          </div>
          <p
            className="font-body text-[15px] opacity-75 mt-4 leading-relaxed"
            style={{ textWrap: 'pretty' } as React.CSSProperties}
          >
            Our team checks the inbox daily — expect a reply within 24h on most days.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: 'var(--bg)', color: 'var(--ink)', position: 'relative', zIndex: 1 }}
    >
      {/* ── Page header ── */}
      <section className="border-b-[1.5px] border-ink py-6 sm:py-14 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">/contact</div>
          <h1
            className="font-display mt-2"
            style={{
              fontSize: 'clamp(34px, 6vw, 66px)',
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              textWrap: 'balance',
            }}
          >
            let&apos;s talk.
          </h1>
          <p
            className="font-body mt-3 max-w-sm text-[15px]"
            style={{ opacity: 0.65, textWrap: 'pretty' } as React.CSSProperties}
          >
            questions, sponsorship, or just want to say hi.
          </p>
        </div>
      </section>

      {/* ── Contact cards ── */}
      <section className="py-6 sm:py-14 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            variants={stagger(0.07)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12"
          >
            {INFO_CARDS.map((card) => (
              <motion.div
                key={card.label}
                variants={fadeUp}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
              >
                <ContactCard card={card} />
              </motion.div>
            ))}
          </motion.div>

          {/* ── Contact form ── */}
          <div className="max-w-lg">
            <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-1">
              [ send a message ]
            </div>
            <h2
              className="font-display mb-6"
              style={{
                fontSize: 'clamp(22px, 3.5vw, 34px)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                textWrap: 'balance',
              }}
            >
              drop us a line.
            </h2>

            <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <Field
                  label="Name"
                  value={form.name}
                  error={errors.name}
                  touched={touched.name}
                  onChange={(v) => update('name', v)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, name: true }))
                    setErrors(validate(form))
                  }}
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  error={errors.email}
                  touched={touched.email}
                  onChange={(v) => update('email', v)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }))
                    setErrors(validate(form))
                  }}
                />
              </motion.div>

              <motion.div variants={fadeUp} className="mb-4">
                <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 block mb-1.5">
                  Inquiry type
                </label>
                <select
                  value={form.inquiry_type}
                  onChange={(e) => update('inquiry_type', e.target.value)}
                  className="rounded-xl border-[1.5px] border-ink bg-bg px-4 py-3 min-h-[48px] font-body w-full focus:ring-2 focus:ring-[var(--c1)] focus:outline-none text-[16px] text-ink appearance-none cursor-pointer transition-[border-color,box-shadow]"
                >
                  <option value="event">Event question</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="sponsor">Sponsorship</option>
                  <option value="press">Press / media</option>
                  <option value="other">Something else</option>
                </select>
              </motion.div>

              <motion.div variants={fadeUp} className="mb-6">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">
                    Message
                  </label>
                  <AnimatePresence initial={false}>
                    {touched.message && errors.message && (
                      <motion.span
                        key="msg-err"
                        initial={{ x: -8, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -8, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="font-mono text-[11px]"
                        style={{ color: 'var(--c1)' }}
                      >
                        ↘ {errors.message}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, message: true }))
                    setErrors(validate(form))
                  }}
                  rows={5}
                  placeholder="Tell us what's up…"
                  className={`rounded-xl border-[1.5px] px-4 py-3 font-body w-full min-h-[100px] focus:ring-2 focus:ring-[var(--c1)] focus:outline-none text-[16px] text-ink resize-none transition-[border-color,box-shadow] bg-bg ${
                    touched.message && errors.message ? 'border-[var(--c1)]' : 'border-ink'
                  }`}
                />
              </motion.div>

              <motion.div variants={fadeUp}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ y: -1, transition: SPRING }}
                  transition={SPRING}
                  onClick={submit}
                  disabled={submitting}
                  className="w-full rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,box-shadow,background-color,color]"
                  style={{
                    background: 'var(--ink)',
                    color: 'var(--bg)',
                    boxShadow: submitting ? 'none' : '4px 4px 0 var(--c1)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {submitting && <Spinner />}
                    {submitting ? 'Sending…' : 'Send →'}
                  </span>
                  <span className="font-mono text-[11px] opacity-75">we read every one</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CTA section ── */}
      <section className="border-t-[1.5px] border-ink py-6 sm:py-14 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-2">
              [ prefer email? ]
            </div>
            <p
              className="font-body text-[15px] opacity-70"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              Reach us directly at{' '}
              <a
                href="mailto:ngo.aquaterra@gmail.com"
                className="underline underline-offset-2 font-semibold transition-[color]"
                style={{ color: 'var(--ink)' }}
              >
                ngo.aquaterra@gmail.com
              </a>
            </p>
          </div>
          <motion.a
            href="mailto:ngo.aquaterra@gmail.com"
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold whitespace-nowrap flex items-center transition-[transform,box-shadow,background-color,color] w-full sm:w-auto justify-center sm:justify-start"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              boxShadow: '4px 4px 0 var(--c1)',
            }}
          >
            Email us →
          </motion.a>
        </div>
      </section>
    </div>
  )
}
