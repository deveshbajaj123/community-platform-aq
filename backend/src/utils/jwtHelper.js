const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');

/**
 * Generate access token
 */
const generateAccessToken = (memberId, role) => {
  return jwt.sign(
    { memberId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (memberId) => {
  return jwt.sign(
    { memberId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Create session in database
 */
const createSession = async (memberId, accessToken, req) => {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const ipAddress = req.ip || req.connection?.remoteAddress || null;
  const userAgent = req.get('User-Agent') || null;

  await pool.query(
    `INSERT INTO active_sessions (member_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [memberId, tokenHash, ipAddress, userAgent, expiresAt]
  );
};

/**
 * Invalidate session
 */
const invalidateSession = async (accessToken) => {
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  await pool.query('DELETE FROM active_sessions WHERE token_hash = $1', [tokenHash]);
};

/**
 * Invalidate all sessions for a member
 */
const invalidateAllSessions = async (memberId) => {
  await pool.query('DELETE FROM active_sessions WHERE member_id = $1', [memberId]);
};

/**
 * Verify refresh token and generate new access token
 */
const refreshAccessToken = async (refreshToken, req) => {
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  // Get member info
  const result = await pool.query(
    'SELECT member_id, role, status FROM members WHERE member_id = $1 AND is_active = TRUE',
    [decoded.memberId]
  );

  if (result.rows.length === 0) {
    throw new Error('Member not found');
  }

  const member = result.rows[0];
  const accessToken = generateAccessToken(member.member_id, member.role);

  // Create new session
  await createSession(member.member_id, accessToken, req);

  return { accessToken, member };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  createSession,
  invalidateSession,
  invalidateAllSessions,
  refreshAccessToken
};
