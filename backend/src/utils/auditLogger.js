const { pool } = require('../config/database');

/**
 * Audit action types
 */
const AuditActions = {
  // Auth
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',

  // Member management
  MEMBER_APPROVED: 'member_approved',
  MEMBER_REJECTED: 'member_rejected',
  MEMBER_SUSPENDED: 'member_suspended',
  MEMBER_DELETED: 'member_deleted',
  PROFILE_UPDATED: 'profile_updated',

  // Posts
  POST_CREATED: 'post_created',
  POST_UPDATED: 'post_updated',
  POST_DELETED: 'post_deleted',
  POST_APPROVED: 'post_approved',
  POST_REJECTED: 'post_rejected',

  // Interactions
  POST_LIKED: 'post_liked',
  POST_UNLIKED: 'post_unliked',
  COMMENT_ADDED: 'comment_added',
  COMMENT_DELETED: 'comment_deleted',

  // Achievements
  ACHIEVEMENT_CREATED: 'achievement_created',
  ACHIEVEMENT_UPDATED: 'achievement_updated',
  ACHIEVEMENT_DELETED: 'achievement_deleted'
};

/**
 * Extract client info from request
 */
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('User-Agent') || null
  };
};

/**
 * Log audit event
 */
const logAuditEvent = async ({
  memberId,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    await pool.query(
      `INSERT INTO community_audit_logs
       (member_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        memberId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = {
  AuditActions,
  getClientInfo,
  logAuditEvent
};
