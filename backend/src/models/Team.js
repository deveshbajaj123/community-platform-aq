const { pool } = require('../config/database');
const { transformKeys, transformArray } = require('../utils/caseTransform');
const DirectorCategory = require('./DirectorCategory');

const VALID_CATEGORIES = ['events', 'welfare', 'content', 'operations', 'labs'];
const VALID_ROLES = ['member', 'lead'];

const Team = {
  /**
   * Create a new team
   */
  async create({ name, description, category, logoUrl, createdBy }) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    const result = await pool.query(
      `INSERT INTO teams (name, description, category, logo_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING team_id, uuid, name, description, category, logo_url, is_active, created_by, created_at`,
      [name, description, category, logoUrl || null, createdBy]
    );
    return transformKeys(result.rows[0]);
  },

  /**
   * Find team by ID
   */
  async findById(teamId) {
    const result = await pool.query(
      `SELECT t.*,
              m.full_name as created_by_name, m.uuid as created_by_uuid,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = TRUE) as member_count,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.team_id) as project_count
       FROM teams t
       LEFT JOIN members m ON t.created_by = m.member_id
       WHERE t.team_id = $1`,
      [teamId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Find team by UUID
   */
  async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT t.*,
              m.full_name as created_by_name, m.uuid as created_by_uuid,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = TRUE) as member_count,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.team_id) as project_count
       FROM teams t
       LEFT JOIN members m ON t.created_by = m.member_id
       WHERE t.uuid = $1`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  },

  /**
   * Get all teams with pagination and filters
   */
  async getAll({ page = 1, limit = 20, category = null, search = null, activeOnly = true }) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (activeOnly) {
      conditions.push('t.is_active = TRUE');
    }

    if (category) {
      params.push(category);
      conditions.push(`t.category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(t.name ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM teams t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT t.team_id, t.uuid, t.name, t.description, t.category, t.logo_url, t.created_at,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = TRUE) as member_count,
              (SELECT COUNT(*) FROM projects p WHERE p.team_id = t.team_id) as project_count
       FROM teams t
       ${whereClause}
       ORDER BY t.name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { teams: transformArray(result.rows), total };
  },

  /**
   * Update a team
   */
  async update(teamId, { name, description, category, logoUrl, isActive }) {
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }

    const result = await pool.query(
      `UPDATE teams SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         category = COALESCE($4, category),
         logo_url = COALESCE($5, logo_url),
         is_active = COALESCE($6, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE team_id = $1
       RETURNING *`,
      [teamId, name, description, category, logoUrl, isActive]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a team (soft delete by setting is_active = false)
   */
  async delete(teamId) {
    const result = await pool.query(
      `UPDATE teams SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE team_id = $1
       RETURNING team_id`,
      [teamId]
    );
    return result.rowCount > 0;
  },

  // ============================================
  // TEAM MEMBERS
  // ============================================

  /**
   * Add a member to a team
   */
  async addMember(teamId, memberId, role = 'member') {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const result = await pool.query(
      `INSERT INTO team_members (team_id, member_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (team_id, member_id) DO UPDATE SET role = $3, is_active = TRUE, left_at = NULL
       RETURNING team_member_id, team_id, member_id, role, joined_at`,
      [teamId, memberId, role]
    );
    return result.rows[0];
  },

  /**
   * Remove a member from a team (soft delete)
   */
  async removeMember(teamId, memberId) {
    const result = await pool.query(
      `UPDATE team_members
       SET is_active = FALSE, left_at = CURRENT_TIMESTAMP
       WHERE team_id = $1 AND member_id = $2
       RETURNING team_member_id`,
      [teamId, memberId]
    );
    return result.rowCount > 0;
  },

  /**
   * Update member role in a team
   */
  async updateMemberRole(teamId, memberId, role) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const result = await pool.query(
      `UPDATE team_members SET role = $3
       WHERE team_id = $1 AND member_id = $2 AND is_active = TRUE
       RETURNING team_member_id, role`,
      [teamId, memberId, role]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all members of a team
   */
  async getMembers(teamId) {
    const result = await pool.query(
      `SELECT tm.team_member_id, tm.role, tm.joined_at,
              m.member_id, m.uuid, m.full_name, m.avatar_url, m.email
       FROM team_members tm
       JOIN members m ON tm.member_id = m.member_id
       WHERE tm.team_id = $1 AND tm.is_active = TRUE
       ORDER BY
         CASE tm.role
           WHEN 'lead' THEN 1
           ELSE 2
         END,
         tm.joined_at`,
      [teamId]
    );
    return transformArray(result.rows);
  },

  /**
   * Check if member is part of a team
   */
  async isMember(teamId, memberId) {
    const result = await pool.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND member_id = $2 AND is_active = TRUE',
      [teamId, memberId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get teams by member
   */
  async getByMember(memberId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM team_members tm
       JOIN teams t ON tm.team_id = t.team_id
       WHERE tm.member_id = $1 AND tm.is_active = TRUE AND t.is_active = TRUE`,
      [memberId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT t.team_id, t.uuid, t.name, t.description, t.category, t.logo_url,
              tm.role as member_role, tm.joined_at,
              (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.team_id AND tm2.is_active = TRUE) as member_count
       FROM team_members tm
       JOIN teams t ON tm.team_id = t.team_id
       WHERE tm.member_id = $1 AND tm.is_active = TRUE AND t.is_active = TRUE
       ORDER BY tm.joined_at DESC
       LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );

    return { teams: transformArray(result.rows), total };
  },

  /**
   * Get teams by category
   */
  async getByCategory(category) {
    const result = await pool.query(
      `SELECT t.team_id, t.uuid, t.name, t.description, t.logo_url,
              (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id AND tm.is_active = TRUE) as member_count
       FROM teams t
       WHERE t.category = $1 AND t.is_active = TRUE
       ORDER BY t.name`,
      [category]
    );
    return transformArray(result.rows);
  },

  // ============================================
  // TEAM PROJECTS
  // ============================================

  /**
   * Get projects belonging to a team
   */
  async getProjects(teamId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projects WHERE team_id = $1`,
      [teamId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.project_id, p.uuid, p.title, p.description, p.category, p.status,
              p.start_date, p.end_date, p.cover_image_url, p.created_at,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) as member_count
       FROM projects p
       WHERE p.team_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [teamId, limit, offset]
    );

    return { projects: transformArray(result.rows), total };
  },

  /**
   * Get valid categories
   */
  getValidCategories() {
    return VALID_CATEGORIES;
  },

  /**
   * Get valid roles
   */
  getValidRoles() {
    return VALID_ROLES;
  },

  /**
   * Get team leads (members with 'lead' role in the team)
   */
  async getLeads(teamId) {
    const result = await pool.query(
      `SELECT tm.member_id, m.uuid, m.full_name, m.email, m.avatar_url
       FROM team_members tm
       JOIN members m ON tm.member_id = m.member_id
       WHERE tm.team_id = $1 AND tm.role = 'lead' AND tm.is_active = TRUE`,
      [teamId]
    );
    return result.rows;
  },

  /**
   * Check if a member is a lead of a team
   */
  async isLead(teamId, memberId) {
    const result = await pool.query(
      `SELECT 1 FROM team_members
       WHERE team_id = $1 AND member_id = $2 AND role = 'lead' AND is_active = TRUE`,
      [teamId, memberId]
    );
    return result.rowCount > 0;
  },

  /**
   * Get team by project ID
   */
  async getByProjectId(projectId) {
    const result = await pool.query(
      `SELECT t.*
       FROM teams t
       JOIN projects p ON t.team_id = p.team_id
       WHERE p.project_id = $1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  // ============================================
  // PERMISSION HELPER METHODS
  // ============================================

  /**
   * Check if a member can manage team (add/remove members)
   * Returns permission info including whether user is creator and their team role
   * Global directors must have category assignment matching the team's category
   */
  async canManageTeam(teamId, memberId, memberGlobalRole, isSuperAdmin) {
    // Super admin can always manage
    if (isSuperAdmin) {
      return { canManage: true, isCreator: false, teamRole: null, reason: 'super_admin' };
    }

    // Get team info including category
    const teamResult = await pool.query(
      'SELECT created_by, category FROM teams WHERE team_id = $1',
      [teamId]
    );
    const teamCategory = teamResult.rows[0]?.category;
    const isCreator = teamResult.rows[0]?.created_by === memberId;

    // Global directors can manage only if assigned to team's category
    if (memberGlobalRole === 'director') {
      const hasCategory = await DirectorCategory.isAssigned(memberId, teamCategory);
      if (hasCategory) {
        return { canManage: true, isCreator: false, teamRole: 'director', reason: 'global_director_with_category' };
      }
      // Director without category assignment - check if they're team creator or have team role
    }

    // Check team membership and role
    const membershipResult = await pool.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND member_id = $2 AND is_active = TRUE',
      [teamId, memberId]
    );
    const teamRole = membershipResult.rows[0]?.role || null;

    // Team creator can manage
    if (isCreator) {
      return { canManage: true, isCreator: true, teamRole, reason: 'team_creator' };
    }

    // Team lead can manage (add/remove members)
    if (teamRole === 'lead') {
      return { canManage: true, isCreator: false, teamRole, reason: 'team_lead' };
    }

    return { canManage: false, isCreator: false, teamRole, reason: 'insufficient_permission' };
  },

  /**
   * Check if a member can promote/demote roles in a team
   * Only super-admin and team creator can change roles
   */
  async canChangeRoles(teamId, memberId, memberGlobalRole, isSuperAdmin) {
    // Super admin can always change roles
    if (isSuperAdmin) {
      return { canChange: true, canAssignLead: true, reason: 'super_admin' };
    }

    // Check if user is team creator
    const teamResult = await pool.query(
      'SELECT created_by FROM teams WHERE team_id = $1',
      [teamId]
    );
    const isCreator = teamResult.rows[0]?.created_by === memberId;

    // Team creator can promote to lead
    if (isCreator) {
      return { canChange: true, canAssignLead: true, reason: 'team_creator' };
    }

    // Global directors cannot change roles (only add/remove)
    // Team leads cannot change roles
    return { canChange: false, canAssignLead: false, reason: 'insufficient_permission' };
  },

  /**
   * Check if a member can approve posts in a team
   * Global directors must have category assignment matching the team's category
   */
  async canApprovePosts(teamId, memberId, memberGlobalRole, isSuperAdmin) {
    // Super admin can always approve
    if (isSuperAdmin) return true;

    // Get team info including category
    const teamResult = await pool.query(
      'SELECT created_by, category FROM teams WHERE team_id = $1',
      [teamId]
    );
    const teamCategory = teamResult.rows[0]?.category;
    const isCreator = teamResult.rows[0]?.created_by === memberId;

    // Global directors can approve only if assigned to team's category
    if (memberGlobalRole === 'director') {
      const hasCategory = await DirectorCategory.isAssigned(memberId, teamCategory);
      if (hasCategory) return true;
      // Director without category assignment - check if they're team creator or have team role
    }

    // Team creator can approve
    if (isCreator) return true;

    // Check team role - leads and directors can approve
    const membershipResult = await pool.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND member_id = $2 AND is_active = TRUE',
      [teamId, memberId]
    );
    const teamRole = membershipResult.rows[0]?.role;

    return teamRole === 'lead';
  },

  /**
   * Check if a target member is a global director
   */
  async isGlobalDirector(memberId) {
    const result = await pool.query(
      "SELECT role FROM members WHERE member_id = $1 AND role = 'director'",
      [memberId]
    );
    return result.rowCount > 0;
  },

  /**
   * Validate role assignment based on permissions
   * Returns { valid: boolean, message: string }
   */
  async validateRoleAssignment(teamId, assignerId, assignerGlobalRole, isSuperAdmin, targetMemberId, newRole) {
    // Check if assigner can change roles
    const rolePerms = await this.canChangeRoles(teamId, assignerId, assignerGlobalRole, isSuperAdmin);

    if (!rolePerms.canChange) {
      return { valid: false, message: 'You do not have permission to change roles in this team' };
    }

    // Validate 'lead' role assignment
    if (newRole === 'lead') {
      if (!rolePerms.canAssignLead) {
        return { valid: false, message: 'Only super admins and team creators can assign the lead role' };
      }
    }

    return { valid: true, message: 'Role assignment allowed' };
  }
};

module.exports = Team;
