const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/database');
const { helmetConfig, xssClean, hpp, generalLimiter } = require('./middleware/security');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');
const { seoHeaders, botFilterMiddleware } = require('./middleware/seoMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const feedRoutes = require('./routes/feedRoutes');
const profileRoutes = require('./routes/profileRoutes');
const directorRoutes = require('./routes/directorRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const teamRoutes = require('./routes/teamRoutes');
const searchRoutes = require('./routes/searchRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const seoRoutes = require('./routes/seoRoutes');

const app = express();

// Trust proxy - required when behind reverse proxy (Railway, Render, nginx, etc.)
if (process.env.TRUST_PROXY || process.env.NODE_ENV === 'production') {
  const trustProxy = process.env.TRUST_PROXY
    ? (process.env.TRUST_PROXY === 'true' ? 1 :
       isNaN(process.env.TRUST_PROXY) ? process.env.TRUST_PROXY :
       parseInt(process.env.TRUST_PROXY, 10))
    : 1;
  app.set('trust proxy', trustProxy);
  console.log(`Trust proxy enabled: ${trustProxy}`);
}

// CORS configuration — must come before other middleware to handle preflight
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://keen-surprise-production-9755.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean).map(url => url.replace(/\/$/, '')); // strip trailing slashes

console.log('Allowed CORS origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Check against allowed origins (strip trailing slash from incoming origin too)
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    console.warn('CORS blocked origin:', origin);
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmetConfig);

// SEO headers and bot filtering
app.use(seoHeaders);
app.use(botFilterMiddleware);

// Body parsing middleware (MUST come before hpp and xss-clean)
// Limit JSON/form body size to prevent DoS attacks
// File uploads are handled separately via multer with their own size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Ensure req.body is always at least an empty object
app.use((req, res, next) => {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

// XSS and HPP protection (MUST come after body parsing)
app.use(xssClean);
app.use(hpp);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// SEO routes (sitemap, robots.txt, llms.txt) — must come before other routes
app.use(seoRoutes);

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'AquaTerra Community Platform API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      feed: '/api/feed',
      profile: '/api/profile',
      director: '/api/director (404 for non-directors)',
      upload: '/api/upload',
      schools: '/api/schools',
      teams: '/api/teams',
      search: '/api/search',
      achievements: '/api/achievements'
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/director', directorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/achievements', achievementRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log('==================================================');
  console.log('   AquaTerra Community Platform API');
  console.log('==================================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'aquaterra_community'}`);
  console.log('==================================================');

  try {
    await pool.query('SELECT NOW()');
    console.log('   Database: Connected');
  } catch (error) {
    console.error('   Database: Connection failed -', error.message);
  }

  console.log('==================================================');
  console.log('   API Endpoints:');
  console.log('   Auth:');
  console.log('   - POST /api/auth/google');
  console.log('   - POST /api/auth/register');
  console.log('   - GET  /api/auth/me');
  console.log('   Feed:');
  console.log('   - GET  /api/feed');
  console.log('   - POST /api/feed');
  console.log('   - POST /api/feed/:uuid/like');
  console.log('   Profile:');
  console.log('   - GET  /api/profile/me');
  console.log('   - PUT  /api/profile/me');
  console.log('   - GET  /api/profile/:uuid');
  console.log('   Director (hidden from members):');
  console.log('   - GET  /api/director/dashboard');
  console.log('   - GET  /api/director/approvals');
  console.log('   - POST /api/director/approvals/:id/approve');
  console.log('==================================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
