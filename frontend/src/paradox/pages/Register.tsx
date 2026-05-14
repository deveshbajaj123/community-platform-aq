// @ts-nocheck
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { fadeUp, stagger, scaleIn, slideLeft, SPRING, MotionLink } from '../lib/motion'
import { useToast } from '../components/ui/Toast'
import type { Event } from '../lib/types'

type TeamMember = { name: string; school: string }

type Form = {
  name: string
  email: string
  phone: string
  school: string
  class_year: string
  event_id: string
  team_name: string
  team_members: TeamMember[]
}

type Errors = Partial<Record<keyof Form, string>>
type Touched = Partial<Record<keyof Form, boolean>>

const EMAIL_RE = /^\S+@\S+\.\S+$/
const PHONE_RE = /^\+?[\d\s-]{7,}$/

function validate(form: Form): Errors {
  const e: Errors = {}
  if (!form.name.trim()) e.name = 'required'
  if (!form.email.trim()) e.email = 'required'
  else if (!EMAIL_RE.test(form.email)) e.email = 'invalid email'
  if (!form.phone.trim()) e.phone = 'required'
  else if (!PHONE_RE.test(form.phone)) e.phone = 'invalid phone'
  if (!form.school.trim()) e.school = 'required'
  if (!form.class_year.trim()) e.class_year = 'required'
  if (!form.event_id) e.event_id = 'pick an event'
  return e
}

