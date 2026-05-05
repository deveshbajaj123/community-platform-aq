const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

/**
 * Verify JWT token and attach member to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is in active sessions
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const sessionCheck = await pool.query(
      `SELECT * FROM active_sessions
       WHERE token_hash = $1
       AND member_id = $2
       AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash, decoded.memberId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please login again.'
      });
    }

    // Update last activity
    await pool.query(
      'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE token_hash = $1',
      [tokenHash]
    );

    // Get member info
    const memberResult = await pool.query(
      `SELECT member_id, uuid, email, full_name, role, status, avatar_url, is_super_admin
       FROM members WHERE member_id = $1 AND is_active = TRUE`,
      [decoded.memberId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or inactive'
      });
    }

    const member = memberResult.rows[0];

    // Check member status
    if (member.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended'
      });
    }

    // Attach member info to request
    req.member = {
      memberId: member.member_id,
      uuid: member.uuid,
      email: member.email,
      fullName: member.full_name,
      role: member.role,
      status: member.status,
      avatarUrl: member.avatar_url,
      isSuperAdmin: member.is_super_admin || false
    };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Require active member status (not pending_approval or rejected)
 */
const requireActiveMember = (req, res, next) => {
  if (!req.member) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.member.status !== 'active') {
    if (req.member.status === 'pending_approval') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval'
      });
    }
    if (req.member.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your account application was not approved'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Account access denied'
    });
  }

  next();
};

/**
 * Require director role - returns 404 for non-directors
 * This is intentional to hide the existence of director routes
 */
const requireDirector = (req, res, next) => {
  if (!req.member) {
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  if (req.member.role !== 'director') {
    // Return 404 instead of 403 to hide director routes
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  next();
};

/**
 * Require super admin role - returns 404 for non-super-admins
 * This is intentional to hide the existence of super-admin routes
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.member) {
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  if (req.member.role !== 'director') {
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  if (!req.member.isSuperAdmin) {
    return res.status(404).json({
      success: false,
      message: 'Not found'
    });
  }

  next();
};

/**
 * Optional auth - attaches member if token present and valid, continues otherwise
 * Now includes session validation to prevent use of logged-out/revoked tokens
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate session exists and is not expired (prevents use of logged-out tokens)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionCheck = await pool.query(
      `SELECT * FROM active_sessions
       WHERE token_hash = $1
       AND member_id = $2
       AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash, decoded.memberId]
    );

    // If session invalid, continue without member (optional auth)
    if (sessionCheck.rows.length === 0) {
      return next();
    }

    const memberResult = await pool.query(
      `SELECT member_id, uuid, email, full_name, role, status, avatar_url, is_super_admin
       FROM members WHERE member_id = $1 AND is_active = TRUE`,
      [decoded.memberId]
    );

    if (memberResult.rows.length > 0) {
      const member = memberResult.rows[0];
      req.member = {
        memberId: member.member_id,
        uuid: member.uuid,
        email: member.email,
        fullName: member.full_name,
        role: member.role,
        status: member.status,
        avatarUrl: member.avatar_url,
        isSuperAdmin: member.is_super_admin || false
      };
    }
  } catch (error) {
    // Ignore token errors for optional auth - continue without member
  }

  next();
};

module.exports = {
  authMiddleware,
  requireActiveMember,
  requireDirector,
  requireSuperAdmin,
  optionalAuth
};
