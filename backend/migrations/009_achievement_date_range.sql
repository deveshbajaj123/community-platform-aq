-- Add end date to achievements (NULL means ongoing / "Present")
ALTER TABLE external_achievements ADD COLUMN achievement_end_date DATE;
