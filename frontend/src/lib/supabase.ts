import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://nurtpdbqfizmqtztmiwk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cnRwZGJxZml6bXF0enRtaXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjE1NDQsImV4cCI6MjA5MTAzNzU0NH0.v-clxVi6B-tqQz8508ic4DwwQVPH0cUjhZJjtkdKwYA',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
)

export interface WelfareProject {
  id: number
  slug: string
  is_draft: boolean
  header: string
  featured: boolean
  location: string | null
  key_statistic: string | null
  workshop_date: string | null
  objective: string | null
  short_summary: string | null
  long_writeup: string | null
  collab_name: string | null
  collab_logo: string | null
  image_1: string | null; image_1_alt: string | null; label_1: string | null
  image_2: string | null; image_2_alt: string | null; label_2: string | null
  image_3: string | null; image_3_alt: string | null; label_3: string | null
  image_4: string | null; image_4_alt: string | null; label_4: string | null
  volunteers: number | null
  instagram_link: string | null
  main_image: string | null
  main_image_alt: string | null
  google_drive_link: string | null
}

export interface Blog {
  id: number
  slug: string
  headliner: string
  featured_image: string | null
  featured_image_alt: string | null
  written_by: string | null
  published_date: string | null
  minutes_of_read: number | null
  body: string | null
  author_url: string | null
  author_instagram: string | null
}

export const normalizeObj = (o: string | null): string => {
  if (!o) return 'Others'
  const map: Record<string, string> = {
    'feeding dogs': 'Feeding Dogs', 'workshop': 'Workshop',
    'distribution drive': 'Distribution Drive', 'plantation drive': 'Plantation Drive',
    'fundraising event': 'Fundraising Event', 'sundarbans relief': 'Sundarbans Relief',
    'old age home visit': 'Old Age Home Visit',
  }
  const t = o.trim()
  return map[t.toLowerCase()] ?? t.replace(/\b\w/g, l => l.toUpperCase())
}

export const OBJ_COLORS: Record<string, string> = {
  'Workshop':           '#3e8bc2',
  'Feeding Dogs':       '#e08c3c',
  'Plantation Drive':   '#255c3b',
  'Distribution Drive': '#7c4dbc',
  'Sundarbans Relief':  '#1a6b6b',
  'Old Age Home Visit': '#b04060',
  'Fundraising Event':  '#cc3333',
  'Others':             '#666666',
}

export const DEPT_COLORS: Record<string, string> = {
  welfare:    '#3a7d5a',
  events:     '#d4620a',
  labs:       '#7c4dbc',
  operations: '#1a6b7a',
  ops:        '#1a6b7a',
  content:    '#b8402a',
  all:        '#2a9d6e',
}

export const relativeDate = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
