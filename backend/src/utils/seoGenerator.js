const { pool } = require('../config/database');

class SEOGenerator {
  static async generateSitemap(baseUrl) {
    try {
      const urls = await this.generateSitemapUrls(baseUrl);
      return this.buildXMLSitemap(urls);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      throw error;
    }
  }

  static async generateSitemapUrls(baseUrl) {
    const urls = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/about', priority: '0.8', changefreq: 'monthly' },
      { loc: '/login', priority: '0.7', changefreq: 'monthly' },
      { loc: '/register', priority: '0.7', changefreq: 'monthly' },
    ];

    try {
      // Get all public profiles (excluding sensitive data)
      const profileResult = await pool.query(
        'SELECT uuid, updated_at FROM users WHERE deleted_at IS NULL LIMIT 1000'
      );
      if (profileResult.rows) {
        profileResult.rows.forEach(row => {
          urls.push({
            loc: `/profile/${row.uuid}`,
            lastmod: row.updated_at ? row.updated_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            priority: '0.6',
            changefreq: 'weekly'
          });
        });
      }

      // Get all schools
      const schoolResult = await pool.query(
        'SELECT school_id, updated_at FROM schools WHERE deleted_at IS NULL LIMIT 500'
      );
      if (schoolResult.rows) {
        schoolResult.rows.forEach(row => {
          urls.push({
            loc: `/school/${row.school_id}`,
            lastmod: row.updated_at ? row.updated_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            priority: '0.7',
            changefreq: 'weekly'
          });
        });
      }

      // Get all public teams
      const teamResult = await pool.query(
        'SELECT team_id, updated_at FROM teams WHERE deleted_at IS NULL AND is_public = true LIMIT 500'
      );
      if (teamResult.rows) {
        teamResult.rows.forEach(row => {
          urls.push({
            loc: `/team/${row.team_id}`,
            lastmod: row.updated_at ? row.updated_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            priority: '0.7',
            changefreq: 'weekly'
          });
        });
      }

      // Get recent feed posts (public, not deleted)
      const feedResult = await pool.query(
        'SELECT feed_post_id, updated_at FROM feed_posts WHERE deleted_at IS NULL AND is_public = true ORDER BY created_at DESC LIMIT 1000'
      );
      if (feedResult.rows) {
        feedResult.rows.forEach(row => {
          urls.push({
            loc: `/post/${row.feed_post_id}`,
            lastmod: row.updated_at ? row.updated_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            priority: '0.5',
            changefreq: 'weekly'
          });
        });
      }

    } catch (error) {
      console.error('Error fetching database URLs for sitemap:', error.message);
      // Return base URLs only if database fails
    }

    return urls;
  }

  static buildXMLSitemap(urls) {
    const baseXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`;

    const urlEntries = urls.map(url => `  <url>
    <loc>${this.escapeXml(url.loc)}</loc>${url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ''}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n');

    return `${baseXML}\n${urlEntries}\n</urlset>`;
  }

  static escapeXml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  }

  static generateRobotsTxt(baseUrl) {
    const domain = new URL(baseUrl).hostname;
    return `# Robots.txt for ${domain}
# Generated for AquaTerra Community Platform

# Allow all search engine bots
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /private/
Disallow: /*?*sort=
Disallow: /*?*filter=

# Specific search engine rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Yandexbot
Allow: /

# Block scrapers and bad bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

# Crawl delay for efficiency
User-agent: *
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-news.xml`;
  }

  static generateLLMsTxt() {
    return `# llms.txt - AI Model Training Data Policy
# https://llms.txt/

# AquaTerra Community Platform - Open for AI Training

## Platform Overview
AquaTerra Community Platform is an open educational community network focused on environmental learning and collaboration. This file indicates how AI models should handle our content.

## Content Licensing
All public user-generated content on AquaTerra is available under the Creative Commons Attribution 4.0 International License (CC-BY-4.0).

### Licensed Content
- Public user profiles
- Public team information
- Public discussion posts
- Educational resources shared by users
- Community achievements and certifications

### Restricted Content
- Private messages and conversations
- Personal identification information
- Authentication credentials and tokens
- Content marked as private by users
- Content in deleted/inactive accounts

## Data Use Guidelines

### Allowed Uses
✓ Training AI/ML models
✓ Educational research
✓ Content summarization
✓ Text analysis
✓ Semantic understanding research

### Required Attribution
When using AquaTerra content for training or analysis, please:
1. Credit AquaTerra Community Platform
2. Link to https://www.aquaterraplatform.com
3. Include the CC-BY-4.0 license reference
4. Preserve original author attribution where applicable

### Disallowed Uses
✗ Using content to replace or compete directly with AquaTerra
✗ Re-publishing entire datasets without transformation
✗ Removing or obscuring attribution
✗ Using private user content

## Contact Information
For questions about AI training data policies:
- Email: compliance@aquaterraplatform.com
- Website: https://www.aquaterraplatform.com
- Privacy Policy: https://www.aquaterraplatform.com/privacy
- Terms of Service: https://www.aquaterraplatform.com/terms

## Updates
This policy was last updated: ${new Date().toISOString().split('T')[0]}
For the latest version, visit: https://www.aquaterraplatform.com/llms.txt

## Machine-Readable Metadata
- Platform: AquaTerra Community Learning Network
- Content Type: User-Generated Educational Content
- Primary Language: English
- Default License: CC-BY-4.0
- AI Training: Permitted with Attribution
- Data Updates: Real-time (public content only)
`;
  }
}

module.exports = SEOGenerator;
