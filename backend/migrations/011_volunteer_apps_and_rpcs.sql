-- ============================================
-- MIGRATION 011: VOLUNTEER APPLICATIONS & RPCs
-- ============================================
-- 1. Create volunteer_applications table
-- 2. Create approve_post_category RPC
-- 3. Ensure member creation trigger sets pending_approval status

-- ============================================
-- PART 1: VOLUNTEER APPLICATIONS TABLE
-- ============================================
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS volunteer_applications_email_idx ON public.volunteer_applications(email);
CREATE INDEX IF NOT EXISTS volunteer_applications_created_at_idx ON public.volunteer_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS volunteer_applications_reviewed_idx ON public.volunteer_applications(reviewed) WHERE reviewed = FALSE;

-- Enable RLS
ALTER TABLE volunteer_applications ENABLE ROW LEVEL SECURITY;

-- Allow public to insert (volunteers applying)
CREATE POLICY "public_can_insert" ON volunteer_applications
  FOR INSERT WITH CHECK (TRUE);

-- Allow directors to view and update
CREATE POLICY "directors_can_manage" ON volunteer_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE members.auth_uid = auth.uid()
        AND members.role IN ('director', 'hod', 'super_admin')
        AND members.status = 'active'
    )
  );

-- ============================================
-- PART 2: APPROVE_POST_CATEGORY RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_post_category(
  p_post_uuid UUID,
  p_category TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_post_id INTEGER;
  v_remaining TEXT[];
  v_all_approved BOOLEAN;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  -- Get post_id from uuid
  SELECT post_id INTO v_post_id FROM posts WHERE uuid = p_post_uuid;

  IF v_post_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Post not found'
    );
  END IF;

  -- Verify user is a director
  IF NOT EXISTS (
    SELECT 1 FROM members
    WHERE auth_uid = v_current_user_id
      AND role IN ('director', 'hod', 'super_admin')
      AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Unauthorized — must be a director'
    );
  END IF;

  -- Remove category from pending_categories array
  UPDATE posts
  SET pending_categories = array_remove(pending_categories, p_category)
  WHERE post_id = v_post_id;

  -- Check if all categories are approved
  SELECT pending_categories INTO v_remaining FROM posts WHERE post_id = v_post_id;

  v_all_approved := (v_remaining IS NULL OR array_length(v_remaining, 1) IS NULL);

  -- If all approved, publish the post
  IF v_all_approved THEN
    UPDATE posts
    SET status = 'published'
    WHERE post_id = v_post_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'published', v_all_approved,
    'categories_remaining', v_remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: MEMBER CREATION TRIGGER
-- ============================================
-- Ensure the trigger creates members with pending_approval status

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (
    auth_uid,
    email,
    status,
    role,
    created_at,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    'pending_approval',
    'member',
    NOW(),
    TRUE
  )
  ON CONFLICT (auth_uid) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE volunteer_applications IS 'Volunteer applications collected from VolunteerApplyPage';
COMMENT ON FUNCTION approve_post_category IS 'Approve a post for a specific category; publishes if all categories approved';
