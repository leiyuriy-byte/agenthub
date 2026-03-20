# ================================
# Stage 1: Build API
# ================================
FROM node:20-alpine AS api-build

WORKDIR /app

# Copy package files
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/validators/package.json packages/validators/
COPY packages/config/package.json packages/config/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages/db/src packages/db/src
COPY packages/auth/src packages/auth/src
COPY packages/validators/src packages/validators/src
COPY packages/config/src packages/config/src
COPY apps/api/src apps/api/src
COPY tsconfig.base.json tsconfig.json ./

# Build API
RUN pnpm --filter @agenthub/api build

# ================================
# Stage 2: Build Web
# ================================
FROM node:20-alpine AS web-build

WORKDIR /app

# Copy package files
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
COPY apps/web/package.json apps/web/

# Install dependencies
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile

# Copy source code
COPY packages/ui/src packages/ui/src
COPY packages/config/src packages/config/src
COPY apps/web/src apps/web/src
COPY apps/web/public apps/web/public
COPY apps/web/next.config.js apps/web/next.config.js
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

# Copy built API
COPY --from=api-build /app/apps/api/dist ./dist
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/packages/db/dist ./node_modules/@agenthub/db
COPY --from=api-build /app/packages/auth/dist ./node_modules/@agenthub/auth
COPY --from=api-build /app/packages/validators/dist ./node_modules/@agenthub/validators
COPY --from=api-build /app/packages/config/dist ./node_modules/@agenthub/config

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
