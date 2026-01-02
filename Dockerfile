# Festival API - Production Dockerfile
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the API
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Set ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
