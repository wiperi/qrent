# Use an official Node.js runtime as the base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package configs and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
# Allow build script execution
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --frozen-lockfile

# Copy project files
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Copy startup script
COPY packages/backend/startup.sh ./
RUN chmod +x ./startup.sh

# Use the startup script as the entry point
CMD ["./startup.sh"]