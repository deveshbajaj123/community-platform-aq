-- ============================================================
-- AquaTerra Community Supabase — Teams Setup
-- Run this in the SQL editor for the COMMUNITY project
-- Project: hzowuwffjqtgszecngpe
-- ============================================================

-- ── 1. TEAMS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  team_id   SERIAL PRIMARY KEY,
  uuid      UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  name      VARCHAR(200) NOT NULL,
  description TEXT,
  category  VARCHAR(50) NOT NULL
            CHECK (category IN ('events','welfare','labs','operations','content')),
  logo_url  TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_teams_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_teams_updated_at();

-- ── 2. TEAM MEMBERS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  team_member_id SERIAL PRIMARY KEY,
  team_id   INTEGER NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  role      VARCHAR(20) NOT NULL DEFAULT 'member'
            CHECK (role IN ('member','lead')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at   TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (team_id, member_id)
);

-- ── 3. TEAM JOIN REQUESTS TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  request_id  SERIAL PRIMARY KEY,
  uuid        UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  team_id     INTEGER NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  member_id   INTEGER NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected','cancelled')),
  message     TEXT,
  reviewed_by INTEGER REFERENCES public.members(member_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS join_requests_updated_at ON public.team_join_requests;
CREATE TRIGGER join_requests_updated_at
  BEFORE UPDATE ON public.team_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_teams_updated_at();

-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- Teams: anyone authenticated can read active teams
DROP POLICY IF EXISTS "teams_read"          ON public.teams;
DROP POLICY IF EXISTS "teams_auth_insert"   ON public.teams;
DROP POLICY IF EXISTS "teams_auth_update"   ON public.teams;

CREATE POLICY "teams_read" ON public.teams
  FOR SELECT USING (is_active = true);

CREATE POLICY "teams_auth_insert" ON public.teams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "teams_auth_update" ON public.teams
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Team members: authenticated users can read
DROP POLICY IF EXISTS "team_members_read"   ON public.team_members;
DROP POLICY IF EXISTS "team_members_write"  ON public.team_members;

CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_members_write" ON public.team_members
  FOR ALL USING (auth.role() = 'authenticated');

-- Join requests: authenticated users can read/write
DROP POLICY IF EXISTS "join_requests_read"  ON public.team_join_requests;
DROP POLICY IF EXISTS "join_requests_write" ON public.team_join_requests;

CREATE POLICY "join_requests_read" ON public.team_join_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "join_requests_write" ON public.team_join_requests
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 5. SEED THE 8 AQ TEAMS ───────────────────────────────────
-- Uses fixed UUIDs so they're stable across runs.
-- ON CONFLICT = safe to re-run.

INSERT INTO public.teams (uuid, name, description, category, is_active)
VALUES
  (
    'a1b2c3d4-0001-0000-0000-000000000001',
    'Events Team',
    'Paradox. Disco Diwali. Starry Nights. Every fundraiser AQ has ever run. Paradox 3.0 had 300 attendees and crossed 6-digit revenue. This team ran it.',
    'events', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000002',
    'Welfare Team',
    '3,500+ kids reached in teaching workshops. 8 Sundarbans relief trips. Dog feeding drives across Kolkata. 4,000+ saplings planted. This is the impact core.',
    'welfare', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000003',
    'Social Media',
    'Instagram, LinkedIn, website. 3,200+ followers on @ngo.aquaterra. Reels, carousels, copy, strategy. Not a school club. A real brand account.',
    'content', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000004',
    'Collabs Team',
    'School collabs, college collabs, NGO partnerships, outreach. AQ grows through peer networks. This team builds those networks.',
    'operations', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000005',
    'ROOTS',
    'Student-run streetwear brand. Design, production, sales. Profits fund AQ welfare projects and events. The brand is real. The revenue is real.',
    'content', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000006',
    'AQ.Ventures',
    'Free marketing agency for student businesses. Real clients. Real briefs. Real deliverables. Members build marketing experience before college.',
    'operations', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000007',
    'ShikshAQ',
    'Tuition discovery platform built by AQ members for Kolkata students. Launched 2026. Product, design, content, growth. Still early. The team is small.',
    'labs', TRUE
  ),
  (
    'a1b2c3d4-0001-0000-0000-000000000008',
    'Human Resources',
    'Recruitment, onboarding, certificates, Letters of Recommendation. HR runs the intake pipeline for 1,100+ members.',
    'operations', TRUE
  )
ON CONFLICT (uuid) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  category    = EXCLUDED.category,
  is_active   = EXCLUDED.is_active;

-- ── 6. POSTS TABLE — ADD team_id FK IF MISSING ───────────────
-- The posts table may already have team_id. This is safe to run.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES public.teams(team_id) ON DELETE SET NULL;

-- ── 7. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_teams_category        ON public.teams(category);
CREATE INDEX IF NOT EXISTS idx_teams_is_active       ON public.teams(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team     ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member   ON public.team_members(member_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active   ON public.team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_join_requests_team    ON public.team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_member  ON public.team_join_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status  ON public.team_join_requests(status);

-- ── DONE ─────────────────────────────────────────────────────
-- After running this:
-- 1. Go to TeamsPage → teams should load from community DB
-- 2. Click any team → TeamDetailPage should load correctly
-- 3. Join requests, member management, team posts all work
-- ============================================================
