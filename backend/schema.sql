-- ============================================
-- AQUATERRA COMMUNITY PLATFORM DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (for fresh install)
-- ============================================
DROP TABLE IF EXISTS post_projects CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS post_approvals CASCADE;
DROP TABLE IF EXISTS post_categories CASCADE;
DROP TABLE IF EXISTS director_categories CASCADE;
DROP TABLE IF EXISTS community_audit_logs CASCADE;
DROP TABLE IF EXISTS active_sessions CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS post_images CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ============================================
-- TABLES
-- ============================================

-- Members table (students aged 14-19 and directors)
CREATE TABLE members (
    member_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    class_grade VARCHAR(50),
    phone VARCHAR(20),
    join_reason TEXT,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'director')),
    status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'rejected', 'suspended')),
    rejection_note TEXT,
    approved_by INTEGER REFERENCES members(member_id),
    approved_at TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Posts table
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    author_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    team_id INTEGER,  -- FK added after teams table is created
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    body TEXT NOT NULL,
    link_url TEXT,
    link_title TEXT,
    link_image TEXT,
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'published', 'rejected')),
    rejection_note TEXT,
    reviewed_by INTEGER REFERENCES members(member_id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post Images (max 4 per post, stored in Azure Blob Storage)
CREATE TABLE post_images (
    image_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    blob_url TEXT NOT NULL,
    blob_name TEXT NOT NULL,
    file_size INTEGER,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post Tags (member mentions @name)
CREATE TABLE post_tags (
    tag_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    tagged_member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, tagged_member_id)
);

-- Likes
CREATE TABLE likes (
    like_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, member_id)
);

