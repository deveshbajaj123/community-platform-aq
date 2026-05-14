-- ============================================
-- PHASE 5: SUPER ADMIN MIGRATION
-- ============================================
-- Run this migration to add super-admin functionality
-- ============================================

-- Add is_super_admin column to members
ALTER TABLE members
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Create index for super admin queries
CREATE INDEX IF NOT EXISTS idx_members_super_admin ON members(is_super_admin) WHERE is_super_admin = TRUE;

-- Comment
COMMENT ON COLUMN members.is_super_admin IS 'Whether the member has super-admin privileges (can manage directors and category assignments)';
