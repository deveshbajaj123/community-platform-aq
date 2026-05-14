// @ts-nocheck
export type Event = {
  id: string
  name: string
  slug: string
  date: string | null
  time: string | null
  venue: string | null
  fee: string | null
  category: string | null
  description: string | null
  rules: string | null
  prize: string | null
  team_size: string | null
  team_format: 'solo' | 'pair' | 'small_team' | 'large_team' | null
  min_team_size: number | null
  max_team_size: number | null
  has_sub: boolean | null
  max_participants: number | null
  active: boolean
  sort_order: number
}

export type Registration = {
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
}

export type Update = {
  id: string
  title: string
  body: string
  event_name: string | null
  tag: 'announcement' | 'score' | 'winner' | 'reminder' | 'venue_change' | string
  pinned: boolean
  created_at: string
}

export type Inquiry = {
  id: string
  company: string
  contact: string
  phone: string
  email: string
  tier: string | null
  message: string | null
  status: 'new' | 'contacted' | 'closed' | string
  notes: string | null
  created_at: string
}

export type Score = {
  id: string
  event_id: string
  event_name: string
  team_name: string
  school: string
  score: string | null
  position: number | null
  round: string
  notes: string | null
  created_at: string
}

export type Volunteer = {
  id: string
  name: string
  email: string
  phone: string
  school: string | null
  role_pref: string
  availability: string[]
  skills: string | null
  referral: string | null
  status: string
  notes: string | null
  created_at: string
}

export type Winner = {
  id: string
  event_id: string
  event_name: string
  rank: number
  winner_name: string
  school: string | null
  prize: string | null
  photo_url: string | null
  published: boolean
  published_at: string | null
  created_at: string
}

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  author: string | null
  tag: string
  cover_color: string | null
  published: boolean
  published_at: string | null
  views: number
  created_at: string
  updated_at: string
}

export type ContactMessage = {
  id: string
  name: string
  email: string
  message: string
  inquiry_type: string
  status: string
  notes: string | null
  created_at: string
}

export type TeamMember = {
  id: string
  kind: 'leadership' | 'department'
  // For leadership rows this is the person's name. For department rows this is
  // the department name (e.g. "Design", "Logistics").
  name: string
  // For leadership rows: their title (e.g. "Event Director"). For department
  // rows: the lead names (e.g. "Yutika" or "Hiten · Devanshi").
  role: string | null
  sort_order: number
  photo_url: string | null
  created_at: string
  updated_at: string
}

export type AuditEntry = {
  id: string
  actor_email: string | null
  action: string
  resource: string | null
  resource_id: string | null
  details: unknown
  created_at: string
}

export type Palette = typeof PALETTE
export const PALETTE = {
  bg:   '#FBF5E6',
  ink:  '#181818',
  c1:   '#FF4338',
  c2:   '#FFD23F',
  c3:   '#B79CED',
  c4:   '#B79CED',
  // aliases kept for backward compat
  hot:  '#FF4338',
  acid: '#FFD23F',
  cool: '#B79CED',
} as const
