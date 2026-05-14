#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hzowuwffjqtgszecngpe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b3d1d2ZmanF0Z3N6ZWNuZ3BlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk5MTMyMSwiZXhwIjoyMDkzNTY3MzIxfQ.qrS3mxzjRogDeHG5J0PcKZiHqU22ttLsMgk_Z05bwuY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrations = [
  {
    name: 'Create volunteer_applications table',
    sql: `
CREATE TABLE IF NOT EXISTS public.volunteer_applications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  college TEXT,
  year_of_study TEXT,
  interests TEXT[] DEFAULT '{}',
  availability TEXT,
  why_aquaterra TEXT NOT NULL,
  previous_experience TEXT,
  instagram_handle TEXT,
  reviewed BOOLEAN,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS volunteer_applications_email_idx ON public.volunteer_applications(email);
CREATE INDEX IF NOT EXISTS volunteer_applications_created_at_idx ON public.volunteer_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS volunteer_applications_reviewed_idx ON public.volunteer_applications(reviewed) WHERE reviewed = FALSE;

ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public_can_insert" ON volunteer_applications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY IF NOT EXISTS "directors_can_manage" ON volunteer_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_uid = auth.uid()
        AND members.role IN ('director', 'hod', 'super_admin')
        AND members.status = 'active'
    )
  );
    `
  },
  {
    name: 'Create approve_post_category RPC',
    sql: `
CREATE OR REPLACE FUNCTION public.approve_post_category(
  p_post_uuid UUID,
  p_category TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_post_id INTEGER;
  v_remaining TEXT[];
  v_all_approved BOOLEAN;
BEGIN
  SELECT post_id INTO v_post_id FROM posts WHERE uuid = p_post_uuid;

  IF v_post_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Post not found');
  END IF;

  UPDATE posts
  SET pending_categories = array_remove(pending_categories, p_category)
  WHERE post_id = v_post_id;

  SELECT pending_categories INTO v_remaining FROM posts WHERE post_id = v_post_id;
  v_all_approved := (v_remaining IS NULL OR array_length(v_remaining, 1) IS NULL);

  IF v_all_approved THEN
    UPDATE posts SET status = 'published' WHERE post_id = v_post_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'published', v_all_approved, 'categories_remaining', v_remaining);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  },
  {
    name: 'Create member creation trigger',
    sql: `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (auth_uid, email, status, role, created_at, is_active)
  VALUES (NEW.id, NEW.email, 'pending_approval', 'member', NOW(), TRUE)
  ON CONFLICT (auth_uid) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    `
  }
];

async function runMigrations() {
  console.log('🚀 Starting migrations...\n');

  for (const migration of migrations) {
    console.log(`📋 ${migration.name}`);
    try {
      // Use raw SQL execution through Supabase
      const { data, error } = await supabase.rpc('exec', { sql: migration.sql });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        console.error(`     Code: ${error.code}`);
      } else {
        console.log(`  ✅ Success`);
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
    }
  }

  console.log('\n✨ Migration run complete!');
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
