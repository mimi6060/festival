FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nx build api --prod

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/api ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "main.js"]
