const { pool } = require('../config/database');
const { transformKeys, transformArray } = require('../utils/caseTransform');

const Member = {
  /**
   * Find member by ID
   */
  async findById(memberId) {
    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.google_id, m.email, m.full_name, m.avatar_url,
              m.class_grade, m.phone, m.join_reason, m.role, m.status, m.rejection_note,
              m.bio, m.school_id, m.class_id, m.is_super_admin,
              m.created_at, m.updated_at, m.last_login,
              s.name as school_name, s.uuid as school_uuid,
              c.name as class_name, c.uuid as class_uuid
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.member_id = $1 AND m.is_active = TRUE`,
      [memberId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find member by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.google_id, m.email, m.full_name, m.avatar_url,
              m.class_grade, m.phone, m.join_reason, m.role, m.status, m.rejection_note,
              m.bio, m.school_id, m.class_id, m.is_super_admin,
              m.created_at, m.updated_at, m.last_login,
              s.name as school_name, s.uuid as school_uuid,
              c.name as class_name, c.uuid as class_uuid
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.uuid = $1 AND m.is_active = TRUE`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find member by email
   */
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.google_id, m.email, m.full_name, m.avatar_url,
              m.class_grade, m.phone, m.join_reason, m.role, m.status, m.rejection_note,
              m.bio, m.school_id, m.class_id, m.is_super_admin,
              m.created_at, m.updated_at, m.last_login,
              s.name as school_name, s.uuid as school_uuid,
              c.name as class_name, c.uuid as class_uuid
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.email = $1 AND m.is_active = TRUE`,
      [email]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find member by Google ID
   */
  async findByGoogleId(googleId) {
    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.google_id, m.email, m.full_name, m.avatar_url,
              m.class_grade, m.phone, m.join_reason, m.role, m.status, m.rejection_note,
              m.bio, m.school_id, m.class_id, m.is_super_admin,
              m.created_at, m.updated_at, m.last_login,
              s.name as school_name, s.uuid as school_uuid,
              c.name as class_name, c.uuid as class_uuid
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.google_id = $1 AND m.is_active = TRUE`,
      [googleId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Create new member
   */
  async create({ googleId, email, fullName, avatarUrl, classGrade, phone, joinReason, schoolId, classId, bio }) {
    const result = await pool.query(
      `INSERT INTO members (google_id, email, full_name, avatar_url, class_grade, phone, join_reason, school_id, class_id, bio, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval')
       RETURNING member_id, uuid, google_id, email, full_name, avatar_url, class_grade, phone, join_reason, school_id, class_id, bio, role, status, created_at`,
      [googleId, email, fullName, avatarUrl, classGrade, phone, joinReason, schoolId || null, classId || null, bio || null]
    );
    return transformKeys(result.rows[0]);
  },

  /**
   * Update member profile
   */
  async update(memberId, { fullName, avatarUrl, classGrade, phone, email, schoolId, classId, bio }) {
    const result = await pool.query(
      `UPDATE members
       SET full_name = COALESCE($2, full_name),
           avatar_url = COALESCE($3, avatar_url),
           class_grade = COALESCE($4, class_grade),
           phone = COALESCE($5, phone),
           email = COALESCE($6, email),
           school_id = COALESCE($7, school_id),
           class_id = COALESCE($8, class_id),
           bio = COALESCE($9, bio)
       WHERE member_id = $1 AND is_active = TRUE
       RETURNING member_id, uuid, email, full_name, avatar_url, class_grade, phone, school_id, class_id, bio, role, status`,
      [memberId, fullName, avatarUrl, classGrade, phone, email, schoolId, classId, bio]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(memberId) {
    await pool.query(
      'UPDATE members SET last_login = CURRENT_TIMESTAMP WHERE member_id = $1',
      [memberId]
    );
  },

  /**
   * Update Google ID for a member (link Google account)
   */
  async updateGoogleId(memberId, googleId) {
    await pool.query(
      'UPDATE members SET google_id = $1 WHERE member_id = $2',
      [googleId, memberId]
    );
  },

  /**
   * Approve member account
   */
  async approve(memberId, approvedBy) {
    const result = await pool.query(
      `UPDATE members
       SET status = 'active', approved_by = $2, approved_at = CURRENT_TIMESTAMP, rejection_note = NULL
       WHERE member_id = $1 AND status = 'pending_approval'
       RETURNING member_id, uuid, email, full_name, status`,
      [memberId, approvedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Reject member account
   */
  async reject(memberId, rejectionNote, rejectedBy) {
    const result = await pool.query(
      `UPDATE members
       SET status = 'rejected', rejection_note = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP
       WHERE member_id = $1 AND status = 'pending_approval'
       RETURNING member_id, uuid, email, full_name, status, rejection_note`,
      [memberId, rejectionNote, rejectedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get pending approvals
   */
  async getPendingApprovals({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM members WHERE status = 'pending_approval' AND role = 'member'`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT member_id, uuid, email, full_name, avatar_url, class_grade, phone, join_reason, created_at
       FROM members
       WHERE status = 'pending_approval' AND role = 'member'
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { members: transformArray(result.rows), total };
  },

  /**
   * Get all active members (for member directory)
   */
  async getActiveMembers({ page = 1, limit = 20, search = '', schoolId = null, classId = null }) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    let countQuery = `
      SELECT COUNT(*) FROM members m
      LEFT JOIN schools s ON m.school_id = s.school_id
      WHERE m.status = 'active' AND m.is_active = TRUE
      AND (m.full_name ILIKE $1 OR m.email ILIKE $1 OR m.class_grade ILIKE $1 OR s.name ILIKE $1)
    `;
    let listQuery = `
      SELECT m.member_id, m.uuid, m.email, m.full_name, m.avatar_url, m.class_grade, m.bio, m.role, m.created_at,
             s.name as school_name, s.uuid as school_uuid,
             c.name as class_name, c.uuid as class_uuid
      FROM members m
      LEFT JOIN schools s ON m.school_id = s.school_id
      LEFT JOIN classes c ON m.class_id = c.class_id
      WHERE m.status = 'active' AND m.is_active = TRUE
      AND (m.full_name ILIKE $1 OR m.email ILIKE $1 OR m.class_grade ILIKE $1 OR s.name ILIKE $1)
    `;

    const params = [searchPattern];

    if (schoolId) {
      countQuery += ` AND m.school_id = $${params.length + 1}`;
      listQuery += ` AND m.school_id = $${params.length + 1}`;
      params.push(schoolId);
    }

    if (classId) {
      countQuery += ` AND m.class_id = $${params.length + 1}`;
      listQuery += ` AND m.class_id = $${params.length + 1}`;
      params.push(classId);
    }

    listQuery += ` ORDER BY m.full_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(listQuery, params);

    return { members: transformArray(result.rows), total };
  },

  /**
   * Search members for @mentions
   */
  async searchForMention(query, limit = 10) {
    const result = await pool.query(
      `SELECT member_id, uuid, full_name, avatar_url
       FROM members
       WHERE status = 'active' AND is_active = TRUE
       AND full_name ILIKE $1
       ORDER BY full_name ASC
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    return transformArray(result.rows);
  },

  /**
   * Get member public profile
   */
  async getPublicProfile(uuid) {
    const result = await pool.query(
      `SELECT m.member_id, m.uuid, m.full_name, m.avatar_url, m.class_grade, m.bio, m.role, m.created_at,
              s.school_id, s.uuid as school_uuid, s.name as school_name, s.logo_url as school_logo,
              c.class_id, c.uuid as class_uuid, c.name as class_name,
              (SELECT COUNT(DISTINCT p.post_id) FROM posts p
                LEFT JOIN post_tags pt ON pt.post_id = p.post_id
                WHERE (p.author_id = m.member_id OR pt.tagged_member_id = m.member_id)
                  AND p.status = 'published') as post_count,
              (SELECT COUNT(*) FROM post_tags pt
               JOIN posts p2 ON pt.post_id = p2.post_id
               WHERE pt.tagged_member_id = m.member_id AND p2.status = 'published') as tagged_count
       FROM members m
       LEFT JOIN schools s ON m.school_id = s.school_id
       LEFT JOIN classes c ON m.class_id = c.class_id
       WHERE m.uuid = $1 AND m.status = 'active' AND m.is_active = TRUE`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Promote member to super admin (director + super_admin)
   */
  async promoteToSuperAdmin(memberId) {
    const result = await pool.query(
      `UPDATE members
       SET role = 'director', is_super_admin = TRUE, status = 'active'
       WHERE member_id = $1
       RETURNING member_id, uuid, email, full_name, role, is_super_admin`,
      [memberId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Promote a member to director role
   */
  async promoteToDirector(memberId) {
    const result = await pool.query(
      `UPDATE members
       SET role = 'director'
       WHERE member_id = $1 AND role = 'member' AND status = 'active' AND is_active = TRUE
       RETURNING member_id, uuid, email, full_name, role`,
      [memberId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Demote a director back to member role
   */
  async demoteToMember(memberId) {
    // First remove all category assignments
    await pool.query('DELETE FROM director_categories WHERE member_id = $1', [memberId]);

    // Then demote (cannot demote super-admin)
    const result = await pool.query(
      `UPDATE members
       SET role = 'member'
       WHERE member_id = $1 AND role = 'director' AND is_super_admin = FALSE
       RETURNING member_id, uuid, email, full_name, role`,
      [memberId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get active members eligible for director promotion
   */
  async getEligibleForPromotion({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${search}%`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM members
       WHERE role = 'member' AND status = 'active' AND is_active = TRUE
       AND (full_name ILIKE $1 OR email ILIKE $1)`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT member_id, uuid, email, full_name, avatar_url, class_grade, created_at
       FROM members
       WHERE role = 'member' AND status = 'active' AND is_active = TRUE
       AND (full_name ILIKE $1 OR email ILIKE $1)
       ORDER BY full_name ASC
       LIMIT $2 OFFSET $3`,
      [searchPattern, limit, offset]
    );

    return { members: transformArray(result.rows), total };
  },

  /**
   * Hard-delete a member and clean up all foreign key references.
   * Runs in a transaction: SET NULL on non-cascading FKs, then DELETE (CASCADE handles the rest).
   */
  async deleteMember(memberId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // SET NULL on all non-cascading foreign keys referencing this member
      await client.query('UPDATE members SET approved_by = NULL WHERE approved_by = $1', [memberId]);
      await client.query('UPDATE posts SET reviewed_by = NULL WHERE reviewed_by = $1', [memberId]);
      await client.query('UPDATE director_categories SET assigned_by = NULL WHERE assigned_by = $1', [memberId]);
      await client.query('UPDATE post_approvals SET approved_by = NULL WHERE approved_by = $1', [memberId]);
      await client.query('UPDATE teams SET created_by = NULL WHERE created_by = $1', [memberId]);
      await client.query('UPDATE projects SET created_by = NULL WHERE created_by = $1', [memberId]);
      await client.query('UPDATE community_audit_logs SET member_id = NULL WHERE member_id = $1', [memberId]);

      // DELETE the member — CASCADE handles posts, likes, comments, sessions, tags, team_members, etc.
      const result = await client.query(
        'DELETE FROM members WHERE member_id = $1 RETURNING member_id, uuid, email, full_name, role, is_super_admin',
        [memberId]
      );

      await client.query('COMMIT');
      return result.rows[0] ? transformKeys(result.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

module.exports = Member;