-- Comments (scaffolded for v2)
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management for JWT token invalidation
CREATE TABLE active_sessions (
    session_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for sensitive operations
CREATE TABLE community_audit_logs (
    log_id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(member_id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PHASE 2: DIRECTOR CATEGORY SYSTEM
-- ============================================

-- Director category assignments (which directors can approve which categories)
CREATE TABLE director_categories (
    assignment_id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES members(member_id),
    UNIQUE(member_id, category)
);

-- Post categories junction table (for multi-category posts)
CREATE TABLE post_categories (
    post_category_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    UNIQUE(post_id, category)
);

-- Post approvals tracking (for multi-director approval workflow)
CREATE TABLE post_approvals (
    approval_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    approved_by INTEGER NOT NULL REFERENCES members(member_id),
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, category)
);

-- ============================================
-- PHASE 3: TEAMS & PROJECTS
-- ============================================

-- Teams table
CREATE TABLE teams (
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

-- Team members junction table
CREATE TABLE team_members (
    team_member_id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'lead')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, member_id)
);

-- Projects table
CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs')),
    team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
    start_date DATE,
    end_date DATE,
    cover_image_url TEXT,
    created_by INTEGER NOT NULL REFERENCES members(member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project members junction table
CREATE TABLE project_members (
    project_member_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'contributor',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, member_id)
);

-- Post-project association (link posts to projects)
CREATE TABLE post_projects (
    post_project_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    UNIQUE(post_id, project_id)
);

-- ============================================
-- DEFERRED FOREIGN KEY CONSTRAINTS
-- ============================================

-- Add FK constraint for posts.team_id after teams table exists
ALTER TABLE posts ADD CONSTRAINT fk_posts_team
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Members indexes
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_uuid ON members(uuid);
CREATE INDEX idx_members_google_id ON members(google_id);
CREATE INDEX idx_members_status ON members(status) WHERE status = 'pending_approval';
CREATE INDEX idx_members_role ON members(role);

-- Posts indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_published ON posts(status, created_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_pending ON posts(status) WHERE status = 'pending_review';
CREATE INDEX idx_posts_uuid ON posts(uuid);
CREATE INDEX idx_posts_team ON posts(team_id) WHERE team_id IS NOT NULL;

-- Post images indexes
CREATE INDEX idx_post_images_post ON post_images(post_id);

-- Post tags indexes
CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_member ON post_tags(tagged_member_id);

-- Likes indexes
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_member ON likes(member_id);

-- Comments indexes
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_author ON comments(author_id);

-- Sessions indexes
CREATE INDEX idx_sessions_member ON active_sessions(member_id);
CREATE INDEX idx_sessions_expires ON active_sessions(expires_at);
CREATE INDEX idx_sessions_token ON active_sessions(token_hash);

-- Audit logs indexes
CREATE INDEX idx_audit_member ON community_audit_logs(member_id);
CREATE INDEX idx_audit_created ON community_audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON community_audit_logs(action);

-- Director category indexes
CREATE INDEX idx_director_categories_member ON director_categories(member_id);
CREATE INDEX idx_director_categories_category ON director_categories(category);

-- Post categories indexes
CREATE INDEX idx_post_categories_post ON post_categories(post_id);
CREATE INDEX idx_post_categories_category ON post_categories(category);

-- Post approvals indexes
CREATE INDEX idx_post_approvals_post ON post_approvals(post_id);
CREATE INDEX idx_post_approvals_category ON post_approvals(category);

-- Teams indexes
CREATE INDEX idx_teams_uuid ON teams(uuid);
CREATE INDEX idx_teams_category ON teams(category);
CREATE INDEX idx_teams_active ON teams(is_active) WHERE is_active = TRUE;

-- Team members indexes
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_team_members_active ON team_members(is_active) WHERE is_active = TRUE;

-- Projects indexes
CREATE INDEX idx_projects_uuid ON projects(uuid);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- Project members indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_member ON project_members(member_id);

-- Post projects indexes
CREATE INDEX idx_post_projects_post ON post_projects(post_id);
CREATE INDEX idx_post_projects_project ON post_projects(project_id);

-- ============================================
-- VIEWS
-- ============================================

-- Post feed view with author info and counts
CREATE VIEW post_feed_view AS
SELECT
    p.post_id,
    p.uuid,
    p.category,
    p.body,
    p.link_url,
    p.link_title,
    p.link_image,
    p.status,
    p.created_at,
    p.updated_at,
    m.member_id AS author_id,
    m.uuid AS author_uuid,
    m.full_name AS author_name,
    m.avatar_url AS author_avatar,
    m.role AS author_role,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) AS comment_count,
    (SELECT json_agg(json_build_object('url', pi.blob_url, 'order', pi.display_order))
     FROM post_images pi WHERE pi.post_id = p.post_id) AS images,
    (SELECT json_agg(json_build_object('id', tm.member_id, 'name', tm.full_name, 'uuid', tm.uuid))
     FROM post_tags pt
     JOIN members tm ON pt.tagged_member_id = tm.member_id
     WHERE pt.post_id = p.post_id) AS tagged_members
FROM posts p
JOIN members m ON p.author_id = m.member_id;

-- Pending approvals view for directors
CREATE VIEW pending_member_approvals AS
SELECT
    member_id,
    uuid,
    email,
    full_name,
    class_grade,
    phone,
    join_reason,
    created_at
FROM members
WHERE status = 'pending_approval' AND role = 'member'
ORDER BY created_at ASC;

-- Pending post reviews view for directors
CREATE VIEW pending_post_reviews AS
SELECT
    p.post_id,
    p.uuid,
    p.category,
    p.body,
    p.link_url,
    p.created_at,
    m.member_id AS author_id,
    m.full_name AS author_name,
    m.avatar_url AS author_avatar
FROM posts p
JOIN members m ON p.author_id = m.member_id
WHERE p.status = 'pending_review'
ORDER BY p.created_at ASC;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM active_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POST CATEGORIES REFERENCE
-- ============================================
-- 'events'      - Events (community events, drives, meetups)
-- 'welfare'     - Welfare (wellbeing, support, milestones)
-- 'content'     - Content (articles, media, creative work)
-- 'operations'  - Operations (announcements, logistics, admin)
-- 'labs'        - Labs (innovation, startups, experiments)
