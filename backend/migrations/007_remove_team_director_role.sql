-- ============================================
-- REMOVE TEAM DIRECTOR ROLE
-- ============================================
-- Simplifies team authority structure:
-- - Removes 'director' role from team_members
-- - Converts existing team directors to leads
-- - Team roles are now: 'member', 'lead'
--
-- Note: Global 'director' role (members.role) is unchanged.
-- Directors with category assignments can still manage teams
-- in their assigned categories, but as team 'lead' when added.
-- ============================================

-- Step 1: Convert any existing team directors to leads
UPDATE team_members SET role = 'lead' WHERE role = 'director';

-- Step 2: Update the CHECK constraint to only allow 'member' and 'lead'
-- PostgreSQL requires dropping and recreating the constraint
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('member', 'lead'));
