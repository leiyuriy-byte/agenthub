# ================================
# Stage 1: Build API (skip - use pre-built dist)
# ================================
FROM node:20-alpine AS api-build

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages
COPY apps apps
COPY tsconfig.base.json tsconfig.json ./

# Install dependencies (--ignore-scripts to avoid bcrypt native build issues)
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile --ignore-scripts

# ================================
# Stage 2: Build Web
# ================================
FROM node:20-alpine AS web-build

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages packages

# Install dependencies
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages packages
COPY apps/web/src apps/web/src
COPY apps/web/next.config.mjs apps/web/next.config.mjs
COPY apps/web/tailwind.config.ts apps/web/tailwind.config.ts
COPY apps/web/postcss.config.js apps/web/postcss.config.js
COPY tsconfig.base.json tsconfig.json ./

# Build Web
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm --filter @agenthub/web build

# ================================
# Stage 3: Production API
# ================================
FROM node:20-alpine AS api-production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy pre-built API dist and node_modules from build stage
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/apps /app/apps
COPY --from=api-build /app/packages /app/packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/dist ./dist

# Reinstall to fix broken pnpm symlinks
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --ignore-scripts 2>&1 | tail -10

# Create data directory
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]

# ================================
# Stage 4: Production Web (Nginx)
# ================================
FROM node:20-alpine AS web-production

# Install nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Copy built Next.js app
COPY --from=web-build /app/apps/web/.next ./.next
COPY --from=web-build /app/apps/web/public ./public

# Copy nginx configuration
COPY <<EOF /etc/nginx/http.d/default.conf
server {
    listen 3000;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    client_max_body_size 100M;

    location / {
        root /app;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /_next/static {
        root /app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /_next/image {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Expose port
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["nginx", "-g", "daemon off;"]
