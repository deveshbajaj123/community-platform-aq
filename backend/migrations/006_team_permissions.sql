-- ============================================
-- TEAM PERMISSIONS ENHANCEMENT
-- ============================================
-- Adds index for faster team creator lookups
-- No schema changes needed - uses existing columns:
-- - teams.created_by - tracks team creator
-- - team_members.role - 'member', 'lead'
-- - members.role - 'member', 'director' (global role)
-- - members.is_super_admin - TRUE/FALSE
-- ============================================

-- Add index for faster team creator lookups
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Add composite index for team member permission lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_member_role
ON team_members(team_id, member_id, role) WHERE is_active = TRUE;
