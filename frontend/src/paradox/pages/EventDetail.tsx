// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import type { Event, Score } from '../lib/types'
import { stagger, fadeUp, slideLeft, SPRING, MotionLink } from '../lib/motion'

/** Ensure fee always shows the ₹ symbol — guards against DB values without it. */
function fmtFee(fee: string | null | undefined): string | null {
  if (!fee) return null
  return fee.startsWith('₹') ? fee : `₹${fee}`
}

/** Human-readable format label.
 *  solo                        → "Solo"
 *  duo / pair                  → "Duo · 2 players"
 *  team / small_team / large_team with min==max → "Team · N players"
 *  team with min!=max          → "Team · A–B players" */
function fmtFormat(ev: any): { kind: 'solo' | 'duo' | 'team' | null; label: string; size: string | null } {
  if (!ev) return { kind: null, label: '', size: null }
  const f = ev.team_format
  if (f === 'solo') return { kind: 'solo', label: 'Solo', size: null }
  if (f === 'duo' || f === 'pair') return { kind: 'duo', label: 'Duo', size: '2 players' }
  if (f === 'team' || f === 'small_team' || f === 'large_team') {
    const mn = Number(ev.min_team_size) || null
    const mx = Number(ev.max_team_size) || null
    let size: string
    if (mn && mx && mn !== mx) size = `${mn}–${mx} players`
    else if (mx) size = `${mx} players`
    else if (mn) size = `${mn}+ players`
    else size = 'team'
    return { kind: 'team', label: 'Team', size }
  }
  // Legacy free-form team_size text — fall back to that
  return { kind: null, label: ev.team_size ?? '—', size: null }
}

