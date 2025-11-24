# syntax=docker/dockerfile:1.7

########################################
# Stage 1: dependency download cache
########################################
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lock files only to maximize layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm \
  && pnpm fetch

########################################
# Stage 2: build Angular SSR bundle
########################################
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm \
  && pnpm install --frozen-lockfile --prefer-offline

COPY . .
ARG BUILD_ENV=production
ENV NODE_ENV=$BUILD_ENV
RUN pnpm run build:ssr

########################################
# Stage 3: runtime image
########################################
FROM node:20-alpine AS runner
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

# Create non-root user for security
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

# Copy built artifacts only
COPY --from=builder /app/dist/Course ./

USER nodeuser
EXPOSE 4000

# Basic health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT} || exit 1

CMD ["node", "server/server.mjs"]
