// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BrowserMultiFormatReader } from '@zxing/library'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Inquiry, Score, TeamMember, Update } from '../lib/types'
import { useToast } from '../components/ui/Toast'

type TabKey =
  | 'registrations'
  | 'updates'
  | 'inquiries'
  | 'checkin'
  | 'events'
  | 'scores'
  | 'volunteers'
  | 'winners'
  | 'blog'
  | 'team'
  | 'settings'
  | 'audit'
  | 'accounts'

const ALL_TABS: TabKey[] = [
  'registrations', 'updates', 'inquiries', 'checkin', 'events',
  'scores', 'volunteers', 'winners', 'blog', 'team',
  'settings', 'audit', 'accounts',
]

// Friendly labels for permission toggles
const TAB_LABELS: Record<TabKey, string> = {
  registrations: 'Registrations',
  updates: 'Updates',
  inquiries: 'Inquiries',
  checkin: 'Check-in',
  events: 'Events',
  scores: 'Scores',
  volunteers: 'Volunteers',
  winners: 'Winners',
  blog: 'Blog',
  team: 'Team',
  settings: 'Settings',
  audit: 'Audit Log',
  accounts: 'Accounts',
}

// Short codes for the dense permissions table in Accounts. Hover shows the
// full label via title attribute — but a meaningful 3-char code reads better
// than a generic 4-char prefix that strips meaning ("regi", "upda", "inqu").
const TAB_SHORT: Record<TabKey, string> = {
  registrations: 'REG',
  updates: 'UPD',
  inquiries: 'INQ',
  checkin: 'CHK',
  events: 'EVT',
  scores: 'SCR',
  volunteers: 'VOL',
  winners: 'WIN',
  blog: 'BLG',
  team: 'TEAM',
  settings: 'SET',
  audit: 'LOG',
  accounts: 'ACC',
}

// ─── Role presets ──────────────────────────────────────────────────────────
// One-click bundles of permissions for the "Set role" picker in the Accounts
// tab. The JSONB column remains the source of truth — these presets just give
// super admins a fast way to assign a coherent permission set without toggling
// every checkbox individually. They can still fine-tune after applying.
type RoleName = 'super_director' | 'director' | 'coordinator' | 'team_lead'

const ROLE_LABELS: Record<RoleName, string> = {
  super_director: 'Super Director',
  director: 'Director',
  coordinator: 'Coordinator',
  team_lead: 'Team Lead',
}

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  super_director: 'Full access — every tab including settings, audit, and team',
  director: 'Operational lead — everything except settings and audit',
  coordinator: 'Day-to-day ops — registrations, scores, updates, check-in',
  team_lead: 'Field volunteer — registrations and check-in only',
}

const ROLE_PRESETS: Record<RoleName, AdminPermissions> = {
  super_director: {
    registrations: true, updates: true, inquiries: true, checkin: true,
    events: true, scores: true, volunteers: true, winners: true, blog: true,
    team: true, settings: true, audit: true, accounts: false,
  },
  director: {
    registrations: true, updates: true, inquiries: true, checkin: true,
    events: true, scores: true, volunteers: true, winners: true, blog: true,
    team: true, settings: false, audit: false, accounts: false,
  },
  coordinator: {
    registrations: true, updates: true, inquiries: false, checkin: true,
    events: false, scores: true, volunteers: false, winners: true, blog: false,
    team: false, settings: false, audit: false, accounts: false,
  },
  team_lead: {
    registrations: true, updates: false, inquiries: false, checkin: true,
    events: false, scores: false, volunteers: false, winners: false, blog: false,
    team: false, settings: false, audit: false, accounts: false,
  },
}

type AdminPermissions = Record<TabKey, boolean>
type AdminUser = {
  id: string
  user_email: string
  display_name: string | null
  created_by: string | null
  permissions: AdminPermissions
  // Preset role label for the UI. The actual access is still governed by the
  // `permissions` JSONB; `role` is purely a hint so the picker can show what
  // bundle was last applied.
  role: RoleName
  is_active: boolean
  created_at: string
}
type AdminSession = {
  id: string
  user_email: string
  user_agent: string | null
  browser: string | null
  os: string | null
  created_at: string
  last_seen_at: string
  ended_at: string | null
  is_active: boolean
}

const SUPER_ADMIN = 'admin@gmail.com'

function parseUA(ua: string): { browser: string; os: string } {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Safari\//.test(ua) ? 'Safari' : 'Unknown'
  const os =
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Android/.test(ua) ? 'Android' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : 'Unknown'
  return { browser, os }
}

type RegRow = {
  id: string
  reg_id: string
  token: string
  event_id: string
  event_name: string
  name: string
  email: string
  phone: string
  school: string
  class_year: string | null
  paid: boolean
  attended: boolean
  notes: string | null
  created_at: string
  event_date: string | null
  event_time: string | null
  event_venue: string | null
}

type EventLite = { id: string; name: string }

type NewUpdate = {
  title: string
  body: string
  event_name: string
  tag: 'announcement' | 'score' | 'winner' | 'reminder' | 'venue_change'
  pinned: boolean
}

type NewScore = {
  event_id: string
  event_name: string
  team_name: string
  school: string
  score: string
  position: string
  round: string
}

type NewWinner = {
  event_id: string
  event_name: string
  rank: string
  winner_name: string
  school: string
  prize: string
  photo_url: string
  published: boolean
}

type NewBlogPost = {
  slug: string
  title: string
  excerpt: string
  body: string
  author: string
  tag: string
  cover_color: string
  published: boolean
}

type EventFull = {
  id: string
  name: string
  slug: string
  category: string
  active: boolean
  date: string | null
  time: string | null
  venue: string | null
  fee: number | null
  prize: string | null
  team_format: string | null
  min_team_size: number | null
  max_team_size: number | null
  max_participants: number | null
  description: string | null
  rules: string | null
  sort_order: number | null
}

const TAG_COLORS: Record<string, string> = {
  announcement: 'bg-bg text-ink',
  score: 'bg-c3 text-white',
  winner: 'bg-c1 text-white',
  reminder: 'bg-c2 text-ink',
  venue_change: 'bg-[#FF6B35] text-white',
}

const TAG_OPTIONS: NewUpdate['tag'][] = ['announcement', 'score', 'winner', 'reminder', 'venue_change']

const ROUND_OPTIONS = ['Prelims', 'Semifinals', 'Finals']

const VOLUNTEER_STATUSES = ['new', 'briefed', 'confirmed', 'attended', 'no_show']

const BLOG_TAGS = ['announcement', 'hype', 'behind', 'rules', 'impact']

const COVER_COLORS = ['ink', 'hot', 'acid', 'cool', 'acc']
const COVER_COLOR_STYLES: Record<string, string> = {
  ink:  'var(--ink)',
  hot:  'var(--c1)',
  acid: 'var(--c2)',
  cool: 'var(--c3)',
  acc:  'var(--bg)',
}

const tabAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

