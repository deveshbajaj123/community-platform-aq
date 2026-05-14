-- Add end date to achievements (NULL means ongoing / "Present")
ALTER TABLE external_achievements ADD COLUMN IF NOT EXISTS achievement_end_date DATE;
