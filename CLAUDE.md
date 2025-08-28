# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Notice

- Use pnpm.

## Project Overview

QRent is a rental property management system built with:
- **Backend**: Node.js + Express + tRPC for type-safe API layer
- **Frontend**: Two versions - Next.js (v1) and Next.js 15 with React 19 (v2)
- **Database**: MySQL 8.0 with Prisma ORM
- **Caching**: Redis
- **Monorepo**: pnpm workspaces with shared packages

## Development Commands

### Root Level Commands (run from project root)
```bash
# Development (all packages)
pnpm dev

# Build all packages  
pnpm build

# Run tests across all packages
pnpm test

# Backend specific
pnpm dev:backend
pnpm start:backend
pnpm test:backend

# Linting and formatting
pnpm lint:eslint
pnpm lint:write    # Format with Prettier
pnpm lint:check    # Check formatting
```

### Package-Specific Commands

**Backend** (`packages/backend`):
```bash
pnpm dev          # Development with hot reload
pnpm start        # Production mode
pnpm build        # Compile TypeScript
pnpm test         # Run Jest tests
```

**Frontend v2** (`packages/frontend-v2`):
```bash
pnpm dev          # Next.js dev with Turbopack
pnpm build        # Production build
pnpm test         # Run Vitest tests
pnpm test:unit    # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:coverage     # Coverage report
```

**Shared Package** (`packages/shared`):
```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed database
```

## Architecture

### Monorepo Structure
- `packages/backend/` - Express + tRPC API server
- `packages/frontend-v2/` - Next.js 15 frontend (current)
- `packages/frontend/` - Next.js frontend (legacy)
- `packages/shared/` - Shared utilities, Prisma schema, types
- `packages/scraper/` - Python property scraping service

### Backend Architecture
- **Server**: Express.js with tRPC mounted at `/trpc` endpoint
- **Authentication**: JWT tokens with middleware at `authenticate` function
- **Database**: Prisma ORM with MySQL, models include User, Property, EmailPreference, UserSession
- **Error Handling**: Custom `HttpError` class with unified tRPC error formatting
- **Structure**:
  - `src/controllers/` - Traditional REST controllers (being migrated to tRPC)
  - `src/trpc/routers/` - tRPC procedure definitions
  - `src/services/` - Business logic layer
  - `src/routes/` - Express route definitions

### Frontend Architecture (v2)
- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS v4
- **API Layer**: tRPC client with React Query integration
- **Testing**: Vitest with unit and integration test separation
- **Structure**:
  - `src/app/` - Next.js app directory with pages
  - `src/components/` - React components
  - `src/lib/` - Utilities including tRPC client setup

### Shared Package
- **Database Schema**: `prisma/schema.prisma` defines all models
- **Types**: Shared TypeScript interfaces and enums
- **Utilities**: Common helper functions used across packages

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - MySQL connection string
   - `BACKEND_LISTEN_HOST` and `BACKEND_LISTEN_PORT`
   - `BACKEND_JWT_SECRET_KEY`
   - `NEXT_PUBLIC_BACKEND_URL` for frontend

2. **Docker Development** (recommended):
   ```bash
   docker compose up  # Starts MySQL, Redis, and backend
   ```

3. **Local Development**:
   ```bash
   pnpm install
   cd packages/shared && pnpm db:generate && pnpm db:push
   ```

## Key Patterns

### tRPC Integration
- Backend exposes type-safe procedures via `/trpc` endpoint
- Frontend uses `@trpc/react-query` for data fetching
- Authentication handled via Bearer token headers
- Error handling unified between HTTP status codes and tRPC error codes

### Database Access
- All database operations use Prisma client from `@qrent/shared`
- Migrations managed via `prisma db push` (no formal migrations yet)
- Seeding available via `pnpm db:seed` in shared package

### Testing Strategy
- Backend: Jest for unit tests
- Frontend v2: Vitest with separate unit/integration test directories
- Integration tests include full tRPC client setup

### Code Quality
- ESLint configured for TypeScript with strict rules
- Prettier for code formatting
- TypeScript strict mode enabled across all packages

## Migration Notes
- System is transitioning from REST endpoints to tRPC
- Frontend v1 is legacy, active development on v2
- Some REST routes still exist for compatibility (e.g., rental letter generation)