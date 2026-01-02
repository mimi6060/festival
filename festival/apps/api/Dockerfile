# ============================================
# Festival API - Multi-Stage Dockerfile
# ============================================
# Optimized for production with minimal image size
# Node 20 Alpine base for security and performance

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install required system dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

# Install required system dependencies
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY tsconfig.base.json ./
COPY nx.json ./
COPY apps/api ./apps/api
COPY libs ./libs
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build the API application
RUN npm run build:api

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

# Add labels for container identification
LABEL org.opencontainers.image.title="Festival API"
LABEL org.opencontainers.image.description="Festival Management Platform - NestJS API"
LABEL org.opencontainers.image.vendor="Festival Platform"
LABEL org.opencontainers.image.version="1.0.0"

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    dumb-init \
    && apk upgrade --no-cache

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nestjs

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/api ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy package.json for runtime info
COPY --chown=nestjs:nodejs apps/api/package.json ./

# Create necessary directories with correct permissions
RUN mkdir -p /app/tmp /app/.cache \
    && chown -R nestjs:nodejs /app/tmp /app/.cache

# Switch to non-root user
USER nestjs

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
