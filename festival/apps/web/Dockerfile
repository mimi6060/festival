# ============================================
# Festival Web - Multi-Stage Dockerfile
# ============================================
# Optimized Next.js production build with standalone output
# Minimal image size for fast deployments

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install required system dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/

# Install dependencies
RUN npm ci && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

# Install required system dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Copy source code
COPY tsconfig.base.json ./
COPY nx.json ./
COPY apps/web ./apps/web
COPY libs ./libs

# Set Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_APP_URL

# Set build-time environment variables
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Build the Next.js application
WORKDIR /app/apps/web
RUN npm run build

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

# Add labels for container identification
LABEL org.opencontainers.image.title="Festival Web"
LABEL org.opencontainers.image.description="Festival Management Platform - Next.js Web Application"
LABEL org.opencontainers.image.vendor="Festival Platform"
LABEL org.opencontainers.image.version="1.0.0"

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    && apk upgrade --no-cache

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/web/public ./public

# Set correct permissions for prerender cache
RUN mkdir -p .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
# Automatically leverages output traces to only copy needed files
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Create necessary directories
RUN mkdir -p /app/tmp \
    && chown -R nextjs:nodejs /app/tmp

# Switch to non-root user
USER nextjs

# Expose the web port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start Next.js standalone server
CMD ["node", "server.js"]
