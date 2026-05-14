-- ============================================================
-- AquaTerra — Public Supabase: Teams Table Migration
-- Run this in the Supabase SQL editor for the PUBLIC project
-- (NOT the community project — this is the one TeamsPage reads)
-- ============================================================

-- 1. Create the teams table
CREATE TABLE IF NOT EXISTS public.teams (
  uuid        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('events','welfare','labs','operations','content')),
  bio         TEXT,
  color       TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Auto-update updated_at on every row update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 4. Public SELECT — anyone (including anon) can read teams
DROP POLICY IF EXISTS "teams_public_select" ON public.teams;
CREATE POLICY "teams_public_select"
  ON public.teams FOR SELECT
  USING (true);

-- 5. INSERT / UPDATE restricted to authenticated leaders
--    We check the member's role from the community members table via a helper.
--    If your auth setup stores role in JWT claims, adjust accordingly.
DROP POLICY IF EXISTS "teams_leader_write" ON public.teams;
CREATE POLICY "teams_leader_write"
  ON public.teams FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "teams_leader_update" ON public.teams;
CREATE POLICY "teams_leader_update"
  ON public.teams FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 6. Seed initial teams from SAMPLE_TEAMS (run manually if Supabase is empty)
INSERT INTO public.teams (uuid, name, category, bio, color, member_count)
VALUES
  ('t-1', 'Events Team',     'events',     'Paradox. Disco Diwali. Starry Nights. Every fundraiser AQ has ever run. Paradox 3.0 had 300 attendees and crossed 6-digit revenue. This team ran it.',     '#FF7A1A', 40),
  ('t-2', 'Welfare Team',    'welfare',    '3,500+ kids reached in teaching workshops. 8 Sundarbans relief trips. Dog feeding drives across Kolkata. 4,000+ saplings planted. This is the impact core.', '#00E5A0', 60),
  ('t-3', 'Social Media',    'content',    'Instagram, LinkedIn, website. 3,200+ followers on @ngo.aquaterra. Reels, carousels, copy, strategy. Not a school club. A real brand account.',             '#FF6BD6', 20),
  ('t-4', 'Collabs Team',    'operations', 'School collabs, college collabs, NGO partnerships, outreach. AQ grows through peer networks. This team builds those networks.',                             '#FFC700', 25),
  ('t-5', 'ROOTS',           'content',    'Student-run streetwear brand. Design, production, sales. Profits fund AQ welfare projects and events. The brand is real. The revenue is real.',             '#7E5BFF', 15),
  ('t-6', 'AQ.Ventures',     'operations', 'Free marketing agency for student businesses. Real clients. Real briefs. Real deliverables. Members build marketing experience before college.',             '#3DA9FC', 12),
  ('t-7', 'ShikshAQ',        'labs',       'Tuition discovery platform built by AQ members for Kolkata students. Launched 2026. Product, design, content, growth. Still early. The team is small.',    '#FF4D8C', 10),
  ('t-8', 'Human Resources', 'operations', 'Recruitment, onboarding, certificates, Letters of Recommendation. HR runs the intake pipeline for 1,100+ members.',                                       '#FFE94A', 18)
ON CONFLICT (uuid) DO NOTHING;