/** Returns true if the event is at capacity (or over). */
async function checkCap(
  eventId: string,
  maxParticipants: number | null
): Promise<boolean> {
  if (!maxParticipants) return false
  const { count } = await supabase
    .from('paradox_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
  return (count ?? 0) >= maxParticipants
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

function Field({
  label, type = 'text', placeholder, value, error, touched, onChange, onBlur,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  error?: string
  touched?: boolean
  onChange: (v: string) => void
  onBlur: () => void
}) {
  const showErr = !!(touched && error)
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">{label}</label>
        <AnimatePresence initial={false}>
          {showErr && (
            <motion.span
              key="err"
              variants={slideLeft}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="font-mono text-[11px] text-[var(--c1)]"
            >
              ↘ {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        whileFocus={{ boxShadow: showErr ? '4px 4px 0 var(--c1)' : '4px 4px 0 var(--ink)' }}
        transition={SPRING}
        className={`rounded-xl border-[1.5px] border-ink bg-bg px-4 py-2.5 font-body w-full min-h-[44px] focus:ring-2 focus:outline-none text-[16px] text-ink transition-[border-color,box-shadow] ${
          showErr ? 'border-[var(--c1)] focus:ring-[var(--c1)]' : 'focus:ring-[var(--c1)]'
        }`}
      />
    </div>
  )
}

function SelectField({
  label, value, error, touched, onChange, onBlur, options, loading,
}: {
  label: string
  value: string
  error?: string
  touched?: boolean
  onChange: (v: string) => void
  onBlur: () => void
  options: { value: string; label: string }[]
  loading?: boolean
}) {
  const showErr = !!(touched && error)
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1.5">
        <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">{label}</label>
        <AnimatePresence initial={false}>
          {showErr && (
            <motion.span
              key="err"
              variants={slideLeft}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="font-mono text-[11px] text-[var(--c1)]"
            >
              ↘ {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {loading ? (
        <div className="w-full h-[44px] animate-pulse bg-ink/10 rounded-xl border-[1.5px] border-ink/20" />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`rounded-xl border-[1.5px] border-ink bg-bg px-4 py-2.5 font-body w-full min-h-[44px] focus:ring-2 focus:ring-[var(--c1)] focus:outline-none text-[16px] text-ink appearance-none cursor-pointer transition-[border-color,box-shadow] duration-150 ${
            showErr ? 'border-[var(--c1)]' : ''
          }`}
        >
          <option value="">— select an event —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  )
}

export function RegisterPage() {
  const [params] = useSearchParams()
  const eventSlugParam = params.get('event')
  const { success, error: toastError } = useToast()

  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [form, setForm] = useState<Form>({
    name: '', email: '', phone: '', school: '', class_year: '', event_id: '',
    team_name: '', team_members: [],
  })
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Touched>({})
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [regId, setRegId] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Cap enforcement state
  const [isFull, setIsFull] = useState(false)
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null)
  const [checkingCap, setCheckingCap] = useState(false)

  useEffect(() => {
    supabase
      .from('paradox_events')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        const list = (data ?? []) as Event[]
        setEvents(list)
        setLoadingEvents(false)
        if (eventSlugParam) {
          const match = list.find((e) => e.slug === eventSlugParam)
          if (match) setForm((f) => ({ ...f, event_id: match.id }))
        }
      })
  }, [eventSlugParam])

  // Re-check cap + init team_members whenever the selected event changes
  useEffect(() => {
    if (!form.event_id) {
      setIsFull(false)
      setSpotsLeft(null)
      return
    }
    const ev = events.find((e) => e.id === form.event_id)
    if (!ev) return

    // Auto-populate team_members array based on team_format
    const needed = ev.team_format === 'large_team' ? 7
      : ev.team_format === 'small_team' ? 3
      : ev.team_format === 'pair' ? 1
      : 0
    const hasSub = ev.has_sub ?? false
    const slots = needed + (hasSub ? 1 : 0)
    setForm((f) => ({
      ...f,
      team_members: Array.from({ length: slots }, (_, i) =>
        f.team_members[i] ?? { name: '', school: '' }
      ),
    }))

    setCheckingCap(true)
    supabase
      .from('paradox_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', form.event_id)
      .then(({ count }) => {
        const registered = count ?? 0
        if (ev.max_participants) {
          setIsFull(registered >= ev.max_participants)
          setSpotsLeft(Math.max(0, ev.max_participants - registered))
        } else {
          setIsFull(false)
          setSpotsLeft(null)
        }
        setCheckingCap(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.event_id, events])

  useEffect(() => {
    setErrors(validate(form))
  }, [form])

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function blur(key: keyof Form) {
    setTouched((t) => ({ ...t, [key]: true }))
  }

  async function submit() {
    const errs = validate(form)
    setErrors(errs)
    setTouched({
      name: true, email: true, phone: true, school: true, class_year: true, event_id: true,
    })
    if (Object.keys(errs).length > 0) return
    setSubmitting(true)
    try {
      const ev = events.find((e) => e.id === form.event_id)

      // Final cap check right before insert (race-condition guard)
      const full = await checkCap(form.event_id, ev?.max_participants ?? null)
      if (full) {
        setErrors({ event_id: 'This event is now full. Try another event.' })
        setTouched((t) => ({ ...t, event_id: true }))
        setIsFull(true)
        setSpotsLeft(0)
        setSubmitting(false)
        toastError('Event is full', 'Try registering for another event')
        return
      }

      const eventSlug = ev?.slug ?? 'X'
      const reg_id = `PAR-${eventSlug.toUpperCase().slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`
      const newToken = crypto.randomUUID()

      const filledMembers = form.team_members.filter((m) => m.name.trim())
      const { error } = await supabase.from('paradox_registrations').insert({
        reg_id,
        token: newToken,
        event_id: form.event_id,
        event_name: ev?.name,
        name: form.name,
        email: form.email,
        phone: form.phone,
        school: form.school,
        class_year: form.class_year,
        team_name: form.team_name.trim() || null,
        team_members: filledMembers.length > 0 ? filledMembers : null,
        member_count: 1 + filledMembers.length,
        paid: false,
        attended: false,
        notes: null,
      })
      if (error) {
        console.error(error)
        toastError('Registration failed', error.message)
        setSubmitting(false)
        return
      }
      setRegId(reg_id)
      setToken(newToken)
      success("You're registered!", `Your reg ID is ${reg_id}`)
      setStep('success')
    } catch (err) {
      console.error(err)
      toastError('Registration failed', err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    const firstName = form.name.split(' ')[0] || form.name
    const ev = events.find((e) => e.id === form.event_id)
    return (
      <div className="min-h-[100dvh] bg-bg text-ink" style={{ position: 'relative', zIndex: 1 }}>
        <div className="px-4 sm:px-8 py-7 sm:py-14 max-w-md mx-auto">
          <AnimatePresence>
            <motion.div
              key="success-check"
              variants={scaleIn}
              initial="hidden"
              animate="show"
              className="w-20 h-20 rounded-2xl bg-[var(--c2)] border-[1.5px] border-ink flex items-center justify-center mb-6 -rotate-6"
              style={{ boxShadow: '4px 4px 0 var(--ink)' }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M4 12 L10 18 L20 6" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </AnimatePresence>

          <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">/confirmed</motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display mt-1.5"
              style={{
                fontSize: 'clamp(34px, 6vw, 66px)',
                letterSpacing: '-0.02em',
                lineHeight: 0.95,
                textWrap: 'balance',
              }}
            >
              you&apos;re in,{' '}
              <span style={{ color: 'var(--c1)' }}>{firstName}.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="font-body text-[15px] mt-4 leading-relaxed"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              Our team will WhatsApp you on <strong>{form.phone}</strong> with payment instructions.
            </motion.p>

            {/* "you're in!" handwritten label above the reg ID card */}
            <motion.p
              variants={fadeUp}
              className="font-hand text-[22px] text-center mb-2"
              style={{ transform: 'rotate(-1deg)' }}
            >
              you&apos;re in! 🎉
            </motion.p>

            {/* Success ticket card — c2 bg, reg ID prominent */}
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border-[1.5px] border-ink p-6 bg-[var(--c2)] mt-0"
              style={{ boxShadow: '4px 4px 0 var(--ink)' }}
            >
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-1">Registration ID</div>
              <div
                className="font-display tabular-nums"
                style={{
                  fontSize: 'clamp(22px, 4vw, 32px)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {regId}
              </div>
              <div className="mt-3 border-t border-ink/20 pt-3">
                <div
                  className="font-display"
                  style={{
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                    textWrap: 'balance',
                  }}
                >
                  {ev?.name ?? 'Event'}
                </div>
                <div className="font-mono text-[12px] opacity-65 mt-1 tabular-nums">
                  {form.school}{ev?.date ? ` · ${ev.date}` : ''}{ev?.venue ? ` · ${ev.venue}` : ''}
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-5 flex flex-col gap-3">
              <MotionLink
                to={`/paradox/ticket/${token}`}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold bg-ink text-bg text-center flex items-center justify-center w-full"
                style={{ boxShadow: '4px 4px 0 var(--c1)' }}
              >
                View my ticket →
              </MotionLink>
              <MotionLink
                to="/paradox"
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold bg-transparent text-ink text-center flex items-center justify-center w-full transition-[background-color,color]"
              >
                Back to paradox →
              </MotionLink>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  const selectedEvent = events.find((e) => e.id === form.event_id)

  return (
    <div className="min-h-[100dvh] bg-bg text-ink" style={{ position: 'relative', zIndex: 1 }}>
      {/* Page header */}
      <div className="px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 pb-6 border-b-[1.5px] border-ink max-w-[1280px] mx-auto">
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">/register</div>
        <h1
          className="font-display mt-1"
          style={{
            fontSize: 'clamp(34px, 6vw, 66px)',
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
            textWrap: 'balance',
          }}
        >
          register.
        </h1>
      </div>

      <div className="px-4 sm:px-8 py-7 sm:py-14 pb-16 max-w-[540px] mx-auto">
        <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <Field
              label="Name"
              placeholder="your full name"
              value={form.name}
              error={errors.name}
              touched={touched.name}
              onChange={(v) => update('name', v)}
              onBlur={() => blur('name')}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Field
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              error={errors.email}
              touched={touched.email}
              onChange={(v) => update('email', v)}
              onBlur={() => blur('email')}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Field
              label="Phone (WhatsApp)"
              placeholder="+91 …"
              value={form.phone}
              error={errors.phone}
              touched={touched.phone}
              onChange={(v) => update('phone', v)}
              onBlur={() => blur('phone')}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Field
              label="School / College"
              placeholder="institution"
              value={form.school}
              error={errors.school}
              touched={touched.school}
              onChange={(v) => update('school', v)}
              onBlur={() => blur('school')}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <Field
              label="Class / Year"
              placeholder="e.g. Class 12 / 2nd year"
              value={form.class_year}
              error={errors.class_year}
              touched={touched.class_year}
              onChange={(v) => update('class_year', v)}
              onBlur={() => blur('class_year')}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <SelectField
              label="Event"
              value={form.event_id}
              error={errors.event_id}
              touched={touched.event_id}
              onChange={(v) => update('event_id', v)}
              onBlur={() => blur('event_id')}
              options={events.map((e) => ({ value: e.id, label: e.name }))}
              loading={loadingEvents}
            />

            {/* Spots left / FULL status beneath the select */}
            <AnimatePresence initial={false}>
              {form.event_id && !loadingEvents && (
                <motion.div
                  key={form.event_id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={SPRING}
                  className="-mt-2 mb-4 flex items-center gap-2"
                >
                  {checkingCap ? (
                    <span className="font-mono text-[10px] opacity-40 tracking-[0.1em] uppercase">checking…</span>
                  ) : isFull ? (
                    <span className="rounded-xl bg-[var(--c1)]/10 text-[var(--c1)] font-mono text-[11px] px-3 py-1.5 font-bold tracking-[0.08em] uppercase border border-[var(--c1)]/30">
                      FULL — try another event
                    </span>
                  ) : spotsLeft !== null ? (
                    <span className="font-mono text-[10px] opacity-70 tracking-[0.08em] tabular-nums">
                      {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
                      {selectedEvent?.name ? ` · ${selectedEvent.name}` : ''}
                    </span>
                  ) : selectedEvent?.name ? (
                    <span className="font-mono text-[10px] opacity-50 tracking-[0.08em]">
                      {selectedEvent.name} · no cap
                    </span>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Team member fields (conditional on team_format) ── */}
          <AnimatePresence initial={false}>
            {selectedEvent && selectedEvent.team_format && selectedEvent.team_format !== 'solo' && (
              <motion.div
                key={selectedEvent.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="border-t-[1.5px] border-dashed border-ink/30 pt-5 mt-2 mb-3">
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 mb-3">
                    Team details ·{' '}
                    {selectedEvent.team_format === 'pair' ? '2-player' :
                     selectedEvent.team_format === 'small_team' ? `${selectedEvent.min_team_size}–${selectedEvent.max_team_size ?? 4} players` :
                     `${selectedEvent.min_team_size}–${selectedEvent.max_team_size ?? 8} players`}
                    {selectedEvent.has_sub ? ' + optional sub' : ''}
                  </div>

                  {/* Optional team name */}
                  {(selectedEvent.team_format === 'small_team' || selectedEvent.team_format === 'large_team') && (
                    <div className="mb-3">
                      <label className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70 block mb-1.5">
                        Team Name (optional)
                      </label>
                      <input
                        type="text"
                        value={form.team_name}
                        onChange={(e) => setForm((f) => ({ ...f, team_name: e.target.value }))}
                        placeholder="e.g. Team Inferno"
                        className="rounded-xl border-[1.5px] border-ink bg-bg px-4 py-2.5 font-body w-full min-h-[44px] focus:ring-2 focus:ring-[var(--c1)] focus:outline-none text-[16px] text-ink transition-[border-color,box-shadow]"
                      />
                    </div>
                  )}

                  {/* Player slots */}
                  {form.team_members.map((member, idx) => {
                    const isLastSlot = idx === form.team_members.length - 1
                    const isSub = selectedEvent.has_sub && isLastSlot && form.team_members.length > (selectedEvent.min_team_size ?? 1)
                    const label = isSub ? 'Substitute (optional)' : `Player ${idx + 2}`
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -2 }}
                        transition={SPRING}
                        className="rounded-2xl bg-ink/5 border-[1.5px] border-ink/20 p-4 gap-2 space-y-2 mb-3"
                      >
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] opacity-70 flex items-center gap-2">
                          {label}
                          {isSub && <span className="text-[9px] opacity-40">· leave blank if no sub</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => {
                              const updated = [...form.team_members]
                              updated[idx] = { ...updated[idx], name: e.target.value }
                              setForm((f) => ({ ...f, team_members: updated }))
                            }}
                            placeholder="Full name"
                            className={`rounded-xl border-[1.5px] bg-bg px-4 py-2.5 min-h-[44px] font-body text-[15px] text-ink focus:ring-2 focus:ring-[var(--c1)] focus:outline-none transition-[border-color,box-shadow] ${isSub ? 'border-ink/40' : 'border-ink'}`}
                          />
                          <input
                            type="text"
                            value={member.school}
                            onChange={(e) => {
                              const updated = [...form.team_members]
                              updated[idx] = { ...updated[idx], school: e.target.value }
                              setForm((f) => ({ ...f, team_members: updated }))
                            }}
                            placeholder="School"
                            className={`rounded-xl border-[1.5px] bg-bg px-4 py-2.5 min-h-[44px] font-body text-[15px] text-ink focus:ring-2 focus:ring-[var(--c1)] focus:outline-none transition-[border-color,box-shadow] ${isSub ? 'border-ink/40' : 'border-ink'}`}
                          />
                        </div>
                      </motion.div>
                    )
                  })}

                  <p
                    className="font-mono text-[10px] opacity-45 mt-2"
                    style={{ textWrap: 'pretty' } as React.CSSProperties}
                  >
                    You are captain · all players must carry school ID on event day
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -1 }}
              transition={SPRING}
              disabled={submitting || isFull}
              onClick={submit}
              className="mt-3 w-full rounded-full border-[1.5px] border-ink px-5 py-3 min-h-[48px] font-body font-semibold bg-ink text-bg flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed transition-[transform,box-shadow,background-color,color]"
              style={{ boxShadow: submitting || isFull ? 'none' : '4px 4px 0 var(--c1)' }}
            >
              <span className="flex items-center gap-2">
                {submitting && <Spinner />}
                {submitting
                  ? 'Locking…'
                  : isFull
                  ? 'Event is full'
                  : 'Lock it in →'}
              </span>
              <span className="font-mono text-[10px] tracking-[0.1em] opacity-75">
                {isFull ? 'try another event' : 'instant confirm'}
              </span>
            </motion.button>
          </motion.div>
        </motion.div>

        <div className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-60 mt-4 text-center">
          we'll WhatsApp payment details · no payment today
        </div>
      </div>
    </div>
  )
}
