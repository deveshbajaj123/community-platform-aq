const { pool } = require('../config/database');

const VALID_CATEGORIES = ['events', 'welfare', 'content', 'operations', 'labs'];

const DirectorCategory = {
  /**
   * Assign a category to a director
   */
  async assign(memberId, category, assignedBy) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    const result = await pool.query(
      `INSERT INTO director_categories (member_id, category, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (member_id, category) DO NOTHING
       RETURNING assignment_id, member_id, category, assigned_at`,
      [memberId, category, assignedBy]
    );
    return result.rows[0] || null;
  },

  /**
   * Remove a category assignment from a director
   */
  async unassign(memberId, category) {
    const result = await pool.query(
      `DELETE FROM director_categories
       WHERE member_id = $1 AND category = $2
       RETURNING assignment_id`,
      [memberId, category]
    );
    return result.rowCount > 0;
  },

  /**
   * Get all categories assigned to a director
   */
  async getByMember(memberId) {
    const result = await pool.query(
      `SELECT dc.assignment_id, dc.category, dc.assigned_at,
              m.full_name as assigned_by_name
       FROM director_categories dc
       LEFT JOIN members m ON dc.assigned_by = m.member_id
       WHERE dc.member_id = $1
       ORDER BY dc.category`,
      [memberId]
    );
    return result.rows;
  },

  /**
   * Get all directors assigned to a category
   */
  async getByCategory(category) {
    const result = await pool.query(
      `SELECT dc.assignment_id, dc.assigned_at,
              m.member_id, m.uuid, m.full_name, m.avatar_url, m.email
       FROM director_categories dc
       JOIN members m ON dc.member_id = m.member_id
       WHERE dc.category = $1 AND m.role = 'director' AND m.is_active = TRUE
       ORDER BY dc.assigned_at`,
      [category]
    );
    return result.rows;
  },

  /**
   * Check if a director is assigned to a category
   */
  async isAssigned(memberId, category) {
    const result = await pool.query(
      `SELECT 1 FROM director_categories
       WHERE member_id = $1 AND category = $2`,
      [memberId, category]
    );
    return result.rowCount > 0;
  },

  /**
   * Get all category assignments with director info
   */
  async getAllAssignments() {
    const result = await pool.query(
      `SELECT dc.assignment_id, dc.category, dc.assigned_at,
              m.member_id, m.uuid, m.full_name, m.avatar_url, m.email
       FROM director_categories dc
       JOIN members m ON dc.member_id = m.member_id
       WHERE m.role = 'director' AND m.is_active = TRUE
       ORDER BY dc.category, m.full_name`
    );
    return result.rows;
  },

  /**
   * Get categories that need approval for a post
   * Returns categories where the post hasn't been approved yet
   */
  async getPendingCategoriesForPost(postId) {
    const result = await pool.query(
      `SELECT pc.category
       FROM post_categories pc
       LEFT JOIN post_approvals pa ON pc.post_id = pa.post_id AND pc.category = pa.category
       WHERE pc.post_id = $1 AND pa.approval_id IS NULL`,
      [postId]
    );
    return result.rows.map(r => r.category);
  },

  /**
   * Check if director can approve a post (has assignment for at least one of its categories)
   */
  async canApprovePost(memberId, postId) {
    const result = await pool.query(
      `SELECT 1 FROM post_categories pc
       JOIN director_categories dc ON pc.category = dc.category
       LEFT JOIN post_approvals pa ON pc.post_id = pa.post_id AND pc.category = pa.category
       WHERE pc.post_id = $1 AND dc.member_id = $2 AND pa.approval_id IS NULL
       LIMIT 1`,
      [postId, memberId]
    );
    return result.rowCount > 0;
  },

  /**
   * Get valid categories list
   */
  getValidCategories() {
    return VALID_CATEGORIES;
  }
};

module.exports = DirectorCategory;
