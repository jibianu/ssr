# Stage 1: Build Angular application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the Angular application
RUN pnpm run build:ssr

# Stage 2: Set up Node.js server for SSR
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy built application from Stage 1
COPY --from=builder /app/dist/Course ./

# Install dependencies for server
# NOT NEEDED FOR ANGULAR
# because angular is already compiled to JS
# RUN pnpm install --omit=dev --legacy-peer-deps
# RUN pnpm install --only=production

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server/server.mjs"]


