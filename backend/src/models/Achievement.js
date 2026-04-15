const { pool } = require('../config/database');
const { transformKeys, transformArray } = require('../utils/caseTransform');

const VALID_TYPES = ['leadership', 'academic', 'competition', 'personal_project', 'other'];

const Achievement = {
  /**
   * Create achievement
   */
  async create({ memberId, title, description, achievementType, achievementDate, achievementEndDate, proofUrl }) {
    const result = await pool.query(
      `INSERT INTO external_achievements (member_id, title, description, achievement_type, achievement_date, achievement_end_date, proof_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [memberId, title, description, achievementType, achievementDate, achievementEndDate || null, proofUrl]
    );
    return transformKeys(result.rows[0]);
  },

  /**
   * Find by ID
   */
  async findById(achievementId) {
    const result = await pool.query(
      `SELECT * FROM external_achievements WHERE achievement_id = $1`,
      [achievementId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT * FROM external_achievements WHERE uuid = $1`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Update achievement
   */
  async update(achievementId, { title, description, achievementType, achievementDate, achievementEndDate, proofUrl }) {
    const result = await pool.query(
      `UPDATE external_achievements
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           achievement_type = COALESCE($3, achievement_type),
           achievement_date = COALESCE($4, achievement_date),
           achievement_end_date = $5,
           proof_url = COALESCE($6, proof_url)
       WHERE achievement_id = $7
       RETURNING *`,
      [title, description, achievementType, achievementDate, achievementEndDate ?? null, proofUrl, achievementId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Delete achievement
   */
  async delete(achievementId) {
    const result = await pool.query(
      `DELETE FROM external_achievements WHERE achievement_id = $1 RETURNING *`,
      [achievementId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get achievements by member (with pagination)
   */
  async getByMember(memberId, { page = 1, limit = 20, type = null } = {}) {
    const offset = (page - 1) * limit;

    let countQuery = `SELECT COUNT(*) FROM external_achievements WHERE member_id = $1`;
    let dataQuery = `SELECT * FROM external_achievements WHERE member_id = $1`;
    const params = [memberId];

    // Optional type filter
    if (type && VALID_TYPES.includes(type)) {
      countQuery += ` AND achievement_type = $2`;
      dataQuery += ` AND achievement_type = $2`;
      params.push(type);
    }

    dataQuery += ` ORDER BY achievement_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(dataQuery, [...params, limit, offset]);
    const achievements = transformArray(result.rows);

    return { achievements, total };
  },

  /**
   * Get achievement count by member
   */
  async getCountByMember(memberId) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM external_achievements WHERE member_id = $1`,
      [memberId]
    );
    return parseInt(result.rows[0].count);
  }
};

module.exports = Achievement;
