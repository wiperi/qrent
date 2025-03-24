# Use an official Node.js runtime as the base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install pnpm globally and necessary tools
# RUN apk add --no-cache netcat-openbsd

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

# # Build Prisma client
RUN cd packages/shared && pnpm db:generate
# RUN cd packages/shared && pnpm db:push

# # Command to run the app with waiting for database
# CMD ["/wait-for-db.sh", "db", "/startup.sh", "pnpm", "--filter", "@qrent/backend", "dev"]
# RUN pnpm prisma db push
CMD [ "pnpm", "--filter", "@qrent/backend", "dev" ]