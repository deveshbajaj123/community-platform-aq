// SEO Middleware — adds security and SEO headers
function seoHeaders(req, res, next) {
  const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;

  // Security headers for SEO & crawling
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Allow search engines and social media crawlers
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Cache control for dynamic content
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  // Add canonical URL for crawlers
  res.setHeader('Link', `<${baseUrl}${req.path}>; rel="canonical"`);

  next();
}

// Disable cache for specific endpoints
function noCacheHeaders(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

// Allow crawlers but block bad bots
function botFilterMiddleware(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  const badBots = ['MJ12bot', 'AhrefsBot', 'SemrushBot', 'dotbot', 'DataForSeoBot'];

  if (badBots.some(bot => userAgent.includes(bot))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}

module.exports = {
  seoHeaders,
  noCacheHeaders,
  botFilterMiddleware
};
