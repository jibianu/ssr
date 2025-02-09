# Stage 1: Build Angular application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Build the Angular application
RUN npm run build:ssr

# Stage 2: Set up Node.js server for SSR
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy built application from Stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install dependencies for server
RUN npm install --legacy-peer-deps

# Expose port
EXPOSE 4005

# Start the server
CMD ["node", "dist/Course/server/main.js"]

