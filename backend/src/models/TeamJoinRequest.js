const { pool } = require('../config/database');
const { transformKeys, transformArray } = require('../utils/caseTransform');

class TeamJoinRequest {
  /**
   * Create a new join request
   */
  static async create({ teamId, memberId, message }) {
    const result = await pool.query(
      `INSERT INTO team_join_requests (team_id, member_id, message)
       VALUES ($1, $2, $3)
       RETURNING request_id, uuid, team_id, member_id, status, message, created_at`,
      [teamId, memberId, message || null]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }

  /**
   * Find a join request by UUID (includes member details)
   */
  static async findByUuid(uuid) {
    const result = await pool.query(
      `SELECT r.request_id, r.uuid, r.team_id, r.member_id, r.status, r.message,
              r.reviewed_by, r.reviewed_at, r.created_at, r.updated_at,
              m.full_name, m.email, m.avatar_url, m.uuid AS member_uuid
       FROM team_join_requests r
       JOIN members m ON m.member_id = r.member_id
       WHERE r.uuid = $1`,
      [uuid]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }

  /**
   * Get all pending join requests for a team (with member details)
   */
  static async getPendingByTeam(teamId) {
    const result = await pool.query(
      `SELECT r.request_id, r.uuid, r.team_id, r.member_id, r.status, r.message, r.created_at,
              m.full_name, m.email, m.avatar_url, m.uuid AS member_uuid
       FROM team_join_requests r
       JOIN members m ON m.member_id = r.member_id
       WHERE r.team_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at ASC`,
      [teamId]
    );
    return transformArray(result.rows);
  }

  /**
   * Get a member's pending join request for a specific team (if any)
   */
  static async getByMemberAndTeam(memberId, teamId) {
    const result = await pool.query(
      `SELECT request_id, uuid, team_id, member_id, status, message, created_at
       FROM team_join_requests
       WHERE member_id = $1 AND team_id = $2 AND status = 'pending'`,
      [memberId, teamId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }

  /**
   * Count pending requests for a team
   */
  static async countPendingByTeam(teamId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM team_join_requests WHERE team_id = $1 AND status = 'pending'`,
      [teamId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Approve a request (updates status; caller is responsible for adding member to team)
   */
  static async approve(requestId, reviewedBy) {
    const result = await pool.query(
      `UPDATE team_join_requests
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE request_id = $1
       RETURNING request_id, uuid, team_id, member_id, status, reviewed_by, reviewed_at`,
      [requestId, reviewedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }

  /**
   * Reject a request
   */
  static async reject(requestId, reviewedBy) {
    const result = await pool.query(
      `UPDATE team_join_requests
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE request_id = $1
       RETURNING request_id, uuid, team_id, member_id, status, reviewed_by, reviewed_at`,
      [requestId, reviewedBy]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }

  /**
   * Cancel a request (by the applicant)
   */
  static async cancel(requestId) {
    const result = await pool.query(
      `UPDATE team_join_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE request_id = $1
       RETURNING request_id, uuid, team_id, member_id, status`,
      [requestId]
    );
    return result.rows[0] ? transformKeys(result.rows[0]) : null;
  }
}

module.exports = TeamJoinRequest;
