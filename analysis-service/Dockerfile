# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directory for images
RUN mkdir -p /app/images

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.js"]
