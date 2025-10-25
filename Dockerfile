# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Verify critical files exist
RUN test -f build/css-loader.mjs || (echo "ERROR: build/css-loader.mjs not found!" && exit 1)
RUN test -f build/generate-static.ts || (echo "ERROR: build/generate-static.ts not found!" && exit 1)

# List build directory for debugging (will show in Railway logs)
RUN echo "=== Build directory contents ===" && ls -la build/

# Clean any previous build artifacts
RUN rm -rf dist

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy public directory for data files
COPY public ./public

# Copy server files and config
COPY server.js ./
COPY server ./server
COPY menu-config.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Railway will override this)
EXPOSE 3000

# Start the Express server
CMD ["node", "server.js"]