-- Migration 010: Team Join Requests
-- Allows members to apply to join a team; leads can approve/reject

CREATE TABLE IF NOT EXISTS team_join_requests (
    request_id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    message TEXT,
    reviewed_by INTEGER REFERENCES members(member_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one active pending request per member per team
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_unique_pending
    ON team_join_requests (team_id, member_id)
    WHERE status = 'pending';

-- Index for fast lookups by team
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team ON team_join_requests(team_id);

-- Index for fast lookups by member
CREATE INDEX IF NOT EXISTS idx_team_join_requests_member ON team_join_requests(member_id);
