-- ============================================
-- PHASE 1: CORE FIXES MIGRATION
-- ============================================
-- Run this migration to update the database for Phase 1 features:
-- 1. Fix categories (events, welfare, content, operations, labs)
-- 2. Add schools and classes tables
-- 3. Add school_id, class_id, bio fields to members
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE SCHOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
    school_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    short_name VARCHAR(50),
    logo_url TEXT,
    location VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School indexes
CREATE INDEX IF NOT EXISTS idx_schools_uuid ON schools(uuid);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active) WHERE is_active = TRUE;

-- ============================================
-- STEP 2: CREATE CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
    class_id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    school_id INTEGER REFERENCES schools(school_id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    grade_level INTEGER,
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name, academic_year)
);

-- Class indexes
CREATE INDEX IF NOT EXISTS idx_classes_uuid ON classes(uuid);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ============================================
-- STEP 3: ADD NEW COLUMNS TO MEMBERS
-- ============================================
-- Add school_id column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(school_id) ON DELETE SET NULL;

-- Add class_id column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(class_id) ON DELETE SET NULL;

-- Add bio column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_members_school ON members(school_id);
CREATE INDEX IF NOT EXISTS idx_members_class ON members(class_id);

-- ============================================
-- STEP 4: FIX POST CATEGORIES
-- ============================================
-- First, drop the existing constraint
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_category_check;

-- Add new constraint with correct categories
ALTER TABLE posts ADD CONSTRAINT posts_category_check
CHECK (category IN ('events', 'welfare', 'content', 'operations', 'labs'));

-- Migration mapping for existing data (run manually if needed):
-- UPDATE posts SET category = 'events' WHERE category = 'community_drives';
-- UPDATE posts SET category = 'operations' WHERE category = 'startup_ventures';
-- UPDATE posts SET category = 'content' WHERE category = 'self_improvement';
-- UPDATE posts SET category = 'events' WHERE category = 'announcements';
-- UPDATE posts SET category = 'welfare' WHERE category = 'milestones';

-- ============================================
-- STEP 5: UPDATE TRIGGERS
-- ============================================
-- Add updated_at trigger for schools
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for classes
DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 6: UPDATE VIEWS
-- ============================================
-- Drop and recreate post_feed_view with new category support
DROP VIEW IF EXISTS post_feed_view CASCADE;
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
    s.name AS author_school,
    s.uuid AS author_school_uuid,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) AS like_count,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) AS comment_count,
    (SELECT json_agg(json_build_object('url', pi.blob_url, 'order', pi.display_order))
     FROM post_images pi WHERE pi.post_id = p.post_id) AS images,
    (SELECT json_agg(json_build_object('id', tm.member_id, 'name', tm.full_name, 'uuid', tm.uuid))
     FROM post_tags pt
     JOIN members tm ON pt.tagged_member_id = tm.member_id
     WHERE pt.post_id = p.post_id) AS tagged_members
FROM posts p
JOIN members m ON p.author_id = m.member_id
LEFT JOIN schools s ON m.school_id = s.school_id;

-- Drop and recreate pending_member_approvals with school info
DROP VIEW IF EXISTS pending_member_approvals CASCADE;
CREATE VIEW pending_member_approvals AS
SELECT
    m.member_id,
    m.uuid,
    m.email,
    m.full_name,
    m.class_grade,
    m.phone,
    m.join_reason,
    m.bio,
    m.created_at,
    s.name AS school_name,
    s.uuid AS school_uuid,
    c.name AS class_name,
    c.uuid AS class_uuid
FROM members m
LEFT JOIN schools s ON m.school_id = s.school_id
LEFT JOIN classes c ON m.class_id = c.class_id
WHERE m.status = 'pending_approval' AND m.role = 'member'
ORDER BY m.created_at ASC;

-- Create member public profile view
DROP VIEW IF EXISTS member_public_profile CASCADE;
CREATE VIEW member_public_profile AS
SELECT
    m.member_id,
    m.uuid,
    m.full_name,
    m.avatar_url,
    m.class_grade,
    m.bio,
    m.role,
    m.created_at,
    s.school_id,
    s.uuid AS school_uuid,
    s.name AS school_name,
    s.logo_url AS school_logo,
    c.class_id,
    c.uuid AS class_uuid,
    c.name AS class_name,
    (SELECT COUNT(*) FROM posts p WHERE p.author_id = m.member_id AND p.status = 'published') AS post_count,
    (SELECT COUNT(*) FROM post_tags pt
     JOIN posts p2 ON pt.post_id = p2.post_id
     WHERE pt.tagged_member_id = m.member_id AND p2.status = 'published') AS tagged_count
FROM members m
LEFT JOIN schools s ON m.school_id = s.school_id
LEFT JOIN classes c ON m.class_id = c.class_id
WHERE m.status = 'active' AND m.is_active = TRUE;

-- ============================================
-- STEP 7: VALID CATEGORIES REFERENCE
-- ============================================
-- 'events'     - Events (replaces community_drives, announcements)
-- 'welfare'    - Welfare (replaces milestones)
-- 'content'    - Content (replaces self_improvement)
-- 'operations' - Operations (replaces startup_ventures)
-- 'labs'       - Labs (new)

COMMENT ON TABLE schools IS 'Schools represented on the AquaTerra platform';
COMMENT ON TABLE classes IS 'Classes/grades within schools';
COMMENT ON COLUMN members.school_id IS 'FK to schools table - which school the member belongs to';
COMMENT ON COLUMN members.class_id IS 'FK to classes table - which class the member is in';
COMMENT ON COLUMN members.bio IS 'Member profile bio/description';
