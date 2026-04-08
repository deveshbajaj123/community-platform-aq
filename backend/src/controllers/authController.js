const { OAuth2Client } = require('google-auth-library');
const Member = require('../models/Member');
const { generateAccessToken, generateRefreshToken, createSession, invalidateSession, refreshAccessToken } = require('../utils/jwtHelper');
const { successResponse, errorResponse, createdResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../utils/errorHandler');
const { logAuditEvent, getClientInfo, AuditActions } = require('../utils/auditLogger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Super admin email from environment variable - this user will be auto-promoted to director + super-admin
// Set SUPER_ADMIN_EMAIL in your .env file to enable auto-promotion
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || null;

/**
 * Verify Google ID token
 */
const verifyGoogleToken = async (credential) => {
  try {
    console.log('Verifying Google token with Client ID:', process.env.GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log('Google token verified successfully for:', payload.email);
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    };
  } catch (error) {
    console.error('Google token verification failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
};

/**
 * Handle Google OAuth authentication
 * POST /api/auth/google
 */
const googleAuth = asyncHandler(async (req, res) => {
  const { credential, googleId, email, name, picture } = req.body;

  let verifiedProfile = null;

  // If credential (ID token) is provided, verify it
  if (credential) {
    verifiedProfile = await verifyGoogleToken(credential);
    if (!verifiedProfile) {
      return errorResponse(res, 'Invalid Google token', 401);
    }
  } else if (googleId && email) {
    // Development bypass - ONLY enabled if ALLOW_DEV_AUTH=true AND not in production
    // This should NEVER be enabled in production
    const allowDevAuth = process.env.ALLOW_DEV_AUTH === 'true' && process.env.NODE_ENV !== 'production';
    if (!allowDevAuth) {
      return errorResponse(res, 'Google credential token is required', 400);
    }
    console.warn('WARNING: Using development auth bypass - this should not be enabled in production!');
    verifiedProfile = { googleId, email, name, picture };
  } else {
    return errorResponse(res, 'Google credential or ID is required', 400);
  }

  const { googleId: verifiedGoogleId, email: verifiedEmail, name: verifiedName, picture: verifiedPicture } = verifiedProfile;

  // Check if member exists by Google ID
  let member = await Member.findByGoogleId(verifiedGoogleId);

  // If not found by Google ID, try finding by email and link the Google ID
  if (!member) {
    const memberByEmail = await Member.findByEmail(verifiedEmail);
    if (memberByEmail) {
      // Link Google ID to existing account
      await Member.updateGoogleId(memberByEmail.memberId, verifiedGoogleId);
      member = await Member.findById(memberByEmail.memberId);
      console.log('Linked Google ID to existing account:', verifiedEmail);
    }
  }

  if (member) {
    // Existing member - check status
    if (member.status === 'pending_approval') {
      return successResponse(res, {
        status: 'pending_approval',
        message: 'Your account is under review by a Director.'
      });
    }

    if (member.status === 'rejected') {
      return successResponse(res, {
        status: 'rejected',
        message: 'Your account application was not approved.',
        rejectionNote: member.rejectionNote
      });
    }

    if (member.status === 'suspended') {
      return errorResponse(res, 'Your account has been suspended', 403);
    }

    // Check for super admin auto-promotion (only if SUPER_ADMIN_EMAIL is configured)
    if (SUPER_ADMIN_EMAIL && member.email === SUPER_ADMIN_EMAIL) {
      if (member.role !== 'director' || !member.isSuperAdmin) {
        await Member.promoteToSuperAdmin(member.memberId);
        member.role = 'director';
        member.isSuperAdmin = true;

        const clientInfo = getClientInfo(req);
        await logAuditEvent({
          memberId: member.memberId,
          action: 'AUTO_SUPER_ADMIN_PROMOTION',
          ...clientInfo,
          details: { email: member.email }
        });
      }
    }

    // Active member - generate tokens
    const accessToken = generateAccessToken(member.memberId, member.role);
    const refreshToken = generateRefreshToken(member.memberId);

    await createSession(member.memberId, accessToken, req);
    await Member.updateLastLogin(member.memberId);

    const clientInfo = getClientInfo(req);
    await logAuditEvent({
      memberId: member.memberId,
      action: AuditActions.LOGIN,
      ...clientInfo
    });

    return successResponse(res, {
      status: 'active',
      accessToken,
      refreshToken,
      member: {
        uuid: member.uuid,
        email: member.email,
        fullName: member.fullName,
        avatarUrl: member.avatarUrl,
        role: member.role,
        status: member.status,
        isSuperAdmin: member.isSuperAdmin || false
      }
    });
  }

  // New user - return needs_registration status
  return successResponse(res, {
    status: 'needs_registration',
    googleProfile: {
      googleId: verifiedGoogleId,
      email: verifiedEmail,
      name: verifiedName,
      picture: verifiedPicture
    }
  });
});

/**
 * Complete registration for new Google users
 * POST /api/auth/register
 */
const completeRegistration = asyncHandler(async (req, res) => {
  const { googleId, email, fullName, avatarUrl, classGrade, phone, joinReason } = req.body;

  if (!googleId || !email || !fullName || !classGrade || !joinReason) {
    return errorResponse(res, 'Missing required fields', 400);
  }

  // Check if already exists
  const existing = await Member.findByGoogleId(googleId);
  if (existing) {
    return errorResponse(res, 'Account already exists', 409);
  }

  const existingEmail = await Member.findByEmail(email);
  if (existingEmail) {
    return errorResponse(res, 'Email already in use', 409);
  }

  // Create member with pending_approval status
  const member = await Member.create({
    googleId,
    email,
    fullName,
    avatarUrl,
    classGrade,
    phone,
    joinReason
  });

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: member.memberId,
    action: AuditActions.REGISTER,
    ...clientInfo,
    details: { email, classGrade }
  });

  return createdResponse(res, {
    status: 'pending_approval',
    message: 'Your account is under review by a Director.',
    member: {
      uuid: member.uuid,
      email: member.email,
      fullName: member.fullName
    }
  });
});

/**
 * Check status by Google ID (for OAuth callback)
 * GET /api/auth/status/:googleId
 */
const checkStatus = asyncHandler(async (req, res) => {
  const { googleId } = req.params;

  const member = await Member.findByGoogleId(googleId);

  if (!member) {
    return successResponse(res, { status: 'not_registered' });
  }

  return successResponse(res, {
    status: member.status,
    rejectionNote: member.status === 'rejected' ? member.rejectionNote : null
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return errorResponse(res, 'Refresh token required', 400);
  }

  try {
    const { accessToken, member } = await refreshAccessToken(token, req);

    return successResponse(res, {
      accessToken,
      member: {
        memberId: member.memberId,
        role: member.role,
        status: member.status
      }
    });
  } catch (error) {
    return errorResponse(res, 'Invalid or expired refresh token', 401);
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const member = await Member.findById(req.member.memberId);

  if (!member) {
    return errorResponse(res, 'Member not found', 404);
  }

  return successResponse(res, {
    member: {
      uuid: member.uuid,
      email: member.email,
      fullName: member.fullName,
      avatarUrl: member.avatarUrl,
      classGrade: member.classGrade,
      phone: member.phone,
      role: member.role,
      status: member.status,
      isSuperAdmin: member.isSuperAdmin || false,
      createdAt: member.createdAt
    }
  });
});

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  await invalidateSession(req.token);

  const clientInfo = getClientInfo(req);
  await logAuditEvent({
    memberId: req.member.memberId,
    action: AuditActions.LOGOUT,
    ...clientInfo
  });

  return successResponse(res, null, 'Logged out successfully');
});

module.exports = {
  googleAuth,
  completeRegistration,
  checkStatus,
  refreshToken,
  getCurrentUser,
  logout
};