// Hero bg cycles through c1/c2/c3 based on event index — we derive from slug hash
function heroColorFromSlug(slug: string): { bg: string; text: string; shadow: string } {
  const options = [
    { bg: 'bg-c1', text: 'text-bg',  shadow: '4px 4px 0 var(--ink)' },
    { bg: 'bg-c2', text: 'text-ink', shadow: '4px 4px 0 var(--ink)' },
    { bg: 'bg-c3', text: 'text-ink', shadow: '4px 4px 0 var(--ink)' },
  ] as const
  const idx = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % options.length
  return options[idx]
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    ;(async () => {
      const { data: ev } = await supabase
        .from('paradox_events')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single()
      const eventData = (ev as Event) ?? null
      setEvent(eventData)

      if (eventData?.id) {
        const { data: sc } = await supabase
          .from('paradox_scores')
          .select('*')
          .eq('event_id', eventData.id)
          .order('position', { ascending: true, nullsFirst: false })
        setScores((sc as Score[]) ?? [])
      } else {
        setScores([])
      }
      setLoading(false)
    })()
  }, [slug])

  /* ── Loading skeleton ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        className="bg-bg min-h-[100dvh] p-4 sm:p-5 space-y-3"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Back link skeleton */}
        <div className="animate-pulse rounded-2xl bg-ink/8 h-[44px] w-28" />
        {/* Hero skeleton */}
        <div className="animate-pulse rounded-2xl bg-ink/8 h-52" />
        {/* Stats band */}
        <div className="animate-pulse rounded-2xl bg-ink/8 h-28" />
        {/* Description */}
        <div className="animate-pulse rounded-2xl bg-ink/8 h-40" />
        {/* CTA */}
        <div className="animate-pulse rounded-2xl bg-ink/8 h-[52px]" />
      </div>
    )
  }

  /* ── 404 state ──────────────────────────────────────────────────────────── */
  if (!event) {
    return (
      <div
        className="bg-bg text-ink min-h-[100dvh] p-4 sm:p-8 flex flex-col gap-4 border-b-[1.5px] border-ink"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <span className="kicker">/404</span>
        <h1
          className="font-display text-ink leading-[0.92]"
          style={{
            fontSize: 'clamp(34px, 7vw, 66px)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          event not found.
        </h1>
        <p
          className="font-body text-ink/60 text-[15px]"
          style={{ textWrap: 'pretty' }}
        >
          This event doesn't exist or is no longer active.
        </p>
        <MotionLink
          to="/paradox/events"
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="btn-pill btn-pill-ghost self-start"
          style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
        >
          ← back to events
        </MotionLink>
      </div>
    )
  }

  const hero = heroColorFromSlug(slug ?? event.slug ?? 'default')

  /* ── Pill tag helper ────────────────────────────────────────────────────── */
  function PillTag({ label, value }: { label: string; value: string }) {
    return (
      <span
        className="inline-flex flex-col gap-0.5 rounded-full border-[1.5px] border-ink px-3.5"
        style={{ minHeight: '40px', paddingTop: '6px', paddingBottom: '6px' }}
      >
        <span className="font-mono text-[9px] tracking-[0.16em] uppercase opacity-60 leading-none">
          {label}
        </span>
        <span className="font-mono text-[12px] font-bold leading-tight tabular-nums">{value}</span>
      </span>
    )
  }

  return (
    <div
      className="bg-bg text-ink min-h-[100dvh]"
      style={{ position: 'relative', zIndex: 1 }}
    >

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className={[
          hero.bg,
          hero.text,
          'border-b-[1.5px] border-ink',
          'px-4 sm:px-8 pt-5 pb-6',
        ].join(' ')}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Back link — proper min touch target */}
        <MotionLink
          to="/paradox/events"
          whileTap={{ scale: 0.96 }}
          transition={SPRING}
          className="font-mono text-[11px] tracking-[0.1em] opacity-65 hover:opacity-100 inline-flex items-center mb-4"
          style={{
            minHeight: '44px',
            transitionProperty: 'opacity',
            transitionDuration: '150ms',
          }}
        >
          ← events
        </MotionLink>

        {/* Category kicker */}
        {event.category && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.08 }}
          >
            <span className="kicker">{event.category}</span>
          </motion.div>
        )}

        {/* Event name — massive font-display */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.14 }}
          className="font-display leading-[0.9] mt-2"
          style={{
            fontSize: 'clamp(34px, 8vw, 72px)',
            letterSpacing: '-0.025em',
            textWrap: 'balance',
          }}
        >
          {event.name}
        </motion.h1>

        {/* Info pill tags row — flex-wrap on mobile */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.22 }}
          className="flex flex-wrap gap-2 mt-5 items-start"
        >
          {(() => {
            const f = fmtFormat(event)
            if (!f.kind) return null
            return (
              <PillTag
                label="format"
                value={f.size ? `${f.label} · ${f.size}` : f.label}
              />
            )
          })()}
          {event.date   && <PillTag label="date"      value={event.date} />}
          {event.time   && <PillTag label="time"      value={event.time} />}
          {event.venue  && <PillTag label="venue"     value={event.venue} />}
          {event.fee    && <PillTag label="entry fee" value={fmtFee(event.fee)!} />}
          {event.prize  && <PillTag label="prize"     value={event.prize} />}
        </motion.div>
      </motion.header>

      {/* ── Quick-stats band ─────────────────────────────────────────────────── */}
      {(() => {
        const f = fmtFormat(event)
        const formatV = f.kind ? (f.size ? `${f.label} · ${f.size}` : f.label) : (event.team_size as string | null)
        const show = formatV || event.fee || event.date
        if (!show) return null
        return (
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-3 border-b-[1.5px] border-ink overflow-x-auto"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {[
            { l: 'format',    v: formatV,             accent: false },
            { l: 'entry fee', v: fmtFee(event.fee),   accent: true  },
            { l: 'date',      v: event.date,           accent: false },
          ]
            .filter((s) => s.v)
            .map((s, i, arr) => (
              <motion.div
                key={s.l}
                variants={fadeUp}
                className={[
                  'p-4 sm:p-5 min-w-[90px]',
                  s.accent ? 'bg-c2 text-ink' : 'bg-bg text-ink',
                  i < arr.length - 1 ? 'border-r-[1.5px] border-ink' : '',
                ].join(' ')}
              >
                <div className="kicker">{s.l}</div>
                <div
                  className="font-display leading-tight mt-1"
                  style={{ fontSize: 'clamp(18px, 4vw, 24px)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {s.v}
                </div>
              </motion.div>
            ))}
        </motion.div>
        )
      })()}

      {/* ── Description ──────────────────────────────────────────────────────── */}
      {event.description && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="bg-bg px-4 sm:px-8 py-6 border-b-[1.5px] border-ink"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span className="kicker">about the event</span>
          <h2
            className="font-display text-ink leading-tight mt-1"
            style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            about.
          </h2>
          <p
            className="font-body mt-3 text-[16px] sm:text-[17px] leading-[1.7] text-ink/80"
            style={{ textWrap: 'pretty' }}
          >
            {event.description}
          </p>
        </motion.section>
      )}

      {/* ── Rules ────────────────────────────────────────────────────────────── */}
      {event.rules && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="bg-c2 text-ink px-4 sm:px-8 py-6 border-b-[1.5px] border-ink"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span className="kicker">rules &amp; format</span>
          <h2
            className="font-display text-ink leading-tight mt-1"
            style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            the rules.
          </h2>
          <pre
            className="mt-3 whitespace-pre-wrap font-body text-[15px] sm:text-base leading-relaxed"
            style={{ textWrap: 'pretty' }}
          >
            {event.rules}
          </pre>
        </motion.section>
      )}

      {/* ── Prize strip ──────────────────────────────────────────────────────── */}
      {event.prize && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="bg-c1 text-bg px-4 sm:px-8 py-5 border-b-[1.5px] border-ink flex flex-wrap justify-between items-center gap-3"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span className="kicker text-bg/75">prize pool</span>
          <span
            className="font-display text-bg leading-tight text-right"
            style={{ fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
          >
            {event.prize}
          </span>
        </motion.section>
      )}

      {/* ── Scores / leaderboard ─────────────────────────────────────────────── */}
      {scores.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="bg-ink text-bg px-4 sm:px-8 py-6 border-b-[1.5px] border-ink"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <span className="kicker text-bg/55">[ results ]</span>
          <h2
            className="font-display text-bg leading-tight mt-1"
            style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            {scores[0].round || 'scores'}.
          </h2>
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-4 space-y-1"
          >
            {scores.map((s, i) => {
              const icon =
                s.position === 1
                  ? '🥇'
                  : s.position === 2
                  ? '🥈'
                  : s.position === 3
                  ? '🥉'
                  : `${s.position ?? i + 1}.`
              const isFirst = s.position === 1
              return (
                <motion.div
                  key={s.id}
                  variants={slideLeft}
                  className={[
                    'flex items-center gap-3',
                    isFirst
                      ? 'rounded-xl bg-c2 text-ink p-4'
                      : 'py-2 px-1 border-b border-bg/10',
                  ].join(' ')}
                >
                  <span className={`font-mono tabular-nums ${isFirst ? 'text-base' : 'text-sm'} w-8 shrink-0`}>
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-display leading-tight"
                      style={{
                        fontSize: isFirst ? '24px' : '20px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {s.team_name}
                    </div>
                    <div className="font-mono text-[10px] opacity-60 truncate">{s.school}</div>
                  </div>
                  {s.score && (
                    <span
                      className={[
                        'font-mono text-[13px] tabular-nums shrink-0',
                        isFirst ? 'text-ink font-bold' : 'text-c2',
                      ].join(' ')}
                    >
                      {s.score}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>
      )}

      {/* ── Register CTA ─────────────────────────────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-60px' }}
        className="bg-bg px-4 sm:px-8 py-8 border-b-[1.5px] border-ink flex flex-col items-start gap-4"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <span className="kicker">ready to compete?</span>
        <MotionLink
          to={`/paradox/register?event=${event.slug}`}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="btn-pill btn-pill-primary w-full sm:w-auto text-center"
          style={{ minHeight: '52px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Register for {event.name}
          <span className="font-mono text-[11px] opacity-75 ml-1">
            {event.fee ? `· ${fmtFee(event.fee)}` : '· free'}
          </span>
        </MotionLink>
      </motion.section>
    </div>
  )
}
