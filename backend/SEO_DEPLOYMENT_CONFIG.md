# SEO Deployment Configuration

## Production Environment Setup

### 1. Environment Variables (.env.production)
```bash
# Server
PORT=5001
NODE_ENV=production
FRONTEND_URL=https://www.aquaterraplatform.com

# Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=aquaterra_community
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Proxy Configuration
TRUST_PROXY=1

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Caching
REDIS_URL=redis://your-redis-instance:6379
SITEMAP_CACHE_TTL=86400
```

---

## 2. nginx Configuration for SEO

If using nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name www.aquaterraplatform.com aquaterraplatform.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.aquaterraplatform.com aquaterraplatform.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers (for SEO & safety)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression (improves Core Web Vitals)
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SEO files (short cache, high priority for crawlers)
    location ~ (sitemap\.xml|robots\.txt|llms\.txt) {
        proxy_pass http://backend:5001;
        add_header Cache-Control "public, max-age=604800";
        access_log /var/log/nginx/seo-requests.log;
    }

    # API endpoints (no cache)
    location /api/ {
        proxy_pass http://backend:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "private, no-cache, no-store, must-revalidate";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend:5001;
        access_log off;
    }

    # Frontend (React)
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Deny access to .well-known except for security.txt
    location ~ /\.well-known(?!/security\.txt) {
        deny all;
    }
}
```

---

## 3. Docker Compose for Production

```yaml
version: '3.8'

services:
  backend:
    image: aquaterra-backend:latest
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=https://www.aquaterraplatform.com
      - DB_HOST=postgres
      - TRUST_PROXY=1
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=aquaterra_community
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./logs:/var/log/nginx
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 4. Vercel Deployment (.vercelignore)

```
# Don't deploy these files
node_modules/
.git/
.env.local
.env.*.local
*.log
.DS_Store
coverage/
.claude/
SEO_DEPLOYMENT_CONFIG.md
```

### vercel.json Configuration

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "env": {
    "NODE_ENV": "production",
    "FRONTEND_URL": "@frontend_url"
  },
  "routes": [
    {
      "src": "/sitemap.xml",
      "dest": "/api/seo?type=sitemap",
      "headers": {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400"
      }
    },
    {
      "src": "/robots.txt",
      "dest": "/api/seo?type=robots",
      "headers": {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=604800"
      }
    },
    {
      "src": "/llms.txt",
      "dest": "/api/seo?type=llms",
      "headers": {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=604800"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/backend/src/server.js",
      "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "private, no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## 5. CloudFlare Configuration (if used)

### Page Rules for SEO Optimization

1. **Cache SEO Files Aggressively**
   - URL: `https://www.aquaterraplatform.com/sitemap.xml`
   - Cache Level: Cache Everything
   - Browser Cache TTL: 1 day

2. **Don't Cache API Endpoints**
   - URL: `https://www.aquaterraplatform.com/api/*`
   - Cache Level: Bypass

3. **Compress Everything**
   - Enable: Brotli compression
   - Enable: Gzip compression

### DNS Records for SEO
```
# Main domain
Type: A
Name: aquaterraplatform.com
Content: [your-server-ip]

# www subdomain
Type: CNAME
Name: www
Content: aquaterraplatform.com

# API subdomain (if separate)
Type: CNAME
Name: api
Content: api.aquaterraplatform.com
```

---

## 6. Database Indexing for Performance

```sql
-- Improve sitemap query performance
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schools_updated_at ON schools(updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_updated_at ON teams(updated_at DESC) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_feed_posts_updated_at ON feed_posts(updated_at DESC, created_at DESC) WHERE deleted_at IS NULL AND is_public = true;

-- For search functionality (bonus)
CREATE INDEX IF NOT EXISTS idx_users_search ON users(username, email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teams_search ON teams(team_name) WHERE deleted_at IS NULL;
```

---

## 7. Monitoring & Logging

### Application Logs to Monitor
```bash
# Watch for sitemap generation errors
tail -f /var/log/aquaterra/error.log | grep sitemap

# Monitor SEO file requests
tail -f /var/log/nginx/seo-requests.log

# Check for bot activity
tail -f /var/log/nginx/access.log | grep -E "Googlebot|Bingbot"
```

### Key Metrics to Track
- **Sitemap generation time:** Should be < 500ms
- **SEO file request time:** Should be < 100ms
- **404 errors from crawlers:** Monitor in Search Console
- **Crawl budget usage:** Check Search Console > Settings

---

## 8. Post-Deployment Verification Checklist

- [ ] Test `/sitemap.xml` returns valid XML (https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [ ] Test `/robots.txt` is accessible without authentication
- [ ] Test `/llms.txt` returns valid text
- [ ] Verify `/health` endpoint responds
- [ ] Check HTTPS certificate is valid (https://www.ssllabs.com/ssltest/)
- [ ] Verify all security headers are present
- [ ] Test bot filtering with User-Agent headers
- [ ] Monitor Google Search Console for coverage
- [ ] Verify Core Web Vitals in PageSpeed Insights
- [ ] Check robots.txt in Google Search Console Coverage

---

## 9. Rollback Procedure

If SEO implementation causes issues:

```bash
# Remove SEO routes (comment out in server.js)
# app.use(seoRoutes);

# Comment out SEO middleware (in server.js)
# app.use(seoHeaders);
# app.use(botFilterMiddleware);

# Restart server
npm restart
```

---

## 10. Performance Targets (SLA)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Sitemap generation | < 500ms | > 1000ms |
| Robots.txt response | < 50ms | > 200ms |
| SEO file caching | 24-7 days | Cache miss rate > 10% |
| Crawl error rate | < 1% | > 5% |
| Search visibility | Growing | Declining > 5% MoM |
| Page indexation | > 90% | < 80% |

---

## Contact

For deployment questions or issues:
- DevOps Team: devops@aquaterraplatform.com
- Security: security@aquaterraplatform.com
- SEO Support: seo@aquaterraplatform.com
