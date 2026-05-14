const express = require('express');
const SEOGenerator = require('../utils/seoGenerator');

const router = express.Router();

// Get base URL from environment or request
function getBaseUrl(req) {
  const protocol = req.protocol || 'https';
  const host = process.env.FRONTEND_URL || req.get('host');
  return `${protocol}://${host}`.replace(/\/$/, '');
}

// Sitemap.xml endpoint — main sitemap index
router.get('/sitemap.xml', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    const baseUrl = getBaseUrl(req);
    const sitemap = await SEOGenerator.generateSitemap(baseUrl);
    res.send(sitemap);
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.status(500).xml('<error>Failed to generate sitemap</error>');
  }
});

// Robots.txt endpoint
router.get('/robots.txt', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache for 7 days

    const baseUrl = getBaseUrl(req);
    const robotsTxt = SEOGenerator.generateRobotsTxt(baseUrl);
    res.send(robotsTxt);
  } catch (error) {
    console.error('Error serving robots.txt:', error);
    res.status(500).send('Failed to generate robots.txt');
  }
});

// Llms.txt endpoint — for AI model training data policy
router.get('/llms.txt', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache for 7 days

    const llmsTxt = SEOGenerator.generateLLMsTxt();
    res.send(llmsTxt);
  } catch (error) {
    console.error('Error serving llms.txt:', error);
    res.status(500).send('Failed to generate llms.txt');
  }
});

// Security.txt endpoint — standard security contact information
router.get('/.well-known/security.txt', (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=604800');

    const securityTxt = `Contact: security@aquaterraplatform.com
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}
Preferred-Languages: en
Acknowledgments: https://www.aquaterraplatform.com/security/acknowledgments`;

    res.send(securityTxt);
  } catch (error) {
    console.error('Error serving security.txt:', error);
    res.status(500).send('Failed to generate security.txt');
  }
});

module.exports = router;
