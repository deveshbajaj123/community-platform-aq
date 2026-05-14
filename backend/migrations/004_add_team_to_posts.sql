-- Migration 004: Add team_id to posts table
-- This allows posts to be associated with teams for team-based posting

-- Add team_id column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL;

-- Create index for performance when querying posts by team
CREATE INDEX IF NOT EXISTS idx_posts_team ON posts(team_id);

-- Comment explaining the column
COMMENT ON COLUMN posts.team_id IS 'Optional team association for posts created from a team context';
