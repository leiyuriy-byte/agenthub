# ============================================================
# AgentHub Multi-Stage Dockerfile
# ============================================================
# Targets:
#   - api-production  : Fastify API server (port 3001)
#   - web-production  : Next.js + Nginx (port 3000)
# ============================================================

# -------------------------------
# Stage: dependencies
# -------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps apps
COPY tsconfig.base.json tsconfig.json ./

# Install all dependencies (--ignore-scripts to avoid native module build issues)
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------------------------------
# Stage: api-build
# -------------------------------
FROM dependencies AS api-build

WORKDIR /app

# Build API
RUN pnpm --filter @agenthub/api build

# -------------------------------
# Stage: web-build
# -------------------------------
FROM dependencies AS web-build

WORKDIR /app

# Build Web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @agenthub/web build

# -------------------------------
# Stage: Production API
# -------------------------------
FROM node:20-alpine AS api-production

WORKDIR /app

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts
COPY --from=api-build /app/apps/api/dist ./dist
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/packages ./packages

# Package files needed at runtime
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Reinstall production deps only (prune dev dependencies)
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile --ignore-scripts --prod && \
    pnpm install --frozen-lockfile --ignore-scripts --prod --filter @agenthub/api 2>&1 | tail -5

# Create data directory with proper ownership
RUN mkdir -p /app/data /app/uploads && \
    chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use node directly (not tsx) for production
CMD ["node", "dist/server.js"]

# -------------------------------
# Stage: Production Web (Next.js + Nginx)
# -------------------------------
FROM node:20-alpine AS web-production

# Install nginx and certbot
RUN apk add --no-cache nginx certbot certbot-nginx

WORKDIR /app

# Copy built Next.js app
COPY --from=web-build /app/apps/web/.next ./.next
COPY --from=web-build /app/apps/web/public ./public

# Nginx configuration
COPY <<'EOF' /etc/nginx/http.d/default.conf
server {
    listen 3000;
    server_name _;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml application/javascript
               application/json application/rss+xml application/atom+xml
               image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 100M;
    client_body_timeout 60s;

    # Next.js static files
    location /_next/static/ {
        root /app;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Public static files
    location / {
        root /app;
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files $uri $uri/ /index.html;
    }

    # API proxy to Fastify backend
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
