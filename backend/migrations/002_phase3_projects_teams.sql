-- ============================================
-- PHASE 3: PROJECTS & TEAMS MIGRATION
-- ============================================
-- Run this migration to create tables for:
-- 1. Director category assignments
-- 2. Teams and team members
-- 3. Projects and project members
-- 4. Post categories (multi-category support)
-- 5. Post approvals (multi-director approval)
-- 6. Post-project associations
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: DIRECTOR CATEGORY ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS director_categories (
    assignment_id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES members(member_id),
    UNIQUE(member_id, category)
);

CREATE INDEX IF NOT EXISTS idx_director_categories_member ON director_categories(member_id);
CREATE INDEX IF NOT EXISTS idx_director_categories_category ON director_categories(category);

-- ============================================
-- STEP 2: TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    team_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES members(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_uuid ON teams(uuid);
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active) WHERE is_active = TRUE;

-- ============================================
-- STEP 3: TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    team_member_id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'lead', 'director')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id);

-- ============================================
-- STEP 4: PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
    school_id INTEGER REFERENCES schools(school_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
    start_date DATE,
    end_date DATE,
    cover_image_url TEXT,
    created_by INTEGER REFERENCES members(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(uuid);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- ============================================
-- STEP 5: PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    project_member_id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(member_id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'contributor',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members(member_id);

-- ============================================
-- STEP 6: POST CATEGORIES (Multi-category support)
-- ============================================
CREATE TABLE IF NOT EXISTS post_categories (
    post_category_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    UNIQUE(post_id, category)
);

CREATE INDEX IF NOT EXISTS idx_post_categories_post ON post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_category ON post_categories(category);

-- ============================================
-- STEP 7: POST APPROVALS (Multi-director approval)
-- ============================================
CREATE TABLE IF NOT EXISTS post_approvals (
    approval_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    approved_by INTEGER REFERENCES members(member_id),
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, category)
);

CREATE INDEX IF NOT EXISTS idx_post_approvals_post ON post_approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_post_approvals_category ON post_approvals(category);

-- ============================================
-- STEP 8: POST-PROJECT ASSOCIATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS post_projects (
    post_project_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    UNIQUE(post_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_post_projects_post ON post_projects(post_id);
CREATE INDEX IF NOT EXISTS idx_post_projects_project ON post_projects(project_id);

-- ============================================
-- STEP 9: UPDATE TRIGGERS
-- ============================================
-- Add updated_at trigger for teams
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE director_categories IS 'Maps directors to the categories they can approve posts for';
COMMENT ON TABLE teams IS 'Community teams organized by category';
COMMENT ON TABLE team_members IS 'Members belonging to teams with their roles';
COMMENT ON TABLE projects IS 'Community projects with timeline and categorization';
COMMENT ON TABLE project_members IS 'Members participating in projects';
COMMENT ON TABLE post_categories IS 'Multi-category support for posts';
COMMENT ON TABLE post_approvals IS 'Tracks director approvals per category for posts';
COMMENT ON TABLE post_projects IS 'Links posts to projects they are about';
