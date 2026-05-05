const { pool } = require('../config/database');

const Class = {
  /**
   * Create a new class
   */
  async create({ schoolId, name, gradeLevel, academicYear }) {
    const result = await pool.query(
      `INSERT INTO classes (school_id, name, grade_level, academic_year)
       VALUES ($1, $2, $3, $4)
       RETURNING class_id, uuid, school_id, name, grade_level, academic_year, created_at`,
      [schoolId, name, gradeLevel, academicYear]
    );
    return result.rows[0];
  },

  /**
   * Find class by ID
   */
  async findById(classId) {
    const result = await pool.query(
      `SELECT c.class_id, c.uuid, c.school_id, c.name, c.grade_level, c.academic_year,
              c.is_active, c.created_at, c.updated_at,
              s.name as school_name, s.uuid as school_uuid
       FROM classes c
       LEFT JOIN schools s ON c.school_id = s.school_id
       WHERE c.class_id = $1 AND c.is_active = TRUE`,
      [classId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find class by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT c.class_id, c.uuid, c.school_id, c.name, c.grade_level, c.academic_year,
              c.is_active, c.created_at, c.updated_at,
              s.name as school_name, s.uuid as school_uuid
       FROM classes c
       LEFT JOIN schools s ON c.school_id = s.school_id
       WHERE c.uuid = $1 AND c.is_active = TRUE`,
      [uuid]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all classes with member counts
   */
  async getAll({ page = 1, limit = 50, search = '', schoolId = null }) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    let countQuery = `
      SELECT COUNT(*) FROM classes c
      LEFT JOIN schools s ON c.school_id = s.school_id
      WHERE c.is_active = TRUE
      AND (c.name ILIKE $1 OR s.name ILIKE $1)
    `;
    let listQuery = `
      SELECT c.class_id, c.uuid, c.name, c.grade_level, c.academic_year,
             c.created_at,
             s.school_id, s.uuid as school_uuid, s.name as school_name,
             COUNT(m.member_id) as member_count
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.school_id
      LEFT JOIN members m ON c.class_id = m.class_id AND m.status = 'active' AND m.is_active = TRUE
      WHERE c.is_active = TRUE
      AND (c.name ILIKE $1 OR s.name ILIKE $1)
    `;

    const params = [searchPattern];

    if (schoolId) {
      countQuery += ` AND c.school_id = $2`;
      listQuery += ` AND c.school_id = $2`;
      params.push(schoolId);
    }

    listQuery += `
      GROUP BY c.class_id, s.school_id
      ORDER BY s.name ASC, c.grade_level ASC, c.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, schoolId ? [searchPattern, schoolId] : [searchPattern]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(listQuery, params);

    return { classes: result.rows, total };
  },

  /**
   * Get class with full details including members
   */
  async getWithDetails(uuid) {
    const classInfo = await this.findByUuid(uuid);
    if (!classInfo) return null;

    // Get member count
    const memberCount = await pool.query(
      `SELECT COUNT(*) FROM members
       WHERE class_id = $1 AND status = 'active' AND is_active = TRUE`,
      [classInfo.class_id]
    );

    // Get members in this class
    const members = await pool.query(
      `SELECT member_id, uuid, full_name, avatar_url, role, bio, created_at
       FROM members
       WHERE class_id = $1 AND status = 'active' AND is_active = TRUE
       ORDER BY full_name ASC`,
      [classInfo.class_id]
    );

    return {
      ...classInfo,
      member_count: parseInt(memberCount.rows[0].count),
      members: members.rows
    };
  },

  /**
   * Get members from a class
   */
  async getMembers(classId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM members
       WHERE class_id = $1 AND status = 'active' AND is_active = TRUE`,
      [classId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url, m.role, m.bio, m.created_at,
              s.name as school_name, s.uuid as school_uuid
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       WHERE m.class_id = $1 AND m.status = 'active' AND m.is_active = TRUE
       ORDER BY m.full_name ASC
       LIMIT $2 OFFSET $3`,
      [classId, limit, offset]
    );

    return { members: result.rows, total };
  },

  /**
   * Get classes by school
   */
  async getBySchool(schoolId) {
    const result = await pool.query(
      `SELECT c.class_id, c.uuid, c.name, c.grade_level, c.academic_year,
              COUNT(m.member_id) as member_count
       FROM classes c
       LEFT JOIN members m ON c.class_id = m.class_id AND m.status = 'active' AND m.is_active = TRUE
       WHERE c.school_id = $1 AND c.is_active = TRUE
       GROUP BY c.class_id
       ORDER BY c.grade_level ASC, c.name ASC`,
      [schoolId]
    );
    return result.rows;
  },

  /**
   * Update class
   */
  async update(classId, { name, gradeLevel, academicYear }) {
    const result = await pool.query(
      `UPDATE classes
       SET name = COALESCE($2, name),
           grade_level = COALESCE($3, grade_level),
           academic_year = COALESCE($4, academic_year)
       WHERE class_id = $1 AND is_active = TRUE
       RETURNING class_id, uuid, name, grade_level, academic_year, updated_at`,
      [classId, name, gradeLevel, academicYear]
    );
    return result.rows[0] || null;
  },

  /**
   * Soft delete class
   */
  async delete(classId) {
    const result = await pool.query(
      `UPDATE classes SET is_active = FALSE WHERE class_id = $1 RETURNING class_id`,
      [classId]
    );
    return result.rows.length > 0;
  },

  /**
   * Search classes for dropdown/autocomplete
   */
  async search(query, schoolId = null, limit = 10) {
    let sql = `
      SELECT c.class_id, c.uuid, c.name, c.grade_level,
             s.name as school_name, s.uuid as school_uuid
      FROM classes c
      LEFT JOIN schools s ON c.school_id = s.school_id
      WHERE c.is_active = TRUE
      AND c.name ILIKE $1
    `;
    const params = [`%${query}%`];

    if (schoolId) {
      sql += ` AND c.school_id = $2`;
      params.push(schoolId);
    }

    sql += ` ORDER BY c.grade_level ASC, c.name ASC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(sql, params);
    return result.rows;
  }
};

module.exports = Class;
