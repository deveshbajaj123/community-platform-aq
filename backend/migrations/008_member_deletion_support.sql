-- Migration: Allow nullable FKs for member deletion support
-- When a member is deleted, these columns should be SET NULL rather than blocking the delete.

-- post_approvals.approved_by: tracks which director approved a category for a post
-- If that director is deleted, the approval record should remain with NULL approver
ALTER TABLE post_approvals ALTER COLUMN approved_by DROP NOT NULL;

-- projects.created_by: tracks who created a project
-- If that member is deleted, the project should remain with NULL creator
ALTER TABLE projects ALTER COLUMN created_by DROP NOT NULL;
