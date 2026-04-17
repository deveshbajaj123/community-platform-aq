const { pool } = require('../config/database');
const { transformKeys, transformArray } = require('../utils/caseTransform');

/**
 * POST STATUS VALUES AND TRANSITIONS
 * ===================================
 *
 * Valid Status Values:
 * - 'pending_review' : Post awaiting director approval
 * - 'published'      : Post approved and visible on feed
 * - 'rejected'       : Post rejected by director
 *
 * Status Transition Flow:
 * -----------------------
 * Member creates post:
 *   pending_review → (director approves) → published
 *   pending_review → (director rejects) → rejected
 *
 * Director creates post:
 *   published (immediate)
 *
 * Terminal States:
 * - published (cannot revert to pending)
 * - rejected (cannot edit or resubmit)
 *
 * Multi-Category Approval:
 * - Post with N categories requires N approvals (one per category director)
 * - Tracked in post_approvals table
 * - Once all categories approved → status changes to 'published'
 */
const Post = {
  /**
   * Create a new post
   */
  async create({ authorId, category, body, linkUrl, linkTitle, linkImage, status = 'pending_review' }) {
    const result = await pool.query(
      `INSERT INTO posts (author_id, category, body, link_url, link_title, link_image, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING post_id, uuid, author_id, category, body, link_url, link_title, link_image, status, created_at`,
      [authorId, category, body, linkUrl, linkTitle, linkImage, status]
    );
    return transformKeys(result.rows[0]);
  },

  /**
   * Find post by ID
   */
  async findById(postId) {
    const result = await pool.query(
      `SELECT p.*, m.full_name as author_name, m.avatar_url as author_avatar, m.role as author_role, m.uuid as author_uuid,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       WHERE p.post_id = $1`,
      [postId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find post by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT p.*, m.full_name as author_name, m.avatar_url as author_avatar, m.role as author_role, m.uuid as author_uuid,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       WHERE p.uuid = $1`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get published feed posts
   */
  async getFeed({ page = 1, limit = 20, category = null }) {
    const offset = (page - 1) * limit;

    // Check if team_id column exists (for backwards compatibility)
    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'team_id'
    `);
    const hasTeamId = columnCheck.rows.length > 0;

    let countQuery = `SELECT COUNT(*) FROM posts WHERE status = 'published'`;
    let feedQuery = hasTeamId ? `
      SELECT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
             p.created_at, p.updated_at, p.team_id,
             m.member_id as author_id, m.uuid as author_uuid, m.full_name as author_name,
             m.avatar_url as author_avatar, m.role as author_role,
             t.name as team_name, t.uuid as team_uuid,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
      FROM posts p
      JOIN members m ON p.author_id = m.member_id
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.status = 'published'
    ` : `
      SELECT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
             p.created_at, p.updated_at, NULL as team_id,
             m.member_id as author_id, m.uuid as author_uuid, m.full_name as author_name,
             m.avatar_url as author_avatar, m.role as author_role,
             NULL as team_name, NULL as team_uuid,
             (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
             (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
      FROM posts p
      JOIN members m ON p.author_id = m.member_id
      WHERE p.status = 'published'
    `;

    const params = [];

    if (category) {
      countQuery += ` AND category = $1`;
      feedQuery += ` AND p.category = $1`;
      params.push(category);
    }

    feedQuery += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, category ? [category] : []);
    const total = parseInt(countResult.rows[0].count);

    const feedResult = await pool.query(feedQuery, params);

    // Get images and tags for each post
    const posts = await Promise.all(feedResult.rows.map(async (post) => {
      const [images, tags] = await Promise.all([
        pool.query(
          `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
          [post.post_id]
        ),
        pool.query(
          `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url
           FROM post_tags pt
           JOIN members m ON pt.tagged_member_id = m.member_id
           WHERE pt.post_id = $1`,
          [post.post_id]
        )
      ]);

      return transformKeys({
        ...post,
        images: transformArray(images.rows),
        tagged_members: transformArray(tags.rows)
      });
    }));

    return { posts, total };
  },

  /**
   * Get pending posts for moderation (includes all pending posts, regular and team-based)
   */
  async getPendingReviews({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM posts
       WHERE status = 'pending_review'`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
              p.created_at, m.member_id as author_id, m.uuid as author_uuid,
              m.full_name as author_name, m.avatar_url as author_avatar
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       WHERE p.status = 'pending_review'
       ORDER BY p.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get images for each post
    const posts = await Promise.all(result.rows.map(async (post) => {
      const images = await pool.query(
        `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
        [post.post_id]
      );
      return transformKeys({ ...post, images: transformArray(images.rows) });
    }));

    return { posts, total };
  },

  /**
   * Get posts by author (for profile)
   */
  async getByAuthor(authorId, { page = 1, limit = 20, includeUnpublished = false }) {
    const offset = (page - 1) * limit;

    let statusCondition = includeUnpublished
      ? `p.status IN ('published', 'pending_review')`
      : `p.status = 'published'`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM posts p
       WHERE p.author_id = $1 AND ${statusCondition}`,
      [authorId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
              p.status, p.created_at, p.updated_at, p.team_id,
              m.member_id as author_id, m.uuid as author_uuid, m.full_name as author_name,
              m.avatar_url as author_avatar, m.role as author_role,
              t.name as team_name, t.uuid as team_uuid,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       LEFT JOIN teams t ON p.team_id = t.team_id
       WHERE p.author_id = $1 AND ${statusCondition}
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [authorId, limit, offset]
    );

    // Get images and tags
    const posts = await Promise.all(result.rows.map(async (post) => {
      const [images, tags] = await Promise.all([
        pool.query(
          `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
          [post.post_id]
        ),
        pool.query(
          `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url
           FROM post_tags pt
           JOIN members m ON pt.tagged_member_id = m.member_id
           WHERE pt.post_id = $1`,
          [post.post_id]
        )
      ]);
      return transformKeys({ ...post, images: transformArray(images.rows), tagged_members: transformArray(tags.rows) });
    }));

    return { posts, total };
  },

  /**
   * Get posts where member is tagged
   */
  async getTaggedPosts(memberId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM post_tags pt
       JOIN posts p ON pt.post_id = p.post_id
       WHERE pt.tagged_member_id = $1 AND p.status = 'published'`,
      [memberId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
              p.created_at, m.member_id as author_id, m.uuid as author_uuid,
              m.full_name as author_name, m.avatar_url as author_avatar, m.role as author_role,
              (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) as like_count,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.post_id) as comment_count
       FROM post_tags pt
       JOIN posts p ON pt.post_id = p.post_id
       JOIN members m ON p.author_id = m.member_id
       WHERE pt.tagged_member_id = $1 AND p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    // Get images and tags
    const posts = await Promise.all(result.rows.map(async (post) => {
      const [images, tags] = await Promise.all([
        pool.query(
          `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
          [post.post_id]
        ),
        pool.query(
          `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url
           FROM post_tags pt
           JOIN members m ON pt.tagged_member_id = m.member_id
           WHERE pt.post_id = $1`,
          [post.post_id]
        )
      ]);
      return transformKeys({ ...post, images: transformArray(images.rows), tagged_members: transformArray(tags.rows) });
    }));

    return { posts, total };
  },

  /**
   * Approve a post
   */
  async approve(postId, reviewedBy) {
    const result = await pool.query(
      `UPDATE posts
       SET status = 'published', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE post_id = $1 AND status = 'pending_review'
       RETURNING post_id, uuid, status`,
      [postId, reviewedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Reject a post
   */
  async reject(postId, reviewedBy, rejectionNote) {
    const result = await pool.query(
      `UPDATE posts
       SET status = 'rejected', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, rejection_note = $3
       WHERE post_id = $1 AND status = 'pending_review'
       RETURNING post_id, uuid, status, rejection_note`,
      [postId, reviewedBy, rejectionNote]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Delete a post
   */
  async delete(postId) {
    const result = await pool.query(
      'DELETE FROM posts WHERE post_id = $1 RETURNING post_id',
      [postId]
    );
    return result.rows.length > 0;
  },

  /**
   * Add images to post
   * Uses parameterized queries to prevent SQL injection
   */
  async addImages(postId, images) {
    if (!images || images.length === 0) return;

    // Build parameterized query to prevent SQL injection
    const params = [postId];
    const valuesClauses = images.map((img, i) => {
      const baseIndex = params.length;
      // Sanitize and validate inputs
      const url = String(img.url || '').slice(0, 2048);
      const name = String(img.name || '').slice(0, 255);
      const size = parseInt(img.size, 10) || 0;
      params.push(url, name, size, i);
      return `($1, $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
    });

    await pool.query(
      `INSERT INTO post_images (post_id, blob_url, blob_name, file_size, display_order)
       VALUES ${valuesClauses.join(', ')}`,
      params
    );
  },

  /**
   * Add tags to post
   */
  async addTags(postId, memberIds) {
    if (memberIds.length === 0) return;

    const values = memberIds.map((id, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO post_tags (post_id, tagged_member_id) VALUES ${values}
       ON CONFLICT DO NOTHING`,
      [postId, ...memberIds]
    );
  },

  /**
   * Check if member liked a post
   */
  async isLikedByMember(postId, memberId) {
    const result = await pool.query(
      'SELECT 1 FROM likes WHERE post_id = $1 AND member_id = $2',
      [postId, memberId]
    );
    return result.rows.length > 0;
  },

  /**
   * Get list of members who liked a post
   */
  async getLikers(postId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM likes WHERE post_id = $1',
      [postId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url, m.class_grade, m.role, l.created_at as liked_at
       FROM likes l
       JOIN members m ON l.member_id = m.member_id
       WHERE l.post_id = $1 AND m.is_active = TRUE AND m.status = 'active'
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    return { likers: transformArray(result.rows), total };
  },

  /**
   * Toggle like on post
   */
  async toggleLike(postId, memberId) {
    const existing = await pool.query(
      'SELECT like_id FROM likes WHERE post_id = $1 AND member_id = $2',
      [postId, memberId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM likes WHERE post_id = $1 AND member_id = $2',
        [postId, memberId]
      );
    } else {
      await pool.query(
        'INSERT INTO likes (post_id, member_id) VALUES ($1, $2)',
        [postId, memberId]
      );
    }

    // Get the updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [postId]
    );

    return {
      liked: existing.rows.length === 0,
      likeCount: parseInt(countResult.rows[0].count)
    };
  },

  /**
   * Get post images
   */
  async getImages(postId) {
    const result = await pool.query(
      `SELECT image_id, blob_url, blob_name, display_order
       FROM post_images WHERE post_id = $1 ORDER BY display_order`,
      [postId]
    );
    return transformArray(result.rows);
  },

  // ============================================
  // MULTI-CATEGORY SUPPORT
  // ============================================

  /**
   * Add categories to a post (for multi-category posts)
   */
  async addCategories(postId, categories) {
    if (!categories || categories.length === 0) return;

    const values = categories.map((cat, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO post_categories (post_id, category)
       VALUES ${values}
       ON CONFLICT (post_id, category) DO NOTHING`,
      [postId, ...categories]
    );
  },

  /**
   * Get all categories for a post
   */
  async getCategories(postId) {
    const result = await pool.query(
      `SELECT category FROM post_categories WHERE post_id = $1 ORDER BY category`,
      [postId]
    );
    return result.rows.map(r => r.category);
  },

  /**
   * Add an approval for a specific category
   */
  async addApproval(postId, category, approvedBy) {
    const result = await pool.query(
      `INSERT INTO post_approvals (post_id, category, approved_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, category) DO NOTHING
       RETURNING approval_id, category, approved_at`,
      [postId, category, approvedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get all approvals for a post
   */
  async getApprovals(postId) {
    const result = await pool.query(
      `SELECT pa.category, pa.approved_at, m.full_name as approved_by_name, m.uuid as approved_by_uuid
       FROM post_approvals pa
       JOIN members m ON pa.approved_by = m.member_id
       WHERE pa.post_id = $1
       ORDER BY pa.approved_at`,
      [postId]
    );
    return transformArray(result.rows);
  },

  /**
   * Check if a post has all required category approvals
   */
  async isFullyApproved(postId) {
    // Get count of categories and approvals
    const result = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM post_categories WHERE post_id = $1) as category_count,
         (SELECT COUNT(*) FROM post_approvals WHERE post_id = $1) as approval_count`,
      [postId]
    );
    const { category_count, approval_count } = result.rows[0];

    // If no categories in post_categories, use the single category from posts table
    if (parseInt(category_count) === 0) {
      return true; // Single-category post - handled by simple approve
    }

    return parseInt(category_count) === parseInt(approval_count);
  },

  /**
   * Publish a post (called when all approvals are received)
   */
  async publish(postId) {
    const result = await pool.query(
      `UPDATE posts
       SET status = 'published', reviewed_at = CURRENT_TIMESTAMP
       WHERE post_id = $1 AND status = 'pending_review'
       RETURNING post_id, uuid, status`,
      [postId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get pending posts that a director can approve based on their category assignments
   */
  async getPendingForDirector(memberId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    // Get posts where:
    // 1. Post is pending review
    // 2. Post has a category (single or multi) that the director is assigned to
    // 3. The director hasn't already approved that category
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT p.post_id)
       FROM posts p
       JOIN director_categories dc ON (
         p.category = dc.category OR
         EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.post_id AND pc.category = dc.category)
       )
       LEFT JOIN post_approvals pa ON p.post_id = pa.post_id AND dc.category = pa.category
       WHERE p.status = 'pending_review'
         AND dc.member_id = $1
         AND pa.approval_id IS NULL`,
      [memberId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT DISTINCT p.post_id, p.uuid, p.category, p.body, p.link_url, p.link_title, p.link_image,
              p.created_at, m.member_id as author_id, m.uuid as author_uuid,
              m.full_name as author_name, m.avatar_url as author_avatar,
              array_agg(DISTINCT dc.category) FILTER (WHERE pa.approval_id IS NULL) as pending_categories
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       JOIN director_categories dc ON (
         p.category = dc.category OR
         EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.post_id AND pc.category = dc.category)
       )
       LEFT JOIN post_approvals pa ON p.post_id = pa.post_id AND dc.category = pa.category
       WHERE p.status = 'pending_review'
         AND dc.member_id = $1
         AND pa.approval_id IS NULL
       GROUP BY p.post_id, m.member_id
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    // Get images for each post
    const posts = await Promise.all(result.rows.map(async (post) => {
      const images = await pool.query(
        `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
        [post.post_id]
      );
      return transformKeys({ ...post, images: transformArray(images.rows) });
    }));

    return { posts, total };
  },

  // ============================================
  // TEAM POST SUPPORT
  // ============================================

  /**
   * Create a post linked to a team
   */
  async createTeamPost({ authorId, teamId, category, body, status = 'pending_review', taggedMemberIds = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the post with team_id
      const result = await client.query(
        `INSERT INTO posts (author_id, team_id, category, body, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING post_id, uuid, author_id, team_id, category, body, status, created_at`,
        [authorId, teamId, category, body, status]
      );
      const post = result.rows[0];

      // Add tagged members if any
      if (taggedMemberIds && taggedMemberIds.length > 0) {
        const tagValues = taggedMemberIds.map((id, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO post_tags (post_id, tagged_member_id) VALUES ${tagValues}
           ON CONFLICT DO NOTHING`,
          [post.post_id, ...taggedMemberIds]
        );
      }

      await client.query('COMMIT');
      return transformKeys(post);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get pending team posts for a team director
   * Returns posts that are:
   * 1. Linked to a team (team_id is not null)
   * 2. The member is a director in that team
   * 3. The post is pending review
   */
  async getPendingTeamPostsForDirector(teamId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM posts p
       WHERE p.status = 'pending_review'
         AND p.team_id = $1`,
      [teamId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.post_id, p.uuid, p.category, p.body, p.created_at,
              m.member_id as author_id, m.uuid as author_uuid,
              m.full_name as author_name, m.avatar_url as author_avatar,
              t.name as team_name, t.uuid as team_uuid
       FROM posts p
       JOIN members m ON p.author_id = m.member_id
       JOIN teams t ON p.team_id = t.team_id
       WHERE p.status = 'pending_review'
         AND p.team_id = $1
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [teamId, limit, offset]
    );

    // Get images for each post
    const posts = await Promise.all(result.rows.map(async (post) => {
      const images = await pool.query(
        `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
        [post.post_id]
      );
      return transformKeys({ ...post, images: transformArray(images.rows) });
    }));

    return { posts, total };
  },

  /**
   * Check if a post is a team post
   */
  async isTeamPost(postId) {
    const result = await pool.query(
      'SELECT team_id FROM posts WHERE post_id = $1 AND team_id IS NOT NULL',
      [postId]
    );
    return result.rowCount > 0;
  },

  /**
   * Get the linked project for a post (if any)
   * Returns project info including team_id
   */
  async getLinkedProject(postId) {
    const result = await pool.query(
      `SELECT p.project_id, p.uuid, p.title, p.team_id, t.name as team_name
       FROM post_projects pp
       JOIN projects p ON pp.project_id = p.project_id
       LEFT JOIN teams t ON p.team_id = t.team_id
       WHERE pp.post_id = $1
       LIMIT 1`,
      [postId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get pending project posts for a team director
   * Returns posts linked to projects in teams where the member is a director
   */
  async getPendingProjectPostsForTeamDirector(memberId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    // Get posts that:
    // 1. Are pending review
    // 2. Are linked to a project (via post_projects)
    // 3. The project belongs to a team where the member is a director
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT p.post_id)
       FROM posts p
       JOIN post_projects pp ON p.post_id = pp.post_id
       JOIN projects pr ON pp.project_id = pr.project_id
       JOIN team_members tm ON pr.team_id = tm.team_id
       WHERE p.status = 'pending_review'
         AND tm.member_id = $1
         AND tm.role = 'director'
         AND tm.is_active = TRUE`,
      [memberId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT DISTINCT p.post_id, p.uuid, p.category, p.body, p.created_at,
              m.member_id as author_id, m.uuid as author_uuid,
              m.full_name as author_name, m.avatar_url as author_avatar,
              pr.project_id, pr.uuid as project_uuid, pr.title as project_title,
              t.name as team_name, t.uuid as team_uuid
       FROM posts p
       JOIN post_projects pp ON p.post_id = pp.post_id
       JOIN projects pr ON pp.project_id = pr.project_id
       JOIN teams t ON pr.team_id = t.team_id
       JOIN team_members tm ON pr.team_id = tm.team_id
       JOIN members m ON p.author_id = m.member_id
       WHERE p.status = 'pending_review'
         AND tm.member_id = $1
         AND tm.role = 'director'
         AND tm.is_active = TRUE
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    // Get images for each post
    const posts = await Promise.all(result.rows.map(async (post) => {
      const images = await pool.query(
        `SELECT blob_url, display_order FROM post_images WHERE post_id = $1 ORDER BY display_order`,
        [post.post_id]
      );
      return transformKeys({ ...post, images: transformArray(images.rows) });
    }));

    return { posts, total };
  }
};

module.exports = Post;
