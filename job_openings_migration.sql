-- AquaTerra: Job Openings Table Migration
-- Run in Supabase SQL editor (community project)

CREATE TABLE IF NOT EXISTS public.job_openings (
  opening_id SERIAL PRIMARY KEY,
  id UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  team_name VARCHAR(200),
  skills TEXT[] DEFAULT '{}',
  commitment VARCHAR(100),
  deadline TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed', 'deleted')),
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by_name VARCHAR(200) NOT NULL,
  created_by_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  linked_post_id UUID REFERENCES posts(uuid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_openings_status ON public.job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_openings_category ON public.job_openings(category);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_job_openings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_openings_updated_at ON public.job_openings;
CREATE TRIGGER job_openings_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.set_job_openings_updated_at();

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

-- Public can read open/paused openings
DROP POLICY IF EXISTS "job_openings_public_read" ON public.job_openings;
CREATE POLICY "job_openings_public_read" ON public.job_openings
  FOR SELECT USING (status != 'deleted');

-- Authenticated users can insert
DROP POLICY IF EXISTS "job_openings_auth_insert" ON public.job_openings;
CREATE POLICY "job_openings_auth_insert" ON public.job_openings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update
DROP POLICY IF EXISTS "job_openings_auth_update" ON public.job_openings;
CREATE POLICY "job_openings_auth_update" ON public.job_openings
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can soft-delete
DROP POLICY IF EXISTS "job_openings_auth_delete" ON public.job_openings;
CREATE POLICY "job_openings_auth_delete" ON public.job_openings
  FOR DELETE USING (auth.role() = 'authenticated');
