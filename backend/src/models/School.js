const { pool } = require('../config/database');

const School = {
  /**
   * Create a new school
   */
  async create({ name, shortName, logoUrl, location, website }) {
    const result = await pool.query(
      `INSERT INTO schools (name, short_name, logo_url, location, website)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING school_id, uuid, name, short_name, logo_url, location, website, created_at`,
      [name, shortName, logoUrl, location, website]
    );
    return result.rows[0];
  },

  /**
   * Find school by ID
   */
  async findById(schoolId) {
    const result = await pool.query(
      `SELECT school_id, uuid, name, short_name, logo_url, location, website, is_active, created_at, updated_at
       FROM schools WHERE school_id = $1 AND is_active = TRUE`,
      [schoolId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find school by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT school_id, uuid, name, short_name, logo_url, location, website, is_active, created_at, updated_at
       FROM schools WHERE uuid = $1 AND is_active = TRUE`,
      [uuid]
    );
    return result.rows[0] || null;
  },

  /**
   * Find school by name
   */
  async findByName(name) {
    const result = await pool.query(
      `SELECT school_id, uuid, name, short_name, logo_url, location, website, is_active, created_at, updated_at
       FROM schools WHERE LOWER(name) = LOWER($1) AND is_active = TRUE`,
      [name]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all schools with member counts
   */
  async getAll({ page = 1, limit = 50, search = '' }) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM schools
       WHERE is_active = TRUE
       AND (name ILIKE $1 OR short_name ILIKE $1 OR location ILIKE $1)`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT s.school_id, s.uuid, s.name, s.short_name, s.logo_url, s.location, s.website,
              s.created_at,
              COUNT(m.member_id) as member_count
       FROM schools s
       LEFT JOIN members m ON s.school_id = m.school_id AND m.status = 'active' AND m.is_active = TRUE
       WHERE s.is_active = TRUE
       AND (s.name ILIKE $1 OR s.short_name ILIKE $1 OR s.location ILIKE $1)
       GROUP BY s.school_id
       ORDER BY s.name ASC
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    return { schools: result.rows, total };
  },

  /**
   * Get school with full details including members
   */
  async getWithDetails(uuid) {
    const school = await this.findByUuid(uuid);
    if (!school) return null;

    // Get member count
    const memberCount = await pool.query(
      `SELECT COUNT(*) FROM members
       WHERE school_id = $1 AND status = 'active' AND is_active = TRUE`,
      [school.school_id]
    );

    // Get recent members
    const recentMembers = await pool.query(
      `SELECT member_id, uuid, full_name, avatar_url, class_grade, role
       FROM members
       WHERE school_id = $1 AND status = 'active' AND is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 10`,
      [school.school_id]
    );

    // Get classes at this school
    const classes = await pool.query(
      `SELECT c.class_id, c.uuid, c.name, c.grade_level, c.academic_year,
              COUNT(m.member_id) as member_count
       FROM classes c
       LEFT JOIN members m ON c.class_id = m.class_id AND m.status = 'active' AND m.is_active = TRUE
       WHERE c.school_id = $1 AND c.is_active = TRUE
       GROUP BY c.class_id
       ORDER BY c.grade_level ASC, c.name ASC`,
      [school.school_id]
    );

    return {
      ...school,
      member_count: parseInt(memberCount.rows[0].count),
      recent_members: recentMembers.rows,
      classes: classes.rows
    };
  },

  /**
   * Get members from a school
   */
  async getMembers(schoolId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM members
       WHERE school_id = $1 AND status = 'active' AND is_active = TRUE`,
      [schoolId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url, m.class_grade, m.role, m.bio,
              m.created_at,
              c.name as class_name, c.uuid as class_uuid
       FROM members m
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.school_id = $1 AND m.status = 'active' AND m.is_active = TRUE
       ORDER BY m.full_name ASC
       LIMIT $2 OFFSET $3`,
      [schoolId, limit, offset]
    );

    return { members: result.rows, total };
  },

  /**
   * Update school
   */
  async update(schoolId, { name, shortName, logoUrl, location, website }) {
    const result = await pool.query(
      `UPDATE schools
       SET name = COALESCE($2, name),
           short_name = COALESCE($3, short_name),
           logo_url = COALESCE($4, logo_url),
           location = COALESCE($5, location),
           website = COALESCE($6, website)
       WHERE school_id = $1 AND is_active = TRUE
       RETURNING school_id, uuid, name, short_name, logo_url, location, website, updated_at`,
      [schoolId, name, shortName, logoUrl, location, website]
    );
    return result.rows[0] || null;
  },

  /**
   * Soft delete school
   */
  async delete(schoolId) {
    const result = await pool.query(
      `UPDATE schools SET is_active = FALSE WHERE school_id = $1 RETURNING school_id`,
      [schoolId]
    );
    return result.rows.length > 0;
  },

  /**
   * Search schools for dropdown/autocomplete
   */
  async search(query, limit = 10) {
    const result = await pool.query(
      `SELECT school_id, uuid, name, short_name, logo_url
       FROM schools
       WHERE is_active = TRUE
       AND (name ILIKE $1 OR short_name ILIKE $1)
       ORDER BY name ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  }
};

module.exports = School;