// ---- helpers ----
const ageBucket = (createdAt: string): 'fresh' | 'stale12' | 'stale24' => {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  if (hours >= 24) return 'stale24'
  if (hours >= 12) return 'stale12'
  return 'fresh'
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')

const timeAgo = (iso: string) => {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const TEMPLATES = (r: any, link: string) => ({
  ticket: `Hi ${r.name}! 🎉 Your spot at *${r.event_name}* is confirmed.\n\nHere's your entry ticket 👇\n${link}\n\n📅 ${r.event_date ?? 'Jun 3–7'} · 📍 ${r.event_venue ?? '60 Chowringhee'}\n\nShow this at the gate. See you at Paradox 2026!\n\n— Team AquaTerra`,
  upi: `Hi ${r.name}! 🙏 Thanks for registering for *${r.event_name}* at Paradox 2026.\n\nTo confirm your spot, please pay the entry fee to the UPI ID in the screenshot attached.\n\nDeadline: 48 hours.\n\nReply here once paid. — Team AquaTerra`,
  reminder: `Hey ${r.name}! 👋 *${r.event_name}* is tomorrow!\n\n📅 ${r.event_date ?? 'Jun 3–7'} · 📍 ${r.event_venue ?? '60 Chowringhee'} · 🕐 ${r.event_time ?? 'tbc'}\n🎟️ Bring your QR ticket: ${link}\n\nSee you there! 🔥 — Team Paradox 2026`,
  rejection: `Hi ${r.name}, we couldn't verify your payment for *${r.event_name}*.\n\nPlease pay the entry fee again and reply with the new transaction screenshot.\n\nNeed help? Just reply. — Team AquaTerra`,
})

export function AdminPage() {
  const { session, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const { success, error: toastError, warning, info } = useToast()

  const [activeTab, setActiveTab] = useState<TabKey>('registrations')
  const [ready, setReady] = useState(false)

  const [rows, setRows] = useState<RegRow[]>([])
  const [events, setEvents] = useState<EventLite[]>([])
  const [updates, setUpdates] = useState<Update[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [scores, setScores] = useState<Score[]>([])

  // New tab state
  const [volunteers, setVolunteers] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [blogPosts, setBlogPosts] = useState<any[]>([])
  const [siteSettings, setSiteSettings] = useState<any[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])

  // Registrations filters
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'attended'>('all')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [waMenu, setWaMenu] = useState<string | null>(null)

  // Updates state
  const [updateTagFilter, setUpdateTagFilter] = useState<string>('all')
  const [showNewUpdate, setShowNewUpdate] = useState(false)
  const [newUpdate, setNewUpdate] = useState<NewUpdate>({
    title: '',
    body: '',
    event_name: '',
    tag: 'announcement',
    pinned: false,
  })
  const [postingUpdate, setPostingUpdate] = useState(false)

  // Inquiries state
  const [inqNotes, setInqNotes] = useState<Record<string, string>>({})

  // Check-in state
  const [checkinSearch, setCheckinSearch] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Scores state
  const [scoreEventFilter, setScoreEventFilter] = useState<string>('all')
  const [showNewScore, setShowNewScore] = useState(false)
  const [newScore, setNewScore] = useState<NewScore>({
    event_id: '',
    event_name: '',
    team_name: '',
    school: '',
    score: '',
    position: '',
    round: 'Finals',
  })
  const [postingScore, setPostingScore] = useState(false)

  // Volunteers
  const [volStatusFilter, setVolStatusFilter] = useState<string>('all')

  // Winners
  const [showNewWinner, setShowNewWinner] = useState(false)
  const [winnerEventFilter, setWinnerEventFilter] = useState<string>('all')
  const [newWinner, setNewWinner] = useState<NewWinner>({
    event_id: '',
    event_name: '',
    rank: '1',
    winner_name: '',
    school: '',
    prize: '',
    photo_url: '',
    published: false,
  })
  const [postingWinner, setPostingWinner] = useState(false)

  // Blog
  const [showNewBlog, setShowNewBlog] = useState(false)
  const [blogTagFilter, setBlogTagFilter] = useState<string>('all')
  const [newBlog, setNewBlog] = useState<NewBlogPost>({
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    author: '',
    tag: 'announcement',
    cover_color: 'ink',
    published: false,
  })
  const [postingBlog, setPostingBlog] = useState(false)
  const [blogSlugError, setBlogSlugError] = useState<string | null>(null)

  // Events CRUD tab
  const [eventsFull, setEventsFull] = useState<EventFull[]>([])
  const [editingEvent, setEditingEvent] = useState<Partial<EventFull> | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [savingEvent, setSavingEvent] = useState(false)
  // Tracks which event is currently mid-toggle so we can disable the button
  // and prevent double-clicks from racing two updates against each other.
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null)

  // Settings — "add key" modal state (replaces the native prompt() flow)
  const [showAddSettingKey, setShowAddSettingKey] = useState(false)
  const [newSettingKey, setNewSettingKey] = useState('')

  // Team CRUD tab — backs the public /team page via paradox_team_members.
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Partial<TeamMember> | null>(null)
  const [savingTeam, setSavingTeam] = useState(false)
  // Locks up/down arrows on the row being moved to prevent rapid-click races.
  const [movingTeamId, setMovingTeamId] = useState<string | null>(null)

  // Audit
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all')
  const [auditResourceFilter, setAuditResourceFilter] = useState<string>('all')
  const [auditExpanded, setAuditExpanded] = useState<string | null>(null)

  // Accounts & sessions (super admin only)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([])
  const [authUsers, setAuthUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([])
  const [myPermissions, setMyPermissions] = useState<AdminPermissions | null>(null)
  const [myIsActive, setMyIsActive] = useState<boolean | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const isSuperAdmin = session?.user?.email === SUPER_ADMIN

  // New account form
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('')
  // Defaults mirror the 'coordinator' preset — the most common starting role.
  // The super admin can pick a different preset before clicking Create.
  const [newAccountPerms, setNewAccountPerms] = useState<AdminPermissions>(ROLE_PRESETS.coordinator)
  const [newAccountRole, setNewAccountRole] = useState<RoleName>('coordinator')
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Tabs visible to this user
  const visibleTabs: TabKey[] = useMemo(() => {
    if (isSuperAdmin) return ALL_TABS
    if (!myPermissions || myIsActive === false) return []
    return ALL_TABS.filter((t) => t !== 'accounts' && myPermissions[t])
  }, [isSuperAdmin, myPermissions, myIsActive])

  // When permissions load and the default tab isn't accessible, jump to the first visible tab
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0])
    }
  }, [visibleTabs]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session && !loading) navigate('/paradox/admin/login')
  }, [session, loading, navigate])

  useEffect(() => {
    if (!session) return
    Promise.all([
      supabase
        .from('paradox_registrations')
        .select('*, paradox_events ( date, time, venue )')
        .order('created_at', { ascending: false }),
      supabase.from('paradox_events').select('id, name').eq('active', true),
      supabase.from('paradox_events').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('name'),
      supabase
        .from('paradox_updates')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('paradox_inquiries').select('*').order('created_at', { ascending: false }),
      supabase
        .from('paradox_scores')
        .select('*')
        .order('event_name')
        .order('position', { ascending: true, nullsFirst: false }),
      supabase.from('paradox_volunteers').select('*').order('created_at', { ascending: false }),
      supabase
        .from('paradox_winners')
        .select('*, paradox_events(name)')
        .order('event_name')
        .order('rank'),
      supabase.from('paradox_blog_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('paradox_site_settings').select('*'),
      supabase.from('paradox_audit_log').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('paradox_admin_permissions').select('*').order('created_at'),
      supabase.from('paradox_admin_sessions').select('*').order('last_seen_at', { ascending: false }).limit(200),
      supabase.from('paradox_auth_users_view').select('*').order('created_at'),
      supabase.from('paradox_team_members').select('*').order('kind').order('sort_order'),
    ]).then(
      ([
        { data: regs },
        { data: evs },
        { data: evsFull },
        { data: ups },
        { data: inqs },
        { data: scs },
        { data: vols },
        { data: wins },
        { data: blogs },
        { data: setts },
        { data: audits },
        { data: permsAll },
        { data: sessAll },
        { data: authUsersData },
        { data: teamData },
      ]) => {
        const flat: RegRow[] = (regs ?? []).map((r: any) => ({
          ...r,
          event_date: r.paradox_events?.date ?? null,
          event_time: r.paradox_events?.time ?? null,
          event_venue: r.paradox_events?.venue ?? null,
        }))
        setRows(flat)
        setEvents((evs ?? []) as EventLite[])
        setEventsFull((evsFull ?? []) as any[])
        setUpdates((ups ?? []) as Update[])
        setInquiries((inqs ?? []) as Inquiry[])
        setScores((scs ?? []) as Score[])
        setVolunteers((vols ?? []) as any[])
        setWinners((wins ?? []) as any[])
        setBlogPosts((blogs ?? []) as any[])
        setSiteSettings((setts ?? []) as any[])
        setAuditLog((audits ?? []) as any[])
        setAdminUsers((permsAll ?? []) as AdminUser[])
        setAdminSessions((sessAll ?? []) as AdminSession[])
        setAuthUsers((authUsersData ?? []) as any[])
        setTeamMembers((teamData ?? []) as TeamMember[])

        // Set this user's permissions
        const myPerms = (permsAll ?? []).find((p: any) => p.user_email === session?.user?.email)
        if (myPerms) {
          setMyPermissions(myPerms.permissions as AdminPermissions)
          setMyIsActive(myPerms.is_active)
        }

        // Register session in paradox_admin_sessions
        const { browser, os } = parseUA(navigator.userAgent)
        supabase.from('paradox_admin_sessions').insert({
          user_id: session?.user?.id ?? null,
          user_email: session?.user?.email ?? '',
          user_agent: navigator.userAgent.slice(0, 200),
          browser,
          os,
        }).select('id').single().then(({ data: sd }) => {
          if (sd?.id) setCurrentSessionId(sd.id)
        })

        // Log session start in audit
        supabase.from('paradox_audit_log').insert({
          actor_email: session?.user?.email ?? null,
          action: 'session_start',
          resource: 'admin',
          resource_id: session?.user?.id ?? null,
          details: { browser, os },
        }).then(() => {})

        // hydrate inline editors
        const nMap: Record<string, string> = {}
        flat.forEach((r) => { nMap[r.reg_id] = r.notes ?? '' })
        setNotes(nMap)
        const iMap: Record<string, string> = {}
        ;(inqs ?? []).forEach((i: any) => {
          iMap[i.id] = i.notes ?? ''
        })
        setInqNotes(iMap)

        setReady(true)
      },
    )
  }, [session])

  // Heartbeat: update last_seen_at every 90s while admin is open
  useEffect(() => {
    if (!currentSessionId) return
    const id = setInterval(() => {
      supabase.from('paradox_admin_sessions')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', currentSessionId)
        .then(() => {})
    }, 90_000)
    return () => clearInterval(id)
  }, [currentSessionId])

  // Mark session ended on tab close / signout
  useEffect(() => {
    if (!currentSessionId) return
    const end = () => {
      supabase.from('paradox_admin_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', currentSessionId)
        .then(() => {})
    }
    window.addEventListener('beforeunload', end)
    return () => window.removeEventListener('beforeunload', end)
  }, [currentSessionId])

  // Realtime: live updates to sessions and permissions
  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('admin-realtime')
      // Sessions: any row insert/update/delete → refresh live
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'paradox_admin_sessions',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAdminSessions((prev) => [payload.new as AdminSession, ...prev].slice(0, 200))
        } else if (payload.eventType === 'UPDATE') {
          setAdminSessions((prev) => prev.map((s) => s.id === (payload.new as AdminSession).id ? payload.new as AdminSession : s))
        } else if (payload.eventType === 'DELETE') {
          setAdminSessions((prev) => prev.filter((s) => s.id !== payload.old.id))
        }
      })
      // Permissions: any row insert/update → reflect immediately
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'paradox_admin_permissions',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAdminUsers((prev) => [...prev, payload.new as AdminUser])
        } else if (payload.eventType === 'UPDATE') {
          setAdminUsers((prev) => prev.map((u) => u.id === (payload.new as AdminUser).id ? payload.new as AdminUser : u))
          // Also update own permissions if this is the current user
          if ((payload.new as AdminUser).user_email === session.user?.email) {
            setMyPermissions((payload.new as AdminUser).permissions)
            setMyIsActive((payload.new as AdminUser).is_active)
          }
        } else if (payload.eventType === 'DELETE') {
          setAdminUsers((prev) => prev.filter((u) => u.id !== payload.old.id))
        }
      })
      // Audit log: new entries appear live
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'paradox_audit_log',
      }, (payload) => {
        setAuditLog((prev) => [payload.new, ...prev].slice(0, 200))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  // Click-outside for WA menu
  useEffect(() => {
    if (!waMenu) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-wa-menu]')) setWaMenu(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [waMenu])

  // ---- audit logging ----
  const logAudit = async (action: string, resource: string, resource_id: string, details?: any) => {
    const entry = {
      actor_email: session?.user?.email ?? null,
      action,
      resource,
      resource_id,
      details: details ?? null,
    }
    const { data } = await supabase
      .from('paradox_audit_log')
      .insert(entry)
      .select('*')
      .single()
    if (data) setAuditLog((l) => [data, ...l].slice(0, 100))
  }

  // ---- derived ----
  const stats = useMemo(() => {
    const total = rows.length
    const paid = rows.filter((r) => r.paid).length
    const attended = rows.filter((r) => r.attended).length
    const unpaid = rows.filter((r) => !r.paid).length
    return { total, paid, attended, unpaid }
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (eventFilter !== 'all' && r.event_id !== eventFilter) return false
      if (statusFilter === 'paid' && !r.paid) return false
      if (statusFilter === 'unpaid' && r.paid) return false
      if (statusFilter === 'attended' && !r.attended) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !r.name.toLowerCase().includes(q) &&
          !r.school.toLowerCase().includes(q) &&
          !r.phone.toLowerCase().includes(q) &&
          !r.email.toLowerCase().includes(q) &&
          !r.reg_id.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [rows, search, eventFilter, statusFilter])

  const filteredUpdates = useMemo(() => {
    return updateTagFilter === 'all' ? updates : updates.filter((u) => u.tag === updateTagFilter)
  }, [updates, updateTagFilter])

  const filteredScores = useMemo(() => {
    return scoreEventFilter === 'all' ? scores : scores.filter((s) => s.event_id === scoreEventFilter)
  }, [scores, scoreEventFilter])

  const filteredVolunteers = useMemo(() => {
    return volStatusFilter === 'all'
      ? volunteers
      : volunteers.filter((v) => v.status === volStatusFilter)
  }, [volunteers, volStatusFilter])

  const filteredWinners = useMemo(() => {
    return winnerEventFilter === 'all'
      ? winners
      : winners.filter((w) => w.event_id === winnerEventFilter)
  }, [winners, winnerEventFilter])

  const filteredBlogPosts = useMemo(() => {
    return blogTagFilter === 'all' ? blogPosts : blogPosts.filter((b) => b.tag === blogTagFilter)
  }, [blogPosts, blogTagFilter])

  const filteredAudit = useMemo(() => {
    return auditLog.filter((a) => {
      if (auditActionFilter !== 'all' && a.action !== auditActionFilter) return false
      if (auditResourceFilter !== 'all' && a.resource !== auditResourceFilter) return false
      return true
    })
  }, [auditLog, auditActionFilter, auditResourceFilter])

  const auditActions = useMemo(() => Array.from(new Set(auditLog.map((a) => a.action))), [auditLog])
  const auditResources = useMemo(() => Array.from(new Set(auditLog.map((a) => a.resource).filter(Boolean))), [auditLog])

  const checkinResults = useMemo(() => {
    if (checkinSearch.trim().length < 3) return []
    const q = checkinSearch.toLowerCase()
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.reg_id.toLowerCase().includes(q),
    )
  }, [rows, checkinSearch])

  // ---- actions: registrations ----
  const markPaid = async (reg_id: string) => {
    if (!confirm('Mark this registration as paid?')) return
    const { error: err } = await supabase.from('paradox_registrations').update({ paid: true }).eq('reg_id', reg_id)
    if (err) { toastError('Update failed', err.message); return }
    setRows((rs) => rs.map((r) => (r.reg_id === reg_id ? { ...r, paid: true } : r)))
    success('Marked as paid')
    logAudit('mark_paid', 'registration', reg_id)
  }
  const markAttended = async (reg_id: string) => {
    const r = rows.find((x) => x.reg_id === reg_id)
    if (!r?.paid) {
      warning('Cannot check in', 'Mark registration as paid first')
      return
    }
    const { error: err } = await supabase.from('paradox_registrations').update({ attended: true }).eq('reg_id', reg_id)
    if (err) { toastError('Check-in failed', err.message); return }
    setRows((rs) => rs.map((r) => (r.reg_id === reg_id ? { ...r, attended: true } : r)))
    success('Checked in!', r.name)
    logAudit('mark_attended', 'registration', reg_id)
  }
  const saveNotes = async (reg_id: string, n: string) => {
    await supabase.from('paradox_registrations').update({ notes: n }).eq('reg_id', reg_id)
    setRows((rs) => rs.map((r) => (r.reg_id === reg_id ? { ...r, notes: n } : r)))
    logAudit('edit_notes', 'registration', reg_id, { notes: n.slice(0, 80) })
  }

  const exportCSV = () => {
    const headers = ['#', 'Reg ID', 'Name', 'School', 'Class', 'Phone', 'Email', 'Event', 'Paid', 'Attended', 'Notes']
    const csv = [
      headers.join(','),
      ...filtered.map((r, i) =>
        [
          i + 1,
          r.reg_id,
          `"${r.name}"`,
          `"${r.school}"`,
          r.class_year ?? '',
          r.phone,
          r.email,
          `"${r.event_name}"`,
          r.paid,
          r.attended,
          `"${(r.notes ?? '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `paradox-registrations-${Date.now()}.csv`
    a.click()
    logAudit('export_csv', 'registration', 'bulk', { rows: filtered.length, filters: { eventFilter, statusFilter } })
  }

  // ---- actions: updates ----
  const postUpdate = async () => {
    if (!newUpdate.title.trim() || !newUpdate.body.trim()) {
      warning('Missing fields', 'Title and body are required')
      return
    }
    setPostingUpdate(true)
    const { data, error: err } = await supabase
      .from('paradox_updates')
      .insert({ ...newUpdate, event_name: newUpdate.event_name || null })
      .select('id')
      .single()
    if (err) { toastError('Post failed', err.message); setPostingUpdate(false); return }
    if (data) {
      setUpdates((u) => [
        {
          id: data.id,
          ...newUpdate,
          event_name: newUpdate.event_name || null,
          created_at: new Date().toISOString(),
        } as any,
        ...u,
      ])
      success('Update posted', newUpdate.title)
      logAudit('post_update', 'update', data.id, { title: newUpdate.title })
      setNewUpdate({ title: '', body: '', event_name: '', tag: 'announcement', pinned: false })
      setShowNewUpdate(false)
    }
    setPostingUpdate(false)
  }
  const deleteUpdate = async (id: string) => {
    if (!confirm('Delete this update?')) return
    const { error: err } = await supabase.from('paradox_updates').delete().eq('id', id)
    if (err) { toastError('Delete failed', err.message); return }
    setUpdates((u) => u.filter((x) => x.id !== id))
    success('Update deleted')
    logAudit('delete_update', 'update', id)
  }
  const pinUpdate = async (id: string, pinned: boolean) => {
    const { error: err } = await supabase.from('paradox_updates').update({ pinned }).eq('id', id)
    if (err) { toastError('Update failed', err.message); return }
    setUpdates((u) => u.map((x) => (x.id === id ? { ...x, pinned } : x)))
    logAudit(pinned ? 'pin_update' : 'unpin_update', 'update', id)
  }

  // ---- actions: inquiries ----
  const updateInquiry = async (id: string, patch: Partial<Inquiry>) => {
    await supabase.from('paradox_inquiries').update(patch).eq('id', id)
    setInquiries((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    logAudit('update_inquiry', 'inquiry', id, patch)
  }

  // ---- actions: scores ----
  const postScore = async () => {
    if (!newScore.event_id || !newScore.team_name || !newScore.school) {
      warning('Missing fields', 'Event, team name, and school are all required')
      return
    }
    setPostingScore(true)
    const payload = {
      event_id: newScore.event_id,
      event_name: newScore.event_name,
      team_name: newScore.team_name,
      school: newScore.school,
      score: newScore.score || null,
      position: newScore.position ? parseInt(newScore.position) : null,
      round: newScore.round,
      notes: null,
    }
    const { data, error: err } = await supabase.from('paradox_scores').insert(payload).select('id').single()
    if (err) { toastError('Save failed', err.message); setPostingScore(false); return }
    if (data) {
      setScores((s) => [
        ...s,
        { id: data.id, ...payload, created_at: new Date().toISOString() } as any,
      ])
      success('Score saved', newScore.team_name)
      logAudit('post_score', 'score', data.id, { team: newScore.team_name })
      setNewScore({
        event_id: '',
        event_name: '',
        team_name: '',
        school: '',
        score: '',
        position: '',
        round: 'Finals',
      })
      setShowNewScore(false)
    }
    setPostingScore(false)
  }
  const deleteScore = async (id: string) => {
    if (!confirm('Delete this score entry?')) return
    const { error: err } = await supabase.from('paradox_scores').delete().eq('id', id)
    if (err) { toastError('Delete failed', err.message); return }
    setScores((s) => s.filter((x) => x.id !== id))
    success('Score deleted')
    logAudit('delete_score', 'score', id)
  }
  const updateScoreField = async (id: string, field: string, value: string) => {
    const parsed: any = field === 'position' ? (value ? parseInt(value) : null) : value || null
    const prev = scores.find((x) => x.id === id)
    setScores((s) => s.map((x) => (x.id === id ? { ...x, [field]: parsed } : x)))
    const { error: err } = await supabase.from('paradox_scores').update({ [field]: parsed }).eq('id', id)
    if (err) {
      toastError('Save failed', err.message)
      if (prev) setScores((s) => s.map((x) => (x.id === id ? prev : x)))
      return
    }
    success('Score saved')
    logAudit('edit_score_field', 'score', id, { field, value: parsed })
  }

  // ---- actions: volunteers ----
  const updateVolunteer = async (id: string, patch: any) => {
    const { error: err } = await supabase.from('paradox_volunteers').update(patch).eq('id', id)
    if (err) { toastError('Update failed', err.message); return }
    setVolunteers((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    logAudit('update_volunteer', 'volunteer', id, patch)
  }

  // ---- actions: winners ----
  const postWinner = async () => {
    if (!newWinner.event_id || !newWinner.winner_name) {
      warning('Missing fields', 'Event and winner name are required')
      return
    }
    setPostingWinner(true)
    const payload = {
      event_id: newWinner.event_id,
      event_name: newWinner.event_name,
      rank: parseInt(newWinner.rank),
      winner_name: newWinner.winner_name,
      school: newWinner.school || null,
      prize: newWinner.prize || null,
      photo_url: newWinner.photo_url || null,
      published: newWinner.published,
      published_at: newWinner.published ? new Date().toISOString() : null,
    }
    const { data, error: err } = await supabase.from('paradox_winners').insert(payload).select('id').single()
    if (err) { toastError('Save failed', err.message); setPostingWinner(false); return }
    if (data) {
      setWinners((w) => [
        ...w,
        { id: data.id, ...payload, created_at: new Date().toISOString() },
      ])
      success('Winner saved', newWinner.winner_name)
      logAudit('post_winner', 'winner', data.id, { name: newWinner.winner_name })
      setNewWinner({
        event_id: '',
        event_name: '',
        rank: '1',
        winner_name: '',
        school: '',
        prize: '',
        photo_url: '',
        published: false,
      })
      setShowNewWinner(false)
    }
    setPostingWinner(false)
  }
  const updateWinner = async (id: string, patch: any) => {
    const { error: err } = await supabase.from('paradox_winners').update(patch).eq('id', id)
    if (err) { toastError('Save failed', err.message); return }
    setWinners((w) => w.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    logAudit('update_winner', 'winner', id, patch)
  }
  const deleteWinner = async (id: string) => {
    if (!confirm('Delete this winner entry?')) return
    const { error: err } = await supabase.from('paradox_winners').delete().eq('id', id)
    if (err) { toastError('Delete failed', err.message); return }
    setWinners((w) => w.filter((x) => x.id !== id))
    success('Winner deleted')
    logAudit('delete_winner', 'winner', id)
  }
  const toggleWinnerPublished = async (id: string, published: boolean) => {
    const patch = {
      published,
      published_at: published ? new Date().toISOString() : null,
    }
    await updateWinner(id, patch)
  }

  // ---- actions: blog ----
  const postBlog = async () => {
    if (!newBlog.title.trim() || !newBlog.body.trim()) {
      warning('Missing fields', 'Title and body are required')
      return
    }
    setBlogSlugError(null)
    setPostingBlog(true)
    const finalSlug = newBlog.slug.trim() || slugify(newBlog.title)
    // uniqueness check
    const { data: existing } = await supabase
      .from('paradox_blog_posts')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle()
    if (existing) {
      setBlogSlugError('Slug already exists — change the title or edit the slug field.')
      setPostingBlog(false)
      return
    }
    const payload = {
      slug: finalSlug,
      title: newBlog.title,
      excerpt: newBlog.excerpt || null,
      body: newBlog.body,
      author: newBlog.author || null,
      tag: newBlog.tag,
      cover_color: newBlog.cover_color || null,
      published: newBlog.published,
      published_at: newBlog.published ? new Date().toISOString() : null,
      views: 0,
    }
    const { data, error: err } = await supabase.from('paradox_blog_posts').insert(payload).select('id').single()
    if (err) { toastError('Save failed', err.message); setPostingBlog(false); return }
    if (data) {
      setBlogPosts((b) => [
        {
          id: data.id,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...b,
      ])
      success('Post saved', newBlog.title)
      logAudit('post_blog', 'blog_post', data.id, { title: newBlog.title })
      setNewBlog({
        slug: '',
        title: '',
        excerpt: '',
        body: '',
        author: '',
        tag: 'announcement',
        cover_color: 'ink',
        published: false,
      })
      setShowNewBlog(false)
    }
    setPostingBlog(false)
  }
  const toggleBlogPublished = async (id: string, published: boolean) => {
    const patch = {
      published,
      published_at: published ? new Date().toISOString() : null,
    }
    const { error: err } = await supabase.from('paradox_blog_posts').update(patch).eq('id', id)
    if (err) { toastError('Save failed', err.message); return }
    setBlogPosts((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    info(published ? 'Post published' : 'Post unpublished')
    logAudit(published ? 'publish_blog' : 'unpublish_blog', 'blog_post', id)
  }
  const deleteBlog = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    const { error: err } = await supabase.from('paradox_blog_posts').delete().eq('id', id)
    if (err) { toastError('Delete failed', err.message); return }
    setBlogPosts((b) => b.filter((x) => x.id !== id))
    success('Post deleted')
    logAudit('delete_blog', 'blog_post', id)
  }

  // ---- actions: events ----
  const slugifyEvent = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const openNewEventForm = () => {
    setEditingEvent({
      name: '', slug: '', category: 'sport', active: true,
      date: '', time: '', venue: '',
      fee: null, prize: '', team_format: 'solo',
      min_team_size: 1, max_team_size: 1,
      max_participants: null,
      description: '', rules: '',
    })
    setShowEventForm(true)
  }

  const openEditEventForm = (ev: any) => {
    setEditingEvent({ ...ev })
    setShowEventForm(true)
  }

  const saveEvent = async () => {
    if (!editingEvent?.name?.trim()) {
      warning('Missing field', 'Event name is required')
      return
    }
    setSavingEvent(true)
    const slug = editingEvent.slug?.trim() || slugifyEvent(editingEvent.name ?? '')
    const payload: any = {
      name: editingEvent.name,
      slug,
      category: editingEvent.category ?? 'sport',
      active: editingEvent.active ?? true,
      date: editingEvent.date || null,
      time: editingEvent.time || null,
      venue: editingEvent.venue || null,
      fee: editingEvent.fee ?? null,
      prize: editingEvent.prize || null,
      team_format: editingEvent.team_format || null,
      min_team_size: editingEvent.min_team_size ?? null,
      max_team_size: editingEvent.max_team_size ?? null,
      max_participants: editingEvent.max_participants ?? null,
      description: editingEvent.description || null,
      rules: editingEvent.rules || null,
    }
    let saved = false
    if (editingEvent.id) {
      // update
      const { error } = await supabase.from('paradox_events').update(payload).eq('id', editingEvent.id)
      if (!error) {
        setEventsFull((prev) => prev.map((e) => e.id === editingEvent.id ? { ...e, ...payload, id: editingEvent.id! } : e))
        // also refresh EventLite list
        setEvents((prev) => prev.map((e) => e.id === editingEvent.id ? { id: editingEvent.id!, name: payload.name } : e))
        success('Event saved', `"${payload.name}" updated`)
        logAudit('update_event', 'event', editingEvent.id, { name: payload.name })
        saved = true
      } else {
        toastError('Save failed', error.message)
      }
    } else {
      // insert
      const { data, error } = await supabase.from('paradox_events').insert(payload).select('*').single()
      if (!error && data) {
        setEventsFull((prev) => [...prev, data as any])
        setEvents((prev) => [...prev, { id: data.id, name: data.name }])
        success('Event saved', `"${payload.name}" created`)
        logAudit('create_event', 'event', data.id, { name: payload.name })
        saved = true
      } else if (error) {
        toastError('Save failed', error.message)
      }
    }
    setSavingEvent(false)
    // Only close the form on a successful save — otherwise the user's edits
    // would silently vanish and the failure would feel like the button is broken.
    if (saved) {
      setShowEventForm(false)
      setEditingEvent(null)
    }
  }

  const toggleEventActive = async (id: string, active: boolean) => {
    // Guard against rapid clicks creating a race between two parallel updates
    if (togglingEventId === id) return
    setTogglingEventId(id)
    const { error: err } = await supabase.from('paradox_events').update({ active }).eq('id', id)
    if (err) {
      toastError('Update failed', err.message)
      setTogglingEventId(null)
      return
    }
    setEventsFull((prev) => prev.map((e) => e.id === id ? { ...e, active } : e))
    logAudit(active ? 'activate_event' : 'deactivate_event', 'event', id)
    setTogglingEventId(null)
  }

  // Hard-delete an event. Warns about cascade — if registrations/scores/winners
  // FK to this event with ON DELETE RESTRICT, the DB will reject. We catch the
  // error and surface it to the user rather than swallow it.
  const deleteEvent = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"?\n\nThis can't be undone. If the event has registrations or scores, the delete will be blocked.`)) return
    const { error: err } = await supabase.from('paradox_events').delete().eq('id', id)
    if (err) {
      toastError('Delete failed', err.message.includes('foreign')
        ? 'Event has linked registrations, scores, or winners. Remove those first.'
        : err.message)
      return
    }
    setEventsFull((prev) => prev.filter((e) => e.id !== id))
    success('Event deleted', name)
    logAudit('delete_event', 'event', id, { name })
  }

  // ---- actions: settings ----
  // Opens the "add new settings key" modal. The actual insert happens in
  // submitNewSettingKey() so the user gets a styled form + validation feedback
  // instead of a native browser prompt() dialog.
  const addSettingsKey = () => {
    setNewSettingKey('')
    setShowAddSettingKey(true)
  }

  const submitNewSettingKey = async () => {
    const key = newSettingKey.trim()
    if (!key) {
      warning('Missing key', 'Enter a settings key in snake_case')
      return
    }
    // Enforce snake_case so keys stay consistent with the existing schema.
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      warning('Invalid format', 'Use lowercase letters, digits, and underscores only (snake_case)')
      return
    }
    if (siteSettings.find((s) => s.key === key)) {
      warning('Key already exists', key)
      return
    }
    const payload = { key, value: {}, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('paradox_site_settings').insert(payload)
    if (error) {
      toastError('Save failed', error.message)
      return
    }
    setSiteSettings((list) => [...list, payload])
    success('Settings key added', key)
    logAudit('add_setting', 'setting', key)
    setShowAddSettingKey(false)
    setNewSettingKey('')
  }

  // ---- actions: team members ----
  // The public /team page reads paradox_team_members. These handlers let
  // admins add/edit/remove rows without touching code.
  const openNewTeamForm = (kind: 'leadership' | 'department') => {
    // Append to the end of the chosen group so the new card lands after the
    // existing ones rather than jumping to the top.
    const existing = teamMembers.filter((t) => t.kind === kind)
    const nextOrder = existing.length === 0
      ? 0
      : Math.max(...existing.map((t) => t.sort_order)) + 1
    setEditingTeam({ kind, name: '', role: '', sort_order: nextOrder, photo_url: null })
    setShowTeamForm(true)
  }

  const openEditTeamForm = (m: TeamMember) => {
    setEditingTeam({ ...m })
    setShowTeamForm(true)
  }

  const saveTeamMember = async () => {
    if (!editingTeam?.name?.trim()) {
      warning('Missing field', 'Name is required')
      return
    }
    if (!editingTeam.kind) {
      warning('Missing field', 'Pick leadership or department')
      return
    }
    setSavingTeam(true)
    const payload = {
      kind: editingTeam.kind,
      name: editingTeam.name.trim(),
      role: editingTeam.role?.trim() || null,
      sort_order: editingTeam.sort_order ?? 0,
      photo_url: editingTeam.photo_url || null,
      updated_at: new Date().toISOString(),
    }
    let saved = false
    if (editingTeam.id) {
      const { error } = await supabase
        .from('paradox_team_members')
        .update(payload)
        .eq('id', editingTeam.id)
      if (error) {
        toastError('Save failed', error.message)
      } else {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === editingTeam.id ? { ...m, ...payload, id: m.id, created_at: m.created_at } : m)),
        )
        success('Team member saved', `"${payload.name}" updated`)
        logAudit('update_team_member', 'team_member', editingTeam.id, { name: payload.name })
        saved = true
      }
    } else {
      const { data, error } = await supabase
        .from('paradox_team_members')
        .insert(payload)
        .select('*')
        .single()
      if (error || !data) {
        toastError('Save failed', error?.message ?? 'No data returned')
      } else {
        setTeamMembers((prev) => [...prev, data as TeamMember])
        success('Team member added', `"${payload.name}"`)
        logAudit('create_team_member', 'team_member', (data as TeamMember).id, { name: payload.name })
        saved = true
      }
    }
    setSavingTeam(false)
    if (saved) {
      setShowTeamForm(false)
      setEditingTeam(null)
    }
  }

  const deleteTeamMember = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the team?`)) return
    const { error } = await supabase.from('paradox_team_members').delete().eq('id', id)
    if (error) { toastError('Delete failed', error.message); return }
    setTeamMembers((prev) => prev.filter((m) => m.id !== id))
    success('Team member removed', name)
    logAudit('delete_team_member', 'team_member', id, { name })
  }

  // Bump sort_order up or down by swapping with the adjacent row in the same
  // group. Two writes per swap — small enough to not worry about batching.
  const moveTeamMember = async (id: string, direction: 'up' | 'down') => {
    // Guard against rapid clicks that would interleave two swap writes.
    if (movingTeamId) return
    const member = teamMembers.find((m) => m.id === id)
    if (!member) return
    const group = teamMembers
      .filter((m) => m.kind === member.kind)
      .sort((a, b) => a.sort_order - b.sort_order)
    const idx = group.findIndex((m) => m.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= group.length) return
    const other = group[swapIdx]
    // Swap their sort_order values.
    const [a, b] = [member.sort_order, other.sort_order]
    setMovingTeamId(id)
    try {
      const { error: e1 } = await supabase
        .from('paradox_team_members')
        .update({ sort_order: b, updated_at: new Date().toISOString() })
        .eq('id', member.id)
      if (e1) { toastError('Move failed', e1.message); return }
      const { error: e2 } = await supabase
        .from('paradox_team_members')
        .update({ sort_order: a, updated_at: new Date().toISOString() })
        .eq('id', other.id)
      if (e2) { toastError('Move failed', e2.message); return }
      setTeamMembers((prev) =>
        prev.map((m) => {
          if (m.id === member.id) return { ...m, sort_order: b }
          if (m.id === other.id) return { ...m, sort_order: a }
          return m
        }),
      )
      logAudit('reorder_team_member', 'team_member', id, { direction })
    } finally {
      setMovingTeamId(null)
    }
  }

  // ---- actions: role presets ----
  // Apply a role bundle to a user: sets the role label AND overwrites the
  // permissions JSONB with the preset. Super admins can still toggle
  // individual checkboxes after to fine-tune.
  const applyRolePreset = async (userEmail: string, role: RoleName) => {
    const preset = ROLE_PRESETS[role]
    if (!preset) return
    const { error } = await supabase
      .from('paradox_admin_permissions')
      .update({ role, permissions: preset })
      .eq('user_email', userEmail)
    if (error) { toastError('Apply role failed', error.message); return }
    // Optimistic — realtime will reconcile.
    setAdminUsers((prev) =>
      prev.map((u) =>
        u.user_email === userEmail ? { ...u, role, permissions: preset } : u,
      ),
    )
    success('Role applied', `${userEmail} → ${ROLE_LABELS[role]}`)
    logAudit('apply_role_preset', 'account', userEmail, { role })
  }

  // ---- guards ----
  if (loading || !session || !ready) {
    return (
      <div className="min-h-screen w-full bg-ink text-bg p-5 space-y-3">
        <div className="bg-bg/10 h-8 w-40 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-bg/10 h-14 animate-pulse" />
          <div className="bg-bg/10 h-14 animate-pulse" />
          <div className="bg-bg/10 h-14 animate-pulse" />
          <div className="bg-bg/10 h-14 animate-pulse" />
        </div>
        <div className="bg-bg/10 h-10 animate-pulse" />
        <div className="bg-bg/10 h-32 animate-pulse" />
      </div>
    )
  }

  // ---- render ----
  return (
    <div className="min-h-screen bg-ink text-bg font-body">
      {/* TOP BAR */}
      <div className="sticky top-0 z-50 border-b border-bg/10 px-4 sm:px-6 h-[64px] flex justify-between items-center"
        style={{ background: 'color-mix(in oklch, var(--ink) 95%, transparent)', backdropFilter: 'blur(12px)' }}>
        {/* Logo */}
        <Link to="/paradox/admin" className="flex items-center gap-2 shrink-0">
          <img src="/paradox/paradox-logo.png" alt="Paradox"
            style={{ height: 52, width: 'auto', transform: 'rotate(-3deg)', display: 'block', filter: 'brightness(0) invert(1) opacity(0.9)' }}
            draggable={false}
          />
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-35 hidden sm:inline">admin</span>
        </Link>

        {/* Actions */}
        <div className="flex gap-2 items-center">
          {activeTab === 'registrations' && (
            <button onClick={exportCSV}
              className="font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-2 rounded-full border border-bg/20 hover:bg-bg/10 transition-[background-color,opacity] active:scale-[0.96] min-h-[44px]">
              export csv
            </button>
          )}
          <Link to="/paradox"
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-2 rounded-full border border-bg/20 hover:bg-bg/10 transition-[background-color,opacity] active:scale-[0.96] min-h-[44px] flex items-center">
            ← site
          </Link>
          <span className="font-mono text-[10px] opacity-30 hidden lg:inline max-w-[140px] truncate">
            {session?.user?.email}
          </span>
          <button
            onClick={async () => {
              if (currentSessionId) {
                await supabase.from('paradox_admin_sessions')
                  .update({ is_active: false, ended_at: new Date().toISOString() })
                  .eq('id', currentSessionId)
              }
              await signOut()
              navigate('/paradox/admin/login')
            }}
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-3 py-2 rounded-full min-h-[44px] active:scale-[0.96] transition-[background-color,opacity]"
            style={{ background: 'rgba(255,67,56,0.15)', color: 'var(--c1)', border: '1px solid rgba(255,67,56,0.3)' }}
          >
            logout
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="px-5 py-4 flex flex-wrap gap-2 border-b border-bg/10">
        {[
          { label: 'total',    value: stats.total,    accent: 'var(--bg)',  bg: 'rgba(255,255,255,0.06)' },
          { label: 'paid',     value: stats.paid,     accent: 'var(--c2)',  bg: 'rgba(255,210,63,0.1)' },
          { label: 'attended', value: stats.attended, accent: 'var(--c3)',  bg: 'rgba(183,156,237,0.1)' },
          { label: 'unpaid',   value: stats.unpaid,   accent: 'var(--c1)',  bg: 'rgba(255,67,56,0.1)' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="px-4 py-2.5 rounded-xl flex items-baseline gap-2 border border-bg/10"
            style={{ background: s.bg }}
          >
            <span className="font-display text-[26px] leading-[0.95] tabular-nums" style={{ color: s.accent }}>{s.value}</span>
            <span className="font-mono text-[10px] uppercase opacity-50 tracking-[0.1em]">{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* TAB BAR — horizontal pill tabs */}
      <div className="px-4 sm:px-6 py-3 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-bg/10">
        {visibleTabs.map((key) => {
          const label = TAB_LABELS[key] ?? key
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-3.5 py-2 rounded-full font-mono text-[10px] tracking-[0.08em] uppercase whitespace-nowrap transition-[background-color,color,font-weight] duration-150 active:scale-[0.96] min-h-[44px]"
              style={{
                background: active ? 'var(--c1)' : 'rgba(255,255,255,0.07)',
                color: active ? 'var(--bg)' : 'rgba(255,255,255,0.55)',
                border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                fontWeight: active ? 700 : 400,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENT */}
      <AnimatePresence mode="wait">
        {activeTab === 'registrations' && (
          <motion.div key="registrations" {...tabAnim}>
            {/* Filters */}
            <div className="px-4 sm:px-6 py-3 flex gap-2 flex-wrap border-b border-bg/10 items-center">
              <input
                type="text"
                placeholder="search name / school / phone / reg id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] bg-bg/8 border border-bg/20 rounded-lg text-bg px-3 py-2.5 font-body text-[13px] outline-none placeholder:opacity-40 focus:border-c2 focus:ring-1 focus:ring-c2/30 transition-[border-color,box-shadow]"
              />
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
              >
                <option value="all" className="bg-ink">all events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-ink">{e.name}</option>
                ))}
              </select>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'unpaid', 'paid', 'attended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.08em] min-h-[32px] transition-all active:scale-[0.96]"
                    style={{
                      background: statusFilter === s ? 'var(--c2)' : 'rgba(255,255,255,0.07)',
                      color: statusFilter === s ? 'var(--ink)' : 'rgba(255,255,255,0.6)',
                      border: statusFilter === s ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      fontWeight: statusFilter === s ? 700 : 400,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Registration cards — replaces the unreadable 11-col table */}
            <div className="px-4 sm:px-6 py-4 space-y-2">
              <AnimatePresence>
                {filtered.map((r, i) => {
                  const bucket = !r.paid ? ageBucket(r.created_at) : 'fresh'
                  return (
                    <motion.div
                      key={r.reg_id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: Math.min(i * 0.02, 0.3) }}
                      className="rounded-2xl border overflow-hidden transition-colors"
                      style={{
                        borderColor: r.attended ? 'rgba(183,156,237,0.3)' : r.paid ? 'rgba(183,156,237,0.15)' : 'rgba(255,67,56,0.2)',
                        background: r.attended ? 'rgba(183,156,237,0.07)' : r.paid ? 'rgba(255,255,255,0.04)' : 'rgba(255,67,56,0.05)',
                      }}
                    >
                      {/* ── Card top: name + status badges ── */}
                      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
                        <div className="min-w-0">
                          <div className="font-display text-bg text-[18px] leading-tight truncate">{r.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-[10px] text-c2 tabular-nums opacity-80">{r.reg_id}</span>
                            {bucket === 'stale24' && <span className="font-mono text-[9px] bg-c1 text-bg px-2 py-0.5 rounded-full">24h+ unpaid</span>}
                            {bucket === 'stale12' && <span className="font-mono text-[9px] bg-c2 text-ink px-2 py-0.5 rounded-full">12h+ unpaid</span>}
                          </div>
                        </div>
                        {/* Status pills */}
                        <div className="flex gap-1.5 shrink-0 items-center mt-0.5">
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                            style={{
                              background: r.paid ? 'rgba(183,156,237,0.2)' : 'rgba(255,67,56,0.15)',
                              color: r.paid ? 'var(--c3)' : 'var(--c1)',
                              border: `1px solid ${r.paid ? 'rgba(183,156,237,0.3)' : 'rgba(255,67,56,0.3)'}`,
                            }}>
                            {r.paid ? 'paid' : 'unpaid'}
                          </span>
                          {r.attended && (
                            <span className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                              style={{ background: 'rgba(183,156,237,0.25)', color: 'var(--c3)', border: '1px solid rgba(183,156,237,0.4)' }}>
                              in ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Card body: event + school + phone ── */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-2.5 text-[12px]">
                        <span className="font-body opacity-90 font-medium">{r.event_name}</span>
                        <span className="font-body opacity-55">{r.school}{r.class_year ? ` · ${r.class_year}` : ''}</span>
                        <a href={`tel:${r.phone}`} className="font-mono opacity-55 hover:opacity-100 transition-opacity tabular-nums">{r.phone}</a>
                      </div>

                      {/* ── Card footer: actions ── */}
                      <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 pt-1 border-t border-bg/8">
                        {/* Notes inline */}
                        <input
                          type="text"
                          value={notes[r.reg_id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.reg_id]: e.target.value }))}
                          onBlur={(e) => { if ((r.notes ?? '') !== e.target.value) saveNotes(r.reg_id, e.target.value) }}
                          className="flex-1 min-w-[120px] bg-bg/8 border border-bg/15 rounded-xl px-3 py-1.5 font-mono text-[10px] outline-none focus:border-c2 placeholder:opacity-30 transition-colors"
                          placeholder="add note…"
                        />

                        {/* Action buttons */}
                        {!r.paid && (
                          <button onClick={() => markPaid(r.reg_id)}
                            className="px-3 py-2 min-h-[44px] rounded-full font-mono text-[10px] uppercase tracking-[0.06em] active:scale-[0.96] transition-[background-color,transform]"
                            style={{ background: 'rgba(255,210,63,0.2)', color: 'var(--c2)', border: '1px solid rgba(255,210,63,0.3)' }}>
                            Mark Paid
                          </button>
                        )}
                        {r.paid && !r.attended && (
                          <button onClick={() => markAttended(r.reg_id)}
                            className="px-3 py-2 min-h-[44px] rounded-full font-mono text-[10px] uppercase tracking-[0.06em] active:scale-[0.96] transition-[background-color,transform]"
                            style={{ background: 'rgba(183,156,237,0.2)', color: 'var(--c3)', border: '1px solid rgba(183,156,237,0.3)' }}>
                            Check In
                          </button>
                        )}
                        <Link to={`/paradox/ticket/${r.token}`} target="_blank"
                          className="px-3 py-2 min-h-[44px] rounded-full font-mono text-[10px] uppercase tracking-[0.06em] border border-bg/20 hover:bg-bg/10 transition-colors flex items-center">
                          Ticket ↗
                        </Link>
                        {r.paid && (
                          <div className="relative" data-wa-menu>
                            <button onClick={() => setWaMenu(waMenu === r.reg_id ? null : r.reg_id)}
                              className="px-3 py-2 min-h-[44px] rounded-full font-mono text-[10px] uppercase tracking-[0.06em] active:scale-[0.96] transition-[background-color,transform]"
                              style={{ background: 'rgba(183,156,237,0.15)', color: 'var(--c3)', border: '1px solid rgba(183,156,237,0.25)' }}>
                              {copied === r.reg_id ? '✓ copied' : 'WA ▾'}
                            </button>
                            {waMenu === r.reg_id && (
                              <div className="absolute left-0 top-full mt-1.5 z-30 rounded-xl border border-bg/20 overflow-hidden shadow-xl min-w-[140px]"
                                style={{ background: 'color-mix(in oklch, var(--ink) 95%, transparent)', backdropFilter: 'blur(12px)' }}>
                                {(['ticket', 'upi', 'reminder', 'rejection'] as const).map((k) => (
                                  <button key={k}
                                    onClick={() => {
                                      const link = `${location.origin}/ticket/${r.token}`
                                      navigator.clipboard.writeText(TEMPLATES(r, link)[k])
                                      setCopied(r.reg_id); setWaMenu(null)
                                      setTimeout(() => setCopied(null), 1500)
                                    }}
                                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-bg font-mono text-[10px] uppercase tracking-[0.06em] hover:bg-bg/10 transition-colors">
                                    {k === 'ticket' ? '🎟️' : k === 'upi' ? '💸' : k === 'reminder' ? '⏰' : '❌'}
                                    <span>{k === 'ticket' ? 'Ticket' : k === 'upi' ? 'UPI' : k === 'reminder' ? 'Reminder' : 'Reject'}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">registrations</span>
                  <span className="font-display text-[22px] opacity-40">Nothing matches</span>
                  <span className="font-mono text-[11px] opacity-30">Try clearing your filters</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'updates' && (
          <motion.div key="updates" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={() => setShowNewUpdate((s) => !s)}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                {showNewUpdate ? '× Cancel' : '+ New Update'}
              </button>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {(['all', ...TAG_OPTIONS] as string[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setUpdateTagFilter(t)}
                    className={`px-2.5 py-1 min-h-[28px] font-mono text-[10px] uppercase tracking-[0.08em] border transition-colors duration-150 ${
                      updateTagFilter === t
                        ? 'bg-c2 text-ink border-c2'
                        : 'border-bg/20 text-bg opacity-70 hover:opacity-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {showNewUpdate && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-4 border-b border-bg/10 overflow-hidden"
                >
                  <div className="grid gap-3 max-w-2xl">
                    <input
                      type="text"
                      placeholder="title…"
                      value={newUpdate.title}
                      onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-base outline-none focus:border-c2"
                    />
                    <textarea
                      placeholder="body…"
                      rows={4}
                      value={newUpdate.body}
                      onChange={(e) => setNewUpdate({ ...newUpdate, body: e.target.value })}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2 resize-y"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={newUpdate.event_name}
                        onChange={(e) => setNewUpdate({ ...newUpdate, event_name: e.target.value })}
                        className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[12px] outline-none focus:border-c2 flex-1 min-w-[180px]"
                      >
                        <option value="" className="bg-ink">— no event —</option>
                        {events.map((e) => (
                          <option key={e.id} value={e.name} className="bg-ink">{e.name}</option>
                        ))}
                      </select>
                      <select
                        value={newUpdate.tag}
                        onChange={(e) =>
                          setNewUpdate({ ...newUpdate, tag: e.target.value as NewUpdate['tag'] })
                        }
                        className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                      >
                        {TAG_OPTIONS.map((t) => (
                          <option key={t} value={t} className="bg-ink">{t}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-2 border border-bg/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUpdate.pinned}
                          onChange={(e) => setNewUpdate({ ...newUpdate, pinned: e.target.checked })}
                        />
                        pin
                      </label>
                    </div>
                    <button
                      disabled={postingUpdate}
                      onClick={postUpdate}
                      className="bg-c2 text-ink font-bold px-4 py-2.5 self-start disabled:opacity-60 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center gap-2"
                    >
                      {postingUpdate && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {postingUpdate ? 'Posting…' : 'Post update →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['Pin', 'Tag', 'Title', 'Event', 'Posted', '', ''].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredUpdates.map((u) => (
                      <motion.tr
                        key={u.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-bg/6 hover:bg-bg/3"
                      >
                        <td className="px-3 py-2.5">
                          {u.pinned ? <span className="text-c2">★</span> : <span className="opacity-20">☆</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 ${
                              TAG_COLORS[u.tag] ?? 'bg-bg/20 text-bg'
                            }`}
                          >
                            {u.tag}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[320px]">
                          <div className="font-medium truncate">{u.title}</div>
                          <div className="opacity-60 text-[12px] truncate">{u.body}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] opacity-70">{u.event_name ?? '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] opacity-60">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => pinUpdate(u.id, !u.pinned)}
                            className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 min-h-[32px] border border-bg/20 hover:border-c2 active:scale-[0.96] transition-transform duration-150"
                          >
                            {u.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => deleteUpdate(u.id)}
                            className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] rounded-full bg-c1/15 border border-c1/30 text-c1 hover:bg-c1/25 active:scale-[0.96] transition-transform duration-150"
                          >
                            Delete
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredUpdates.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">updates</span>
                  <span className="font-display text-[22px] opacity-40">No updates yet</span>
                  <span className="font-mono text-[11px] opacity-30">Click "+ New Update" to post one</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'inquiries' && (
          <motion.div key="inquiries" {...tabAnim}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['#', 'Company', 'Contact', 'Phone', 'Email', 'Tier', 'Status', 'Notes', 'Submitted'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((i, idx) => (
                    <tr key={i.id} className="border-b border-bg/6 hover:bg-bg/3">
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-50">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{i.company}</td>
                      <td className="px-3 py-2.5 text-[13px]">{i.contact}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] opacity-80">{i.phone}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-70">{i.email}</td>
                      <td className="px-3 py-2.5 text-[12px] opacity-80">{i.tier ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={i.status}
                          onChange={(e) => updateInquiry(i.id, { status: e.target.value })}
                          className={`bg-transparent border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] outline-none ${
                            i.status === 'new'
                              ? 'border-c1/50 text-c1'
                              : i.status === 'contacted'
                              ? 'border-c2/50 text-c2'
                              : 'border-cool/50 text-c3'
                          }`}
                        >
                          <option value="new" className="bg-ink">new</option>
                          <option value="contacted" className="bg-ink">contacted</option>
                          <option value="closed" className="bg-ink">closed</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <input
                          type="text"
                          value={inqNotes[i.id] ?? ''}
                          onChange={(e) =>
                            setInqNotes((n) => ({ ...n, [i.id]: e.target.value }))
                          }
                          onBlur={(e) => {
                            if ((i.notes ?? '') !== e.target.value)
                              updateInquiry(i.id, { notes: e.target.value })
                          }}
                          className="w-full bg-transparent border border-bg/15 px-2 py-1 font-mono text-[11px] outline-none focus:border-c2"
                          placeholder="…"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-60">
                        {new Date(i.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inquiries.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">inquiries</span>
                  <span className="font-display text-[22px] opacity-40">No inquiries yet</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'checkin' && (
          <motion.div key="checkin" {...tabAnim} className="px-5 py-5 max-w-2xl mx-auto w-full">

            {/* Scanner overlay */}
            <AnimatePresence>
              {scannerOpen && (
                <BarcodeScannerOverlay
                  onScan={(code) => {
                    setCheckinSearch(code)
                    setScannerOpen(false)
                  }}
                  onClose={() => setScannerOpen(false)}
                />
              )}
            </AnimatePresence>

            {/* Scan button + text search row */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setScannerOpen(true)}
                className="shrink-0 bg-c2 text-ink px-4 py-3.5 min-h-[52px] font-mono text-[11px] uppercase tracking-[0.08em] border-[1.5px] border-bg/30 flex items-center gap-2 hover:brightness-95 active:scale-[0.96] transition-transform"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <line x1="7" y1="12" x2="7" y2="12.01"/>
                  <line x1="12" y1="7" x2="12" y2="17"/>
                  <line x1="17" y1="12" x2="17" y2="12.01"/>
                </svg>
                Scan
              </button>
              <input
                type="text"
                value={checkinSearch}
                onChange={(e) => setCheckinSearch(e.target.value)}
                placeholder="search name, phone, or reg ID…"
                className="flex-1 bg-bg/6 border-[1.5px] border-bg/20 px-4 py-3.5 text-base outline-none focus:border-c2 placeholder:opacity-50"
              />
            </div>
            {checkinSearch.trim().length < 3 ? (
              <div className="mt-6 text-center font-mono text-[12px] opacity-50">Type at least 3 characters to search (name, phone, or reg ID)</div>
            ) : (
              <div className="mt-5 space-y-3">
                {checkinResults.map((r) => {
                  const status = r.attended ? 'attended' : r.paid ? 'paid' : 'unpaid'
                  return (
                    <motion.div
                      key={r.reg_id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-bg/5 border border-bg/12 p-4 relative"
                    >
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <div>
                          <div className="font-display text-[22px] leading-tight text-balance">{r.name}</div>
                          <div className="font-mono text-[11px] opacity-60 mt-0.5">{r.event_name}</div>
                        </div>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2 py-1 whitespace-nowrap ${
                            status === 'attended'
                              ? 'bg-c3 text-white'
                              : status === 'paid'
                              ? 'bg-c2 text-ink'
                              : 'bg-c1 text-white'
                          }`}
                        >
                          {status === 'attended' ? 'already in' : status === 'paid' ? 'ready' : 'unpaid'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] opacity-60 mb-3 tabular-nums">
                        {r.school} · {r.phone} · {r.reg_id}
                      </div>
                      {status === 'paid' && (
                        <button
                          onClick={() => markAttended(r.reg_id)}
                          className="w-full bg-c1 text-white py-3.5 min-h-[44px] font-bold text-base hover:brightness-110 active:scale-[0.96] transition-transform duration-150"
                        >
                          ✓ CHECK IN →
                        </button>
                      )}
                      {status === 'unpaid' && (
                        <button
                          onClick={() => {
                            setActiveTab('registrations')
                            setSearch(r.name)
                          }}
                          className="w-full bg-bg/10 border border-bg/20 py-3 min-h-[44px] font-mono text-[12px] uppercase tracking-[0.08em] hover:bg-bg/20 active:scale-[0.96] transition-transform duration-150"
                        >
                          Mark Paid First →
                        </button>
                      )}
                      {status === 'attended' && (
                        <div className="font-mono text-[12px] text-c3">✓ already checked in</div>
                      )}
                    </motion.div>
                  )
                })}
                {checkinResults.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">check-in</span>
                    <span className="font-display text-[22px] opacity-40">No matches</span>
                    <span className="font-mono text-[11px] opacity-30">Try a different name, phone, or reg ID</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ EVENTS TAB ══ */}
        {activeTab === 'events' && (
          <motion.div key="events" {...tabAnim}>
            {/* Toolbar */}
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={openNewEventForm}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                + Add Event
              </button>
              <span className="font-mono text-[11px] opacity-40 ml-1">
                {eventsFull.length} events
              </span>
            </div>

            {/* Edit / Create panel */}
            <AnimatePresence>
              {showEventForm && editingEvent && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-5 border-b border-bg/10 overflow-hidden"
                >
                  <div className="max-w-4xl">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-50 mb-4">
                      {editingEvent.id ? `editing: ${editingEvent.name}` : 'new event'}
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {/* Name */}
                      <div className="lg:col-span-2">
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Name</label>
                        <input
                          type="text"
                          placeholder="Event name"
                          value={editingEvent.name ?? ''}
                          onChange={(e) => {
                            const name = e.target.value
                            setEditingEvent((ev) => ({
                              ...ev!,
                              name,
                              slug: ev?.id ? ev.slug ?? '' : slugifyEvent(name),
                            }))
                          }}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      {/* Slug */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Slug</label>
                        <input
                          type="text"
                          placeholder="auto-generated"
                          value={editingEvent.slug ?? ''}
                          onChange={(e) =>
                            setEditingEvent((ev) => ({ ...ev!, slug: slugifyEvent(e.target.value) }))
                          }
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                        />
                      </div>
                      {/* Category */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Category</label>
                        <select
                          value={editingEvent.category ?? 'sport'}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, category: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                        >
                          {['sport', 'business', 'creative', 'cultural', 'other'].map((c) => (
                            <option key={c} value={c} className="bg-ink">{c}</option>
                          ))}
                        </select>
                      </div>
                      {/* Date */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Date</label>
                        <input
                          type="text"
                          placeholder="Jun 4, 2026"
                          value={editingEvent.date ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, date: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      {/* Time */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Time</label>
                        <input
                          type="text"
                          placeholder="10:00 AM"
                          value={editingEvent.time ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, time: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      {/* Venue */}
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Venue</label>
                        <input
                          type="text"
                          placeholder="60 Chowringhee Rd"
                          value={editingEvent.venue ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, venue: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      {/* Fee */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Fee (₹)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={editingEvent.fee ?? ''}
                          onChange={(e) =>
                            setEditingEvent((ev) => ({
                              ...ev!,
                              fee: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                        />
                      </div>
                      {/* Prize */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Prize</label>
                        <input
                          type="text"
                          placeholder="₹10,000 cash"
                          value={editingEvent.prize ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, prize: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      {/* Team format — solo / duo / team toggle. Picking "team"
                          reveals a number input for participants per team. */}
                      <div className="sm:col-span-2">
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Format</label>
                        <div className="flex gap-1 border border-bg/20 rounded-md p-1 w-fit">
                          {(['solo', 'duo', 'team'] as const).map((f) => {
                            const active = (editingEvent.team_format ?? 'solo') === f
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setEditingEvent((ev) => {
                                  if (!ev) return ev
                                  const base = { ...ev, team_format: f }
                                  if (f === 'solo') { base.min_team_size = 1; base.max_team_size = 1 }
                                  else if (f === 'duo') { base.min_team_size = 2; base.max_team_size = 2 }
                                  else { // team — keep existing values if they're >=2, else default to 3..5
                                    if (!base.min_team_size || base.min_team_size < 2) base.min_team_size = 3
                                    if (!base.max_team_size || base.max_team_size < base.min_team_size) base.max_team_size = Math.max(5, base.min_team_size)
                                  }
                                  return base
                                })}
                                className={[
                                  'px-4 py-1.5 rounded font-mono text-[11px] uppercase tracking-[0.1em] transition-colors min-h-[36px]',
                                  active ? 'bg-c2 text-ink' : 'text-bg/70 hover:text-bg',
                                ].join(' ')}
                              >
                                {f}
                              </button>
                            )
                          })}
                        </div>
                        {editingEvent.team_format === 'team' && (
                          <div className="flex items-end gap-3 mt-3">
                            <div>
                              <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Min players</label>
                              <input
                                type="number"
                                min={2}
                                max={50}
                                value={editingEvent.min_team_size ?? 3}
                                onChange={(e) => {
                                  const v = Math.max(2, Number(e.target.value) || 2)
                                  setEditingEvent((ev) => ev ? { ...ev, min_team_size: v, max_team_size: Math.max(v, ev.max_team_size ?? v) } : ev)
                                }}
                                className="w-24 bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[13px] tabular-nums outline-none focus:border-c2"
                              />
                            </div>
                            <div className="opacity-40 pb-2 font-mono text-[12px]">to</div>
                            <div>
                              <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Max players</label>
                              <input
                                type="number"
                                min={editingEvent.min_team_size ?? 2}
                                max={50}
                                value={editingEvent.max_team_size ?? (editingEvent.min_team_size ?? 3)}
                                onChange={(e) => {
                                  const min = editingEvent.min_team_size ?? 2
                                  const v = Math.max(min, Number(e.target.value) || min)
                                  setEditingEvent((ev) => ev ? { ...ev, max_team_size: v } : ev)
                                }}
                                className="w-24 bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[13px] tabular-nums outline-none focus:border-c2"
                              />
                            </div>
                            <div className="opacity-50 pb-2 font-mono text-[11px]">players per team</div>
                          </div>
                        )}
                      </div>
                      {/* Max participants */}
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Max participants</label>
                        <input
                          type="number"
                          placeholder="no limit"
                          value={editingEvent.max_participants ?? ''}
                          onChange={(e) =>
                            setEditingEvent((ev) => ({
                              ...ev!,
                              max_participants: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                        />
                      </div>
                      {/* Active toggle */}
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-2.5 border border-bg/20 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingEvent.active ?? true}
                            onChange={(e) => setEditingEvent((ev) => ({ ...ev!, active: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-acid"
                          />
                          active (visible on site)
                        </label>
                      </div>
                      {/* Description */}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Description</label>
                        <textarea
                          rows={3}
                          placeholder="Short description shown on event listing…"
                          value={editingEvent.description ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, description: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2 resize-y"
                        />
                      </div>
                      {/* Rules */}
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Rules</label>
                        <textarea
                          rows={4}
                          placeholder="Full rules — markdown ok…"
                          value={editingEvent.rules ?? ''}
                          onChange={(e) => setEditingEvent((ev) => ({ ...ev!, rules: e.target.value }))}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2 resize-y"
                        />
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        disabled={savingEvent || !editingEvent.name?.trim()}
                        onClick={saveEvent}
                        className="bg-c2 text-ink font-bold px-5 py-2.5 disabled:opacity-50 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center gap-2"
                      >
                        {savingEvent && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                        {savingEvent ? 'Saving…' : editingEvent.id ? 'Save changes →' : 'Create event →'}
                      </button>
                      <button
                        onClick={() => { setShowEventForm(false); setEditingEvent(null) }}
                        className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] border border-bg/20 text-bg opacity-60 hover:opacity-100 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Events table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['Name', 'Category', 'Date', 'Venue', 'Fee', 'Format', 'Cap', 'Active', ''].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {eventsFull.map((ev) => {
                      const regCount = rows.filter((r) => r.event_id === ev.id).length
                      return (
                        <motion.tr
                          key={ev.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-bg/6 hover:bg-bg/3"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-[14px]">{ev.name}</div>
                            <div className="font-mono text-[10px] opacity-40 truncate max-w-[180px]">{ev.slug}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-[10px] uppercase tracking-[0.06em] px-1.5 py-0.5 bg-bg/10 text-bg/70">
                              {ev.category}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] opacity-70 whitespace-nowrap">
                            {ev.date ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-[12px] opacity-70 max-w-[160px] truncate">
                            {ev.venue ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums">
                            {ev.fee != null ? `₹${ev.fee}` : 'free'}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] opacity-70">
                            {(() => {
                              const f = ev.team_format
                              if (f === 'solo') return 'solo'
                              if (f === 'duo' || f === 'pair') return 'duo'
                              if (f === 'team' || f === 'small_team' || f === 'large_team') {
                                const mn = ev.min_team_size, mx = ev.max_team_size
                                if (mn && mx && mn !== mx) return `team · ${mn}–${mx}`
                                if (mx) return `team · ${mx}`
                                return 'team'
                              }
                              return f?.replace('_', ' ') ?? '—'
                            })()}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums">
                            <span className={regCount > 0 ? 'text-c2' : 'opacity-40'}>
                              {regCount}
                            </span>
                            <span className="opacity-30">
                              {ev.max_participants != null ? ` / ${ev.max_participants}` : ''}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => toggleEventActive(ev.id, !ev.active)}
                              disabled={togglingEventId === ev.id}
                              className={`font-mono text-[10px] uppercase tracking-[0.06em] px-3 py-2 min-h-[44px] border transition-[background-color,color] active:scale-[0.96] disabled:opacity-40 disabled:cursor-wait ${
                                ev.active
                                  ? 'bg-c3/20 border-c3/40 text-c3'
                                  : 'border-bg/20 text-bg opacity-50'
                              }`}
                            >
                              {togglingEventId === ev.id ? '…' : ev.active ? '✓ live' : 'hidden'}
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => openEditEventForm(ev)}
                                className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 min-h-[32px] border border-bg/20 hover:border-c2 text-bg opacity-70 hover:opacity-100 active:scale-[0.96] transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteEvent(ev.id, ev.name)}
                                className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-1 min-h-[32px] border border-c1/30 text-c1/80 hover:bg-c1/15 hover:text-c1 active:scale-[0.96] transition"
                                title="Delete event"
                              >
                                Del
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {eventsFull.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">events</span>
                  <span className="font-display text-[22px] opacity-40">No events yet</span>
                  <span className="font-mono text-[11px] opacity-30">Click "+ Add Event" to create one</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'scores' && (
          <motion.div key="scores" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={() => setShowNewScore((s) => !s)}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                {showNewScore ? '× Cancel' : '+ Add Score'}
              </button>
              <select
                value={scoreEventFilter}
                onChange={(e) => setScoreEventFilter(e.target.value)}
                className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
              >
                <option value="all" className="bg-ink">all events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-ink">{e.name}</option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {showNewScore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-4 border-b border-bg/10 overflow-hidden"
                >
                  <div className="grid gap-3 max-w-3xl grid-cols-1 sm:grid-cols-2">
                    <select
                      value={newScore.event_id}
                      onChange={(e) => {
                        const ev = events.find((x) => x.id === e.target.value)
                        setNewScore({
                          ...newScore,
                          event_id: e.target.value,
                          event_name: ev?.name ?? '',
                        })
                      }}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                    >
                      <option value="" className="bg-ink">— pick event —</option>
                      {events.map((e) => (
                        <option key={e.id} value={e.id} className="bg-ink">{e.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="team / participant"
                      value={newScore.team_name}
                      onChange={(e) => setNewScore({ ...newScore, team_name: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="text"
                      placeholder="school"
                      value={newScore.school}
                      onChange={(e) => setNewScore({ ...newScore, school: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="text"
                      placeholder="score (e.g. 92 / 100)"
                      value={newScore.score}
                      onChange={(e) => setNewScore({ ...newScore, score: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="number"
                      placeholder="position (1, 2, 3…)"
                      value={newScore.position}
                      onChange={(e) => setNewScore({ ...newScore, position: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <select
                      value={newScore.round}
                      onChange={(e) => setNewScore({ ...newScore, round: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                    >
                      {ROUND_OPTIONS.map((r) => (
                        <option key={r} value={r} className="bg-ink">{r}</option>
                      ))}
                    </select>
                    <button
                      disabled={postingScore}
                      onClick={postScore}
                      className="bg-c2 text-ink font-bold px-4 py-2.5 sm:col-span-2 disabled:opacity-60 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center justify-center gap-2"
                    >
                      {postingScore && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {postingScore ? 'Saving…' : 'Save score →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['Pos', 'Event', 'Team / Participant', 'School', 'Score', 'Round', ''].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredScores.map((s) => {
                      const medal =
                        s.position === 1 ? '🥇' : s.position === 2 ? '🥈' : s.position === 3 ? '🥉' : ''
                      const posBg =
                        s.position === 1
                          ? 'bg-c2 text-ink'
                          : s.position === 2
                          ? 'bg-bg/30 text-ink'
                          : s.position === 3
                          ? 'bg-[#CD7F32]/40 text-bg'
                          : 'bg-bg/10'
                      return (
                        <motion.tr
                          key={s.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-bg/6 hover:bg-bg/3"
                        >
                          <td className="px-3 py-2.5">
                            <span className={`inline-block ${posBg} px-2 py-1 font-mono text-[11px]`}>
                              {medal} {s.position ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[13px]">{s.event_name}</td>
                          <td className="px-3 py-2.5">
                            <input
                              key={`${s.id}-name-${s.team_name}`}
                              defaultValue={s.team_name}
                              onBlur={(e) => {
                                if (e.target.value !== s.team_name)
                                  updateScoreField(s.id, 'team_name', e.target.value)
                              }}
                              className="bg-transparent border border-transparent hover:border-bg/15 focus:border-c2 px-2 py-1 font-medium outline-none w-full"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-[13px] opacity-80">{s.school}</td>
                          <td className="px-3 py-2.5">
                            <input
                              key={`${s.id}-score-${s.score ?? ''}`}
                              defaultValue={s.score ?? ''}
                              onBlur={(e) => {
                                if (e.target.value !== (s.score ?? ''))
                                  updateScoreField(s.id, 'score', e.target.value)
                              }}
                              className="bg-transparent border border-transparent hover:border-bg/15 focus:border-c2 px-2 py-1 font-mono text-[12px] outline-none w-24"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] opacity-70">{s.round}</td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => deleteScore(s.id)}
                              className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] rounded-full bg-c1/15 border border-c1/30 text-c1 hover:bg-c1/25 active:scale-[0.96] transition-transform duration-150"
                            >
                              Delete
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredScores.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">scores</span>
                  <span className="font-display text-[22px] opacity-40">No scores yet</span>
                  <span className="font-mono text-[11px] opacity-30">Click "+ Add Score" to record results</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VOLUNTEERS */}
        {activeTab === 'volunteers' && (
          <motion.div key="volunteers" {...tabAnim}>
            <div className="px-5 py-3 flex gap-1.5 flex-wrap items-center border-b border-bg/8">
              {(['all', ...VOLUNTEER_STATUSES] as string[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setVolStatusFilter(s)}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] border transition ${
                    volStatusFilter === s
                      ? 'bg-c2 text-ink border-c2'
                      : 'border-bg/20 text-bg opacity-70 hover:opacity-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['#', 'Name', 'Email', 'Phone', 'School', 'Role', 'Available', 'Status', 'Notes'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((v, idx) => {
                    const statusColor =
                      v.status === 'new'
                        ? 'border-c1/50 text-c1'
                        : v.status === 'briefed'
                        ? 'border-c2/50 text-c2'
                        : v.status === 'confirmed'
                        ? 'border-cool/50 text-c3'
                        : v.status === 'attended'
                        ? 'border-c3/50 text-c3'
                        : 'border-bg/30 text-bg opacity-70'
                    return (
                      <tr key={v.id} className="border-b border-bg/6 hover:bg-bg/3">
                        <td className="px-3 py-2.5 font-mono text-[11px] opacity-50">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{v.name}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] opacity-70">{v.email}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] opacity-80">{v.phone}</td>
                        <td className="px-3 py-2.5 text-[13px] opacity-80">{v.school ?? '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px]">{v.role_pref}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] opacity-70">
                          {Array.isArray(v.availability) ? v.availability.join(', ') : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={v.status}
                            onChange={(e) => updateVolunteer(v.id, { status: e.target.value })}
                            className={`bg-transparent border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] outline-none ${statusColor}`}
                          >
                            {VOLUNTEER_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-ink">
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2.5 min-w-[160px]">
                          <input
                            key={`${v.id}-notes-${v.notes ?? ''}`}
                            type="text"
                            defaultValue={v.notes ?? ''}
                            onBlur={(e) => {
                              if ((v.notes ?? '') !== e.target.value)
                                updateVolunteer(v.id, { notes: e.target.value })
                            }}
                            className="w-full bg-transparent border border-bg/15 px-2 py-1 font-mono text-[11px] outline-none focus:border-c2"
                            placeholder="…"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredVolunteers.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">volunteers</span>
                  <span className="font-display text-[22px] opacity-40">No volunteers</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* WINNERS */}
        {activeTab === 'winners' && (
          <motion.div key="winners" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={() => setShowNewWinner((s) => !s)}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                {showNewWinner ? '× Cancel' : '+ Add Winner'}
              </button>
              <select
                value={winnerEventFilter}
                onChange={(e) => setWinnerEventFilter(e.target.value)}
                className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
              >
                <option value="all" className="bg-ink">all events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-ink">{e.name}</option>
                ))}
              </select>
            </div>

            <AnimatePresence>
              {showNewWinner && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-4 border-b border-bg/10 overflow-hidden"
                >
                  <div className="grid gap-3 max-w-3xl grid-cols-1 sm:grid-cols-2">
                    <select
                      value={newWinner.event_id}
                      onChange={(e) => {
                        const ev = events.find((x) => x.id === e.target.value)
                        setNewWinner({
                          ...newWinner,
                          event_id: e.target.value,
                          event_name: ev?.name ?? '',
                        })
                      }}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                    >
                      <option value="" className="bg-ink">— pick event —</option>
                      {events.map((e) => (
                        <option key={e.id} value={e.id} className="bg-ink">{e.name}</option>
                      ))}
                    </select>
                    <select
                      value={newWinner.rank}
                      onChange={(e) => setNewWinner({ ...newWinner, rank: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                    >
                      <option value="1" className="bg-ink">1 — 🥇 Gold</option>
                      <option value="2" className="bg-ink">2 — 🥈 Silver</option>
                      <option value="3" className="bg-ink">3 — 🥉 Bronze</option>
                    </select>
                    <input
                      type="text"
                      placeholder="winner name"
                      value={newWinner.winner_name}
                      onChange={(e) => setNewWinner({ ...newWinner, winner_name: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="text"
                      placeholder="school (optional)"
                      value={newWinner.school}
                      onChange={(e) => setNewWinner({ ...newWinner, school: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="text"
                      placeholder="prize (optional)"
                      value={newWinner.prize}
                      onChange={(e) => setNewWinner({ ...newWinner, prize: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2"
                    />
                    <input
                      type="text"
                      placeholder="photo URL (optional)"
                      value={newWinner.photo_url}
                      onChange={(e) => setNewWinner({ ...newWinner, photo_url: e.target.value })}
                      className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                    />
                    <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-2 border border-bg/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWinner.published}
                        onChange={(e) =>
                          setNewWinner({ ...newWinner, published: e.target.checked })
                        }
                      />
                      publish immediately
                    </label>
                    <button
                      disabled={postingWinner}
                      onClick={postWinner}
                      className="bg-c2 text-ink font-bold px-4 py-2.5 sm:col-span-2 disabled:opacity-60 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center justify-center gap-2"
                    >
                      {postingWinner && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {postingWinner ? 'Saving…' : 'Save winner →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['#', 'Event', 'Rank', 'Winner', 'School', 'Prize', 'Published', ''].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredWinners.map((w, idx) => {
                    const medal = w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : w.rank === 3 ? '🥉' : ''
                    return (
                      <tr key={w.id} className="border-b border-bg/6 hover:bg-bg/3">
                        <td className="px-3 py-2.5 font-mono text-[11px] opacity-50">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-[13px]">{w.event_name}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px]">
                          {medal} {w.rank}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            key={`${w.id}-name-${w.winner_name}`}
                            defaultValue={w.winner_name}
                            onBlur={(e) => {
                              if (e.target.value !== w.winner_name)
                                updateWinner(w.id, { winner_name: e.target.value })
                            }}
                            className="bg-transparent border border-transparent hover:border-bg/15 focus:border-c2 px-2 py-1 font-medium outline-none w-full"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-[13px] opacity-80">{w.school ?? '—'}</td>
                        <td className="px-3 py-2.5 text-[13px] opacity-80">{w.prize ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => toggleWinnerPublished(w.id, !w.published)}
                            className={`font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] border transition-[background-color,color] active:scale-[0.96] ${
                              w.published
                                ? 'bg-c3/20 border-c3/40 text-c3'
                                : 'border-bg/20 text-bg opacity-70'
                            }`}
                          >
                            {w.published ? '✓ live' : 'draft'}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => deleteWinner(w.id)}
                            className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] rounded-full bg-c1/15 border border-c1/30 text-c1 hover:bg-c1/25 active:scale-[0.96] transition-transform duration-150"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredWinners.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">winners</span>
                  <span className="font-display text-[22px] opacity-40">No winners yet</span>
                  <span className="font-mono text-[11px] opacity-30">Click "+ Add Winner" to record them</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* BLOG */}
        {activeTab === 'blog' && (
          <motion.div key="blog" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={() => { setShowNewBlog((s) => !s); setBlogSlugError(null) }}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                {showNewBlog ? '× Cancel' : '+ New Post'}
              </button>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {(['all', ...BLOG_TAGS] as string[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBlogTagFilter(t)}
                    className={`px-2.5 py-1 min-h-[28px] font-mono text-[10px] uppercase tracking-[0.08em] border transition-colors duration-150 ${
                      blogTagFilter === t
                        ? 'bg-c2 text-ink border-c2'
                        : 'border-bg/20 text-bg opacity-70 hover:opacity-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {showNewBlog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-4 border-b border-bg/10 overflow-hidden"
                >
                  <div className="grid gap-3 max-w-3xl">
                    <input
                      type="text"
                      placeholder="title…"
                      value={newBlog.title}
                      onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-base outline-none focus:border-c2"
                    />
                    <div>
                      <input
                        type="text"
                        placeholder="slug (auto from title if blank)"
                        value={newBlog.slug}
                        onChange={(e) => {
                          setBlogSlugError(null)
                          setNewBlog({ ...newBlog, slug: slugify(e.target.value) })
                        }}
                        className={`w-full bg-transparent border text-bg px-3 py-2 font-mono text-[12px] outline-none focus:border-c2 ${blogSlugError ? 'border-hot' : 'border-bg/20'}`}
                      />
                      {blogSlugError && (
                        <div className="font-mono text-[11px] text-c1 mt-1">
                          {blogSlugError}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="excerpt (optional, 1-line)"
                      value={newBlog.excerpt}
                      onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                    />
                    <textarea
                      placeholder="body (markdown ok)…"
                      rows={6}
                      value={newBlog.body}
                      onChange={(e) => setNewBlog({ ...newBlog, body: e.target.value })}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2 resize-y"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="author"
                        value={newBlog.author}
                        onChange={(e) => setNewBlog({ ...newBlog, author: e.target.value })}
                        className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-body text-sm outline-none focus:border-c2 flex-1 min-w-[140px]"
                      />
                      <select
                        value={newBlog.tag}
                        onChange={(e) => setNewBlog({ ...newBlog, tag: e.target.value })}
                        className="bg-bg/8 border border-bg/20 rounded-xl text-bg px-3 py-2.5 font-mono text-[11px] outline-none focus:border-c2 transition-colors"
                      >
                        {BLOG_TAGS.map((t) => (
                          <option key={t} value={t} className="bg-ink">{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-60 mr-1">
                        cover:
                      </span>
                      {COVER_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewBlog({ ...newBlog, cover_color: c })}
                          className={`w-7 h-7 border-2 ${
                            newBlog.cover_color === c ? 'border-c2 scale-110' : 'border-bg/20'
                          } transition-transform`}
                          style={{ background: COVER_COLOR_STYLES[c] }}
                          title={c}
                        />
                      ))}
                      <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] px-3 py-2 border border-bg/20 cursor-pointer ml-auto">
                        <input
                          type="checkbox"
                          checked={newBlog.published}
                          onChange={(e) => setNewBlog({ ...newBlog, published: e.target.checked })}
                        />
                        publish immediately
                      </label>
                    </div>
                    <button
                      disabled={postingBlog}
                      onClick={postBlog}
                      className="bg-c2 text-ink font-bold px-4 py-2.5 self-start disabled:opacity-60 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center gap-2"
                    >
                      {postingBlog && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                      {postingBlog ? 'Posting…' : 'Save post →'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-35 tracking-[0.12em] uppercase border-b border-bg/10">
                    {['#', 'Title', 'Tag', 'Author', 'Views', 'Published', 'Posted', ''].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBlogPosts.map((b, idx) => (
                    <tr key={b.id} className="border-b border-bg/6 hover:bg-bg/3">
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-50">{idx + 1}</td>
                      <td className="px-3 py-2.5 max-w-[300px]">
                        <div className="font-medium truncate">{b.title}</div>
                        <div className="opacity-50 font-mono text-[10px] truncate">{b.slug}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 bg-bg/10">
                          {b.tag}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] opacity-80">{b.author ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-70">{b.views ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleBlogPublished(b.id, !b.published)}
                          className={`font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] border transition-[background-color,color] active:scale-[0.96] ${
                            b.published
                              ? 'bg-c3/20 border-c3/40 text-c3'
                              : 'border-bg/20 text-bg opacity-70'
                          }`}
                        >
                          {b.published ? '✓ live' : 'draft'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] opacity-60">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => deleteBlog(b.id)}
                          className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-2 min-h-[44px] rounded-full bg-c1/15 border border-c1/30 text-c1 hover:bg-c1/25 active:scale-[0.96] transition-transform duration-150"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBlogPosts.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">blog</span>
                  <span className="font-display text-[22px] opacity-40">No posts yet</span>
                  <span className="font-mono text-[11px] opacity-30">Click "+ New Post" to write one</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TEAM */}
        {activeTab === 'team' && (
          <motion.div key="team" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={() => openNewTeamForm('leadership')}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                + New leadership
              </button>
              <button
                onClick={() => openNewTeamForm('department')}
                className="bg-c2 text-ink px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                + New department
              </button>
              <span className="font-mono text-[11px] opacity-50">
                {teamMembers.filter((m) => m.kind === 'leadership').length} leadership ·
                {' '}{teamMembers.filter((m) => m.kind === 'department').length} departments
              </span>
            </div>

            {/* Edit / Create panel */}
            <AnimatePresence>
              {showTeamForm && editingTeam && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-5 border-b border-bg/10 overflow-hidden"
                >
                  <div className="max-w-2xl">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-50 mb-4">
                      {editingTeam.id ? `editing: ${editingTeam.name}` : `new ${editingTeam.kind}`}
                    </div>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">
                          Kind
                        </label>
                        <select
                          value={editingTeam.kind ?? 'department'}
                          onChange={(e) =>
                            setEditingTeam((m) => ({ ...m!, kind: e.target.value as 'leadership' | 'department' }))
                          }
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        >
                          <option value="leadership">Leadership</option>
                          <option value="department">Department</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">
                          {editingTeam.kind === 'leadership' ? 'Person name' : 'Department name'}
                        </label>
                        <input
                          type="text"
                          value={editingTeam.name ?? ''}
                          onChange={(e) => setEditingTeam((m) => ({ ...m!, name: e.target.value }))}
                          placeholder={editingTeam.kind === 'leadership' ? 'Kanishka Gogwal' : 'Logistics'}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">
                          {editingTeam.kind === 'leadership' ? 'Title' : 'Lead(s)'}
                        </label>
                        <input
                          type="text"
                          value={editingTeam.role ?? ''}
                          onChange={(e) => setEditingTeam((m) => ({ ...m!, role: e.target.value }))}
                          placeholder={editingTeam.kind === 'leadership' ? 'Event Director' : 'Hiten · Devanshi'}
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">
                          Sort order
                        </label>
                        <input
                          type="number"
                          value={editingTeam.sort_order ?? 0}
                          onChange={(e) =>
                            setEditingTeam((m) => ({ ...m!, sort_order: parseInt(e.target.value) || 0 }))
                          }
                          className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={saveTeamMember}
                        disabled={savingTeam}
                        className="bg-c2 text-ink px-4 py-2 min-h-[40px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform disabled:opacity-50"
                      >
                        {savingTeam ? 'Saving…' : editingTeam.id ? 'Save changes' : 'Add member'}
                      </button>
                      <button
                        onClick={() => { setShowTeamForm(false); setEditingTeam(null) }}
                        disabled={savingTeam}
                        className="border border-bg/20 text-bg px-4 py-2 min-h-[40px] font-mono text-[11px] tracking-[0.08em] uppercase hover:bg-bg/5 active:scale-[0.96] transition-transform disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Two-column listing: leadership on the left, departments on the right.
                Stacks to one column on narrow viewports. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-5 py-4">
              {(['leadership', 'department'] as const).map((kind) => {
                const rows = teamMembers
                  .filter((m) => m.kind === kind)
                  .sort((a, b) => a.sort_order - b.sort_order)
                return (
                  <div key={kind}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-50 mb-2">
                      {kind === 'leadership' ? 'leadership' : 'departments'} ({rows.length})
                    </div>
                    <div className="space-y-2">
                      {rows.map((m, idx) => (
                        <div
                          key={m.id}
                          className="border border-bg/10 bg-bg/5 px-3 py-2.5 flex items-center gap-3 min-h-[56px]"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-[15px] leading-tight truncate">{m.name}</div>
                            {m.role && (
                              <div className="font-mono text-[10px] opacity-55 truncate">{m.role}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => moveTeamMember(m.id, 'up')}
                              disabled={idx === 0 || movingTeamId !== null}
                              className="w-7 h-7 border border-bg/20 font-mono text-[12px] hover:bg-bg/10 active:scale-[0.96] transition-transform disabled:opacity-25 disabled:cursor-not-allowed"
                              aria-label="Move up"
                            >
                              {movingTeamId === m.id ? '…' : '↑'}
                            </button>
                            <button
                              onClick={() => moveTeamMember(m.id, 'down')}
                              disabled={idx === rows.length - 1 || movingTeamId !== null}
                              className="w-7 h-7 border border-bg/20 font-mono text-[12px] hover:bg-bg/10 active:scale-[0.96] transition-transform disabled:opacity-25 disabled:cursor-not-allowed"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => openEditTeamForm(m)}
                              className="px-2.5 h-7 border border-bg/20 font-mono text-[10px] uppercase tracking-[0.06em] hover:bg-bg/10 active:scale-[0.96] transition-transform"
                            >
                              edit
                            </button>
                            <button
                              onClick={() => deleteTeamMember(m.id, m.name)}
                              className="px-2.5 h-7 border border-c1/40 text-c1 font-mono text-[10px] uppercase tracking-[0.06em] hover:bg-c1/10 active:scale-[0.96] transition-transform"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      {rows.length === 0 && (
                        <div className="border border-dashed border-bg/15 px-3 py-6 text-center font-mono text-[11px] opacity-40">
                          No {kind === 'leadership' ? 'leadership' : 'departments'} yet
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <motion.div key="settings" {...tabAnim}>
            <div className="px-5 py-3 flex gap-2 flex-wrap items-center border-b border-bg/8">
              <button
                onClick={addSettingsKey}
                className="bg-c1 text-white px-3.5 py-2.5 min-h-[44px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
              >
                + Add new key
              </button>
              <span className="font-mono text-[11px] opacity-50">
                {siteSettings.length} keys
              </span>
            </div>

            {/* Inline "add settings key" modal — replaces the old native prompt() */}
            <AnimatePresence>
              {showAddSettingKey && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-bg/4 px-5 py-5 border-b border-bg/10 overflow-hidden"
                >
                  <div className="max-w-md">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-50 mb-4">
                      new settings key
                    </div>
                    <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">
                      Key (snake_case)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. hero_subtitle"
                      value={newSettingKey}
                      autoFocus
                      onChange={(e) => setNewSettingKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitNewSettingKey()
                        if (e.key === 'Escape') setShowAddSettingKey(false)
                      }}
                      className="w-full bg-transparent border border-bg/20 text-bg px-3 py-2 font-body text-sm outline-none focus:border-c2"
                    />
                    <p className="font-mono text-[10px] opacity-40 mt-2">
                      Lowercase letters, digits, and underscores only. The key is permanent.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={submitNewSettingKey}
                        className="bg-c2 text-ink px-4 py-2 min-h-[40px] font-mono text-[11px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform"
                      >
                        Add key
                      </button>
                      <button
                        onClick={() => { setShowAddSettingKey(false); setNewSettingKey('') }}
                        className="border border-bg/20 text-bg px-4 py-2 min-h-[40px] font-mono text-[11px] tracking-[0.08em] uppercase hover:bg-bg/5 active:scale-[0.96] transition-transform"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {siteSettings.map((s) => (
              <SettingRow
                key={s.key}
                setting={s}
                onSave={async (key, value) => {
                  const { error: err } = await supabase
                    .from('paradox_site_settings')
                    .update({ value, updated_at: new Date().toISOString() })
                    .eq('key', key)
                  if (err) {
                    toastError('Save failed', err.message)
                    return { ok: false, error: err.message }
                  }
                  setSiteSettings((list) =>
                    list.map((x) => (x.key === key ? { ...x, value } : x)),
                  )
                  const previewVal =
                    typeof value === 'string' ? value.slice(0, 50) : JSON.stringify(value).slice(0, 50)
                  success('Settings saved', key)
                  logAudit('update_setting', 'setting', key, { value: previewVal })
                  return { ok: true }
                }}
              />
            ))}
            {siteSettings.length === 0 && (
              <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">settings</span>
                <span className="font-display text-[22px] opacity-40">No settings yet</span>
                <span className="font-mono text-[11px] opacity-30">Click "Add new key" to create one</span>
              </div>
            )}
          </motion.div>
        )}

        {/* AUDIT */}
        {activeTab === 'audit' && (
          <motion.div key="audit" {...tabAnim}>
            {/* Filter bar */}
            <div className="px-5 py-3 space-y-2 border-b border-bg/8">
              {/* Action filters */}
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="font-mono text-[9px] uppercase opacity-40 tracking-[0.1em] mr-1">action</span>
                {['all', ...auditActions].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAuditActionFilter(a)}
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] border transition ${
                      auditActionFilter === a
                        ? 'bg-c2 text-ink border-c2'
                        : 'border-bg/20 text-bg opacity-60 hover:opacity-100'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {/* Resource filters */}
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="font-mono text-[9px] uppercase opacity-40 tracking-[0.1em] mr-1">resource</span>
                {['all', ...auditResources].map((r) => (
                  <button
                    key={r}
                    onClick={() => setAuditResourceFilter(r)}
                    className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] border transition ${
                      auditResourceFilter === r
                        ? 'bg-c3 text-white border-cool'
                        : 'border-bg/20 text-bg opacity-60 hover:opacity-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {/* Summary + export */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[10px] opacity-40">
                  {filteredAudit.length} {filteredAudit.length === 1 ? 'entry' : 'entries'}
                  {filteredAudit.length !== auditLog.length && ` of ${auditLog.length} total`}
                </span>
                <button
                  onClick={() => {
                    const headers = ['When', 'Who', 'Action', 'Resource', 'Resource ID', 'Details']
                    const csv = [
                      headers.join(','),
                      ...filteredAudit.map((a) => [
                        new Date(a.created_at).toISOString(),
                        `"${a.actor_email ?? ''}"`,
                        a.action,
                        a.resource ?? '',
                        a.resource_id ?? '',
                        `"${a.details ? JSON.stringify(a.details).replace(/"/g, '""') : ''}"`,
                      ].join(','))
                    ].join('\n')
                    const el = document.createElement('a')
                    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                    el.download = `paradox-audit-${Date.now()}.csv`
                    el.click()
                  }}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] px-3 py-1 border border-bg/20 text-bg opacity-60 hover:opacity-100 transition"
                >
                  Export CSV ↓
                </button>
              </div>
            </div>

            {/* Log table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="sticky top-0 bg-ink z-10">
                  <tr className="font-mono text-[10px] opacity-40 tracking-[0.1em] uppercase border-b border-bg/12">
                    <th className="text-left px-4 py-2.5 font-normal w-[130px]">When</th>
                    <th className="text-left px-4 py-2.5 font-normal">Who</th>
                    <th className="text-left px-4 py-2.5 font-normal">Action</th>
                    <th className="text-left px-4 py-2.5 font-normal">Resource</th>
                    <th className="text-left px-4 py-2.5 font-normal">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((a) => {
                    const isExpanded = auditExpanded === a.id
                    const actionColor = a.action.startsWith('delete') || a.action.startsWith('remove')
                      ? 'bg-c1/20 text-c1 border border-c1/30'
                      : a.action.startsWith('post') || a.action.startsWith('add') || a.action.startsWith('create')
                      ? 'bg-c3/20 text-c3 border border-c3/30'
                      : a.action.startsWith('mark') || a.action.startsWith('publish') || a.action.startsWith('pin') || a.action.startsWith('update') || a.action.startsWith('edit')
                      ? 'bg-c3/20 text-c3 border border-cool/30'
                      : a.action === 'session_start'
                      ? 'bg-c2/20 text-c2 border border-c2/30'
                      : a.action.startsWith('export')
                      ? 'bg-bg/10 text-bg/60 border border-bg/20'
                      : 'bg-bg/10 text-bg/70 border border-bg/20'
                    return (
                      <React.Fragment key={a.id}>
                        <tr
                          onClick={() => setAuditExpanded(isExpanded ? null : a.id)}
                          className="border-b border-bg/6 hover:bg-bg/5 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2.5 font-mono text-[10px] opacity-55 whitespace-nowrap" title={new Date(a.created_at).toLocaleString()}>
                            {timeAgo(a.created_at)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] opacity-75 max-w-[160px] truncate">
                            {a.actor_email ?? <span className="opacity-30">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`font-mono text-[10px] uppercase tracking-[0.06em] px-1.5 py-0.5 ${actionColor}`}>
                              {a.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px]">
                            <span className="opacity-70">{a.resource ?? '—'}</span>
                            {a.resource_id && a.resource_id !== 'bulk' && (
                              <span className="opacity-35 ml-1">· {String(a.resource_id).slice(0, 14)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[10px] opacity-45 max-w-[280px] truncate">
                            {a.details ? JSON.stringify(a.details) : '—'}
                          </td>
                        </tr>
                        {isExpanded && a.details && (
                          <tr className="bg-bg/5 border-b border-bg/6">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="font-mono text-[10px] opacity-50 uppercase tracking-[0.08em] mb-1">full details</div>
                              <pre className="font-mono text-[11px] text-bg/80 whitespace-pre-wrap break-all bg-bg/5 px-3 py-2 border border-bg/10">
                                {JSON.stringify(a.details, null, 2)}
                              </pre>
                              <div className="font-mono text-[10px] opacity-35 mt-1.5">
                                {new Date(a.created_at).toLocaleString()} · ID: {a.id}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {filteredAudit.length === 0 && (
                <div className="px-5 py-16 text-center flex flex-col items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-35">audit log</span>
                  <span className="font-display text-[22px] opacity-40">No entries match</span>
                  <span className="font-mono text-[11px] opacity-30">Try clearing the filters</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══ ACCOUNTS TAB (super admin only) ══ */}
        {activeTab === 'accounts' && isSuperAdmin && (
          <motion.div key="accounts" {...tabAnim} className="px-5 py-5 max-w-5xl mx-auto w-full space-y-8">

            {/* ── Live sessions ── */}
            <section>
              <h2 className="font-display text-[22px] leading-tight text-balance mb-3">
                Active sessions
              </h2>
              <div className="border border-bg/15 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="sticky top-0 bg-ink z-10">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-40 border-b border-bg/12">
                      {['Who', 'Browser', 'OS', 'Started', 'Last seen', 'Status', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-2 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminSessions.map((s) => {
                      const isMe = s.id === currentSessionId
                      return (
                        <tr key={s.id} className={`border-b border-bg/8 ${isMe ? 'bg-c2/10' : 'hover:bg-bg/5'}`}>
                          <td className="px-4 py-2.5 font-mono text-[11px]">
                            {s.user_email}
                            {isMe && <span className="ml-1.5 font-mono text-[9px] bg-c2 text-ink px-1 py-0.5">you</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] opacity-70">{s.browser ?? '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-[11px] opacity-70">{s.os ?? '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] opacity-55 whitespace-nowrap">{timeAgo(s.created_at)}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px] opacity-55 whitespace-nowrap">{timeAgo(s.last_seen_at)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${s.is_active ? 'bg-c3/20 text-c3' : 'bg-bg/10 opacity-40 text-bg'}`}>
                              {s.is_active ? 'active' : 'ended'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {s.is_active && !isMe && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Revoke ${s.user_email}'s session?`)) return
                                  await supabase.from('paradox_admin_sessions')
                                    .update({ is_active: false, ended_at: new Date().toISOString() })
                                    .eq('id', s.id)
                                  setAdminSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: false } : x))
                                  logAudit('revoke_session', 'session', s.id, { user: s.user_email })
                                }}
                                className="font-mono text-[10px] text-c1 hover:underline min-h-[44px] px-2"
                              >
                                revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {adminSessions.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center font-mono text-[11px] opacity-40">No session records yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Admin users & permissions ── */}
            <section>
              <h2 className="font-display text-[22px] leading-tight text-balance mb-3">
                Admin accounts & permissions
              </h2>
              <div className="border border-bg/15 overflow-x-auto mb-4">
                <table className="w-full min-w-[900px]">
                  <thead className="sticky top-0 bg-ink z-10">
                    <tr className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-40 border-b border-bg/12">
                      <th className="text-left px-4 py-2 font-normal w-[220px]">Account</th>
                      <th className="text-left px-4 py-2 font-normal w-[100px]">Last login</th>
                      <th className="text-left px-3 py-2 font-normal w-[140px]">Role</th>
                      {(Object.keys(TAB_LABELS) as TabKey[]).filter(t => t !== 'accounts').map((t) => (
                        <th
                          key={t}
                          className="text-center px-1.5 py-2 font-normal text-[10px] whitespace-nowrap"
                          title={TAB_LABELS[t]}
                        >
                          {TAB_SHORT[t]}
                        </th>
                      ))}
                      <th className="text-left px-4 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Merge auth users with permissions rows — show every auth user */}
                    {authUsers.map((au) => {
                      const permsRow = adminUsers.find((u) => u.user_email === au.email)
                      const isSA = au.email === SUPER_ADMIN
                      const isActive = permsRow?.is_active ?? false
                      const hasPerms = !!permsRow
                      const activeSessions = adminSessions.filter((s) => s.user_email === au.email && s.is_active)
                      return (
                        <tr key={au.id} className={`border-b border-bg/8 ${isSA ? '' : 'hover:bg-bg/5'} transition-colors`}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {activeSessions.length > 0 && (
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-c1 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-c1" />
                                </span>
                              )}
                              <div>
                                <div className="font-mono text-[11px]">{au.email}</div>
                                {permsRow?.display_name && <div className="font-mono text-[10px] opacity-40">{permsRow.display_name}</div>}
                                {isSA && <div className="font-mono text-[9px] text-c2">super admin</div>}
                                {!hasPerms && <div className="font-mono text-[9px] text-c1/70">no permissions row</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[10px] opacity-50">
                            {au.last_sign_in_at ? timeAgo(au.last_sign_in_at) : '—'}
                          </td>
                          {/* Role picker — applies a preset bundle to the
                              permissions JSONB in one click. Super admin row is
                              locked to "Super Director" since their access is
                              gated by email, not the picker. */}
                          <td className="px-3 py-2.5">
                            {isSA ? (
                              <span className="inline-flex px-2 py-1 border border-c2/40 text-c2 font-mono text-[9px] uppercase tracking-[0.08em]">
                                Super Director
                              </span>
                            ) : !hasPerms ? (
                              <span className="opacity-25 font-mono text-[10px]">—</span>
                            ) : (
                              <select
                                value={permsRow!.role ?? 'coordinator'}
                                onChange={async (e) => {
                                  const newRole = e.target.value as RoleName
                                  if (!confirm(`Apply preset "${ROLE_LABELS[newRole]}" to ${au.email}? This overwrites their current permissions.`)) {
                                    return
                                  }
                                  await applyRolePreset(au.email, newRole)
                                }}
                                className="bg-bg/6 border border-bg/20 font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-1 outline-none focus:border-c2"
                              >
                                {(Object.keys(ROLE_LABELS) as RoleName[]).map((r) => (
                                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          {(Object.keys(TAB_LABELS) as TabKey[]).filter(t => t !== 'accounts').map((t) => (
                            <td key={t} className="text-center px-1.5 py-2.5">
                              {isSA ? (
                                <span className="font-mono text-[10px] text-c2">✓</span>
                              ) : !hasPerms ? (
                                <span className="opacity-20 text-[10px]">—</span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={permsRow!.permissions?.[t] ?? false}
                                  onChange={async (e) => {
                                    const updated = { ...permsRow!.permissions, [t]: e.target.checked }
                                    const { error: permsErr } = await supabase.from('paradox_admin_permissions')
                                      .update({ permissions: updated })
                                      .eq('user_email', au.email)
                                    if (permsErr) { toastError('Update failed', permsErr.message); return }
                                    // Realtime will update state — but also update optimistically
                                    setAdminUsers((prev) => prev.map((x) => x.user_email === au.email ? { ...x, permissions: updated } : x))
                                    info('Permissions updated', `${au.email} · ${TAB_LABELS[t]}`)
                                    logAudit('update_permission', 'account', au.email, { tab: t, value: e.target.checked })
                                  }}
                                  className="w-3.5 h-3.5 accent-acid cursor-pointer"
                                />
                              )}
                            </td>
                          ))}
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-1">
                              {!hasPerms ? (
                                <button
                                  onClick={async () => {
                                    // Grant uses the 'coordinator' preset by default —
                                    // a sensible operational baseline that the super
                                    // admin can refine afterwards via the role picker
                                    // or per-tab checkboxes.
                                    const { data, error: grantErr } = await supabase.from('paradox_admin_permissions').insert({
                                      user_email: au.email,
                                      display_name: null,
                                      created_by: session?.user?.email,
                                      role: 'coordinator',
                                      permissions: ROLE_PRESETS.coordinator,
                                      is_active: true,
                                    }).select('*').single()
                                    if (grantErr) { toastError('Grant failed', grantErr.message); return }
                                    if (data) setAdminUsers((p) => [...p, data as AdminUser])
                                    success('Access granted', `${au.email} → Coordinator`)
                                    logAudit('grant_access', 'account', au.email, { role: 'coordinator' })
                                  }}
                                  className="font-mono text-[10px] px-2 py-0.5 border border-c3/40 text-c3 hover:brightness-125"
                                >
                                  grant access
                                </button>
                              ) : isSA ? (
                                <span className="font-mono text-[9px] opacity-30">locked</span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    const next = !isActive
                                    await supabase.from('paradox_admin_permissions')
                                      .update({ is_active: next })
                                      .eq('user_email', au.email)
                                    setAdminUsers((prev) => prev.map((x) => x.user_email === au.email ? { ...x, is_active: next } : x))
                                    logAudit(next ? 'enable_account' : 'disable_account', 'account', au.email)
                                  }}
                                  className={`font-mono text-[10px] px-2 py-0.5 border ${isActive ? 'border-bg/20 opacity-60 hover:text-c1' : 'border-c3/40 text-c3'}`}
                                >
                                  {isActive ? 'disable' : 'enable'}
                                </button>
                              )}
                              {activeSessions.length > 0 && (
                                <span className="font-mono text-[9px] text-c3">{activeSessions.length} online</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Create new account ── */}
              <div className="border border-bg/15 p-5">
                <h3 className="font-display text-[18px] tracking-tightest mb-4">Create new admin account</h3>
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Email</label>
                    <input
                      type="email"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      placeholder="staff@aquaterra.org"
                      className="w-full bg-bg/6 border border-bg/20 px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Display name</label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="w-full bg-bg/6 border border-bg/20 px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase opacity-55 block mb-1">Password</label>
                    <input
                      type="password"
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      placeholder="min 6 characters"
                      className="w-full bg-bg/6 border border-bg/20 px-3 py-2 font-mono text-[12px] outline-none focus:border-c2"
                    />
                  </div>
                </div>

                {/* Permission toggles */}
                {/* Role preset picker — clicking a role applies a bundle of
                    permission booleans to the checkbox row below. The admin can
                    still fine-tune individual checkboxes afterwards. */}
                <div className="mb-4">
                  <div className="font-mono text-[10px] uppercase opacity-55 mb-2">Role preset</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(ROLE_LABELS) as RoleName[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setNewAccountRole(r)
                          setNewAccountPerms(ROLE_PRESETS[r])
                        }}
                        className={`flex flex-col items-start gap-0.5 px-3 py-2 border cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] transition-colors text-left active:scale-[0.97] ${
                          newAccountRole === r
                            ? 'border-c2 text-c2 bg-c2/10'
                            : 'border-bg/20 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className="font-semibold tracking-[0.08em]">{ROLE_LABELS[r]}</span>
                        <span className="font-mono text-[9px] tracking-normal normal-case opacity-70 max-w-[180px]">
                          {ROLE_DESCRIPTIONS[r]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-mono text-[10px] uppercase opacity-55 mb-2">
                    Permissions <span className="opacity-50">(fine-tune individual tabs)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TAB_LABELS) as TabKey[]).filter(t => t !== 'accounts').map((t) => (
                      <label key={t} className={`flex items-center gap-1.5 px-2.5 py-1.5 border cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] transition-colors ${
                        newAccountPerms[t] ? 'border-c2 text-c2 bg-c2/10' : 'border-bg/20 opacity-50 hover:opacity-80'
                      }`}>
                        <input
                          type="checkbox"
                          checked={newAccountPerms[t]}
                          onChange={(e) => setNewAccountPerms((p) => ({ ...p, [t]: e.target.checked }))}
                          className="w-3 h-3 accent-acid"
                        />
                        {TAB_LABELS[t]}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  disabled={creatingAccount || !newAccountEmail || !newAccountPassword}
                  onClick={async () => {
                    if (!newAccountEmail || newAccountPassword.length < 6) {
                      warning('Invalid input', 'Email required and password must be at least 6 characters')
                      return
                    }
                    setCreatingAccount(true)
                    try {
                      // Step 1: Create auth user via secure DB function (SECURITY DEFINER)
                      const { data: rpcResult, error: rpcErr } = await supabase.rpc('create_auth_user', {
                        p_email: newAccountEmail,
                        p_password: newAccountPassword,
                      })
                      if (rpcErr || rpcResult?.error) {
                        toastError('Creation failed', rpcResult?.error ?? rpcErr?.message)
                        setCreatingAccount(false)
                        return
                      }
                      // Step 2: Insert permissions row — if this fails, we delete the auth user
                      // (via delete_auth_user RPC) to avoid an orphan auth.users row sitting around
                      // with no admin permissions row. Without this rollback the email would be
                      // unusable (unique constraint) until a super admin cleans it up manually.
                      const { data: newPermsRow, error: permsErr } = await supabase
                        .from('paradox_admin_permissions')
                        .insert({
                          user_email: newAccountEmail,
                          display_name: newAccountName || null,
                          created_by: session?.user?.email,
                          role: newAccountRole,
                          permissions: newAccountPerms,
                          is_active: true,
                        }).select('*').single()
                      if (permsErr) {
                        // Try to roll back the auth.users insert from step 1.
                        const { data: delResult, error: delErr } = await supabase.rpc('delete_auth_user', {
                          p_user_id: rpcResult.id,
                        })
                        if (delErr || delResult?.error) {
                          // Best-effort: surface both failures so a super admin can clean up manually.
                          toastError(
                            'Creation failed (orphan!)',
                            `Permissions error: ${permsErr.message}. Cleanup also failed: ${delResult?.error ?? delErr?.message}. Delete ${newAccountEmail} manually from auth.users.`,
                          )
                        } else {
                          toastError('Creation failed', `Permissions insert failed (${permsErr.message}). Auth user rolled back — safe to retry.`)
                        }
                        setCreatingAccount(false)
                        return
                      }
                      if (newPermsRow) setAdminUsers((p) => [...p, newPermsRow as AdminUser])
                      // Step 3: Add to auth users view list
                      setAuthUsers((p) => [...p, { id: rpcResult.id, email: newAccountEmail, created_at: new Date().toISOString(), last_sign_in_at: null }])
                      success('Account created', newAccountEmail)
                      logAudit('create_account', 'account', rpcResult.id, { email: newAccountEmail, name: newAccountName })
                      setNewAccountEmail('')
                      setNewAccountName('')
                      setNewAccountPassword('')
                      setNewAccountRole('coordinator')
                      setNewAccountPerms(ROLE_PRESETS.coordinator)
                    } catch (e) {
                      toastError('Creation failed', (e as Error).message)
                    }
                    setCreatingAccount(false)
                  }}
                  className="bg-c1 text-white px-5 py-2.5 min-h-[40px] font-mono text-[11px] uppercase tracking-[0.08em] disabled:opacity-40 hover:brightness-110 active:scale-[0.96] transition-transform flex items-center gap-2"
                >
                  {creatingAccount && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {creatingAccount ? 'Creating…' : 'Create Account →'}
                </button>
              </div>
            </section>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ─── Barcode scanner overlay ───────────────────────────────────────────────
function BarcodeScannerOverlay({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const stop = useCallback(() => {
    readerRef.current?.reset()
    readerRef.current = null
  }, [])

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) {
          setError('No camera found on this device.')
          return
        }
        // Prefer back camera on mobile
        const back = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('environment')
        )
        const deviceId = back?.deviceId ?? devices[0].deviceId

        reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (result) {
            const text = result.getText()
            setLastResult(text)
            setScanning(false)
            // Brief flash then hand off
            setTimeout(() => onScan(text), 400)
          }
          if (err && !(err.message?.includes('No MultiFormat'))) {
            // Suppress normal "no barcode found" errors — they fire constantly
          }
        })
      })
      .catch(() => setError('Camera permission denied. Allow camera access and try again.'))

    return () => { stop() }
  }, [onScan, stop])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-ink/95 flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="font-mono text-[10px] text-bg/50 uppercase tracking-[0.14em]">check-in scanner</div>
            <div className="font-display font-semibold text-[24px] text-bg leading-tight mt-0.5">
              point at barcode
            </div>
          </div>
          <button
            onClick={() => { stop(); onClose() }}
            className="w-9 h-9 rounded-full border border-bg/30 text-bg flex items-center justify-center font-mono text-sm hover:border-bg/60"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-[3/2] bg-black border-[1.5px] border-bg/20 overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Corner brackets */}
          {!lastResult && scanning && (
            <>
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-c2" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-c2" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-c2" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-c2" />
              {/* Scanning line */}
              <motion.div
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-4 right-4 h-[1.5px] bg-c2/70"
              />
            </>
          )}

          {/* Success flash */}
          {lastResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-c2/30 flex items-center justify-center"
            >
              <div className="bg-c2 text-ink px-4 py-2 font-mono text-[13px] font-bold">
                ✓ {lastResult}
              </div>
            </motion.div>
          )}
        </div>

        {error ? (
          <div className="mt-4 font-mono text-[12px] text-c1 text-center">{error}</div>
        ) : (
          <div className="mt-3 font-mono text-[11px] text-bg/40 text-center">
            {lastResult ? 'found — loading…' : 'align the barcode within the frame'}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Settings row ──────────────────────────────────────────────────────────
// One row per site setting. Holds local draft state so the user can type
// without auto-firing a save on every keystroke or blur (the previous
// `defaultValue` + `onBlur` pattern silently saved on focus change and was
// what the user described as the "old apply way"). Now: explicit Apply button,
// visible dirty indicator, Reset to discard. BOOL and SELECT keys still save
// instantly because there's no draft to commit.
type SettingItem = { key: string; value: any; updated_at?: string }
type SaveResult = { ok: boolean; error?: string }

function SettingRow({
  setting,
  onSave,
}: {
  setting: SettingItem
  onSave: (key: string, value: any) => Promise<SaveResult>
}) {
  const TEXT_KEYS = [
    'event_dates', 'upi_qr_url', 'afterparty_price_phase1',
    'afterparty_price_phase2', 'afterparty_price_door',
    'afterparty_venue', 'afterparty_date', 'afterparty_dresscode',
    'hero_countdown_target',
  ]
  const MONO_TEXT_KEYS = ['upi_id']
  const SELECT_KEYS = ['site_phase']
  const BOOL_KEYS = ['registration_open']
  const TEXTAREA_KEYS = ['whatsapp_payment_msg']

  const initialDisplay =
    typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)
  const initialJson =
    typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2)

  // Draft state per row. Resets whenever the parent feeds us a new `setting`
  // (e.g. after a successful save, or when realtime delivers a new row).
  const [draft, setDraft] = useState<string>(initialDisplay)
  const [jsonDraft, setJsonDraft] = useState<string>(initialJson)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(initialDisplay)
    setJsonDraft(initialJson)
  }, [initialDisplay, initialJson])

  const inputClass =
    'w-full bg-bg/8 border border-bg/20 rounded-lg text-bg font-body text-[13px] px-3 py-2.5 outline-none focus:border-c2 focus:ring-1 focus:ring-c2/30 transition-[border-color,box-shadow]'

  const labelEl = (hint?: string, dirty?: boolean) => (
    <div className="flex items-center gap-3 mb-2">
      <span className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-70">
        {setting.key}
      </span>
      {hint && (
        <span className="font-mono text-[9px] tracking-[0.08em] uppercase opacity-35 border border-bg/20 px-1.5 py-0.5">
          {hint}
        </span>
      )}
      {dirty && (
        <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-c2 border border-c2/40 px-1.5 py-0.5">
          unsaved
        </span>
      )}
    </div>
  )

  // Reusable apply / reset row for text-style inputs.
  const ApplyRow = ({
    currentDraft,
    parsedValue,
    onReset,
  }: {
    currentDraft: string
    parsedValue: any
    onReset: () => void
  }) => {
    const dirty = currentDraft !== initialDisplay && currentDraft !== initialJson
    if (!dirty) return null
    return (
      <div className="flex gap-2 mt-2">
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            await onSave(setting.key, parsedValue)
            setSaving(false)
          }}
          className="bg-c2 text-ink px-3 py-1.5 min-h-[36px] font-mono text-[10px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Apply'}
        </button>
        <button
          disabled={saving}
          onClick={onReset}
          className="border border-bg/20 text-bg px-3 py-1.5 min-h-[36px] font-mono text-[10px] tracking-[0.08em] uppercase hover:bg-bg/5 active:scale-[0.96] transition-transform disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    )
  }

  // ── Boolean toggle — saves instantly ──
  if (BOOL_KEYS.includes(setting.key)) {
    const isOpen = setting.value === true || setting.value === 'true'
    return (
      <div className="border-b border-bg/10 px-5 py-4">
        {labelEl('toggle')}
        <button
          disabled={saving}
          onClick={async () => {
            setSaving(true)
            await onSave(setting.key, !isOpen)
            setSaving(false)
          }}
          className={`inline-flex items-center gap-2.5 px-4 py-2 font-mono text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors border ${
            isOpen
              ? 'bg-c2/20 border-c2 text-c2'
              : 'bg-c1/20 border-c1 text-c1'
          } disabled:opacity-50`}
        >
          <span className={`w-3 h-3 rounded-full ${isOpen ? 'bg-c2' : 'bg-c1'}`} />
          {isOpen ? 'Open' : 'Closed'}
        </button>
        <div className="font-mono text-[10px] opacity-40 mt-1.5">
          Click to toggle — saves immediately
        </div>
      </div>
    )
  }

  // ── Select — saves instantly ──
  if (SELECT_KEYS.includes(setting.key)) {
    return (
      <div className="border-b border-bg/10 px-5 py-4">
        {labelEl('select')}
        <select
          value={initialDisplay}
          disabled={saving}
          onChange={async (e) => {
            setSaving(true)
            await onSave(setting.key, e.target.value)
            setSaving(false)
          }}
          className={inputClass + ' cursor-pointer bg-ink disabled:opacity-50'}
        >
          <option value="pre_event">pre_event</option>
          <option value="live">live</option>
          <option value="post_event">post_event</option>
        </select>
        <div className="font-mono text-[10px] opacity-40 mt-1">
          Controls phase-gated nav and feature visibility
        </div>
      </div>
    )
  }

  // ── Textarea (multi-line) — explicit Apply ──
  if (TEXTAREA_KEYS.includes(setting.key)) {
    const dirty = draft !== initialDisplay
    return (
      <div className="border-b border-bg/10 px-5 py-4">
        {labelEl('textarea', dirty)}
        <textarea
          value={draft}
          rows={4}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass + ' resize-y'}
        />
        <ApplyRow
          currentDraft={draft}
          parsedValue={draft}
          onReset={() => setDraft(initialDisplay)}
        />
      </div>
    )
  }

  // ── Mono text — explicit Apply ──
  if (MONO_TEXT_KEYS.includes(setting.key)) {
    const dirty = draft !== initialDisplay
    return (
      <div className="border-b border-bg/10 px-5 py-4">
        {labelEl('text · mono', dirty)}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass + ' font-mono tracking-wider'}
        />
        <ApplyRow
          currentDraft={draft}
          parsedValue={draft}
          onReset={() => setDraft(initialDisplay)}
        />
      </div>
    )
  }

  // ── Plain text — explicit Apply ──
  if (TEXT_KEYS.includes(setting.key)) {
    const hint =
      setting.key === 'upi_qr_url'
        ? 'url'
        : setting.key === 'hero_countdown_target'
        ? 'ISO date'
        : 'text'
    const dirty = draft !== initialDisplay
    return (
      <div className="border-b border-bg/10 px-5 py-4">
        {labelEl(hint, dirty)}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
        <ApplyRow
          currentDraft={draft}
          parsedValue={draft}
          onReset={() => setDraft(initialDisplay)}
        />
      </div>
    )
  }

  // ── Raw JSON fallback — parses on Apply ──
  const dirty = jsonDraft !== initialJson
  const lineCount = jsonDraft.split('\n').length + 4
  let parseError: string | null = null
  let parsed: any = null
  if (dirty) {
    try {
      parsed = JSON.parse(jsonDraft)
    } catch (err) {
      parseError = (err as Error).message
    }
  }
  return (
    <div className="border-b border-bg/10 px-5 py-4">
      {labelEl('raw json', dirty)}
      <textarea
        value={jsonDraft}
        rows={Math.min(12, lineCount)}
        onChange={(e) => setJsonDraft(e.target.value)}
        className="w-full bg-bg/5 border border-bg/20 text-bg font-mono text-[12px] p-3 outline-none focus:border-c2 resize-y"
      />
      {parseError && (
        <div className="font-mono text-[10px] text-c1 mt-1">Invalid JSON: {parseError}</div>
      )}
      {dirty && (
        <div className="flex gap-2 mt-2">
          <button
            disabled={saving || !!parseError}
            onClick={async () => {
              if (parseError) return
              setSaving(true)
              await onSave(setting.key, parsed)
              setSaving(false)
            }}
            className="bg-c2 text-ink px-3 py-1.5 min-h-[36px] font-mono text-[10px] tracking-[0.08em] uppercase hover:brightness-110 active:scale-[0.96] transition-transform disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Apply'}
          </button>
          <button
            disabled={saving}
            onClick={() => setJsonDraft(initialJson)}
            className="border border-bg/20 text-bg px-3 py-1.5 min-h-[36px] font-mono text-[10px] tracking-[0.08em] uppercase hover:bg-bg/5 active:scale-[0.96] transition-transform disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
