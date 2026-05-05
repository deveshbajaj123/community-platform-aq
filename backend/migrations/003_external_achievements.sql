-- Migration: External Achievements
-- Description: Add external_achievements table for members to showcase personal achievements
-- Date: 2026-03-15

-- Create external_achievements table
CREATE TABLE IF NOT EXISTS external_achievements (
    achievement_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(100) NOT NULL CHECK (achievement_type IN ('leadership', 'academic', 'competition', 'personal_project')),
    achievement_date DATE NOT NULL,
    proof_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievements_member ON external_achievements(member_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON external_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_date ON external_achievements(achievement_date DESC);

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_achievement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_achievement_timestamp ON external_achievements;
CREATE TRIGGER set_achievement_timestamp
BEFORE UPDATE ON external_achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievement_timestamp();

-- Add comments for documentation
COMMENT ON TABLE external_achievements IS 'Stores personal achievements for members (awards, certifications, competitions, personal projects)';
COMMENT ON COLUMN external_achievements.achievement_type IS 'Type of achievement: leadership, academic, competition, personal_project';
COMMENT ON COLUMN external_achievements.achievement_date IS 'Date when the achievement was earned';
COMMENT ON COLUMN external_achievements.proof_url IS 'Optional URL to proof image/certificate (stored in Azure Blob Storage)';
