import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase community environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
}

export const supabaseCommunity = createClient<Database>(supabaseUrl, supabaseAnonKey)
