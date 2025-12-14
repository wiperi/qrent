# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Notice

- Use pnpm.

## Project Overview

QRent is an AI-powered rental platform for international students in Australia. It helps students find housing by analyzing commute time, budget, and area data to recommend suitable rentals.

Built with:
- **Backend**: Node.js + Express + tRPC for type-safe API layer
- **Frontend**: Next.js 15 with App Router and React 19
- **Database**: MySQL 8.0 with Prisma ORM
- **Caching**: Redis
- **Scraper**: Python-based property scraping services
- **Monorepo**: pnpm workspaces with shared packages

**License**: Non-Commercial License (NCL 1.0) - commercial use requires separate authorization.

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
pnpm lint
pnpm style:write    # Format with Prettier
pnpm style          # Check formatting
```

### Package-Specific Commands

**Backend** (`packages/backend`):
```bash
pnpm dev          # Development with hot reload
pnpm start        # Production mode
pnpm build        # Compile TypeScript
pnpm test         # Run Jest tests
```

**Frontend** (`packages/frontend`):
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
- `packages/frontend/` - Next.js 15 frontend
- `packages/shared/` - Shared utilities, Prisma schema, types
- `packages/scraper/` - Python property scraping service (legacy)
- `packages/tt.scraper-v2/` - Python property scraping service (current)

### Backend Architecture
- **Server**: Express.js with tRPC mounted at `/trpc` endpoint
- **Authentication**: JWT tokens with middleware at `authenticate` function
- **Database**: Prisma ORM with MySQL, models include User, Property, EmailPreference, UserSession, School, Region, PropertySchool
- **Error Handling**: Custom `HttpError` class with unified tRPC error formatting via `httpStatusToTrpcCode`
- **Structure**:
  - `src/controllers/` - Traditional REST controllers (being migrated to tRPC)
  - `src/trpc/routers/` - tRPC procedure definitions (auth, properties, users, propertyStats)
  - `src/services/` - Business logic layer
  - `src/routes/` - Express route definitions
  - `src/utils/` - Helper functions, Redis client, cron jobs

### Frontend Architecture
- **Framework**: Next.js 15 with App Router and React 19
- **Styling**: Tailwind CSS v4
- **API Layer**: tRPC client with React Query integration via `@trpc/tanstack-react-query`
- **Testing**: Vitest with unit and integration test separation
- **Authentication**: JWT tokens stored in localStorage, sent via Bearer header
- **Structure**:
  - `src/app/` - Next.js app directory with pages
  - `src/components/` - React components
  - `src/lib/` - Utilities including tRPC client setup ([trpc.ts](packages/frontend/src/lib/trpc.ts))

### Shared Package
- **Database Schema**: `prisma/schema.prisma` defines all models
- **Types**: Shared TypeScript interfaces and enums
- **Utilities**: Common helper functions used across packages

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - MySQL connection string
   - `BACKEND_LISTEN_HOST` and `BACKEND_LISTEN_PORT`
   - `BACKEND_JWT_SECRET_KEY`
   - `REDIS_URL` - Redis connection string
   - `NEXT_PUBLIC_BACKEND_URL` for frontend

2. **Docker Development** (recommended):
   ```bash
   docker compose up -d db redis  # Starts MySQL and Redis only
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
- Error handling unified between HTTP status codes and tRPC error codes via `httpStatusToTrpcCode` in [packages/backend/src/trpc/trpc.ts](packages/backend/src/trpc/trpc.ts)
- tRPC context created in [packages/backend/src/trpc/context.ts](packages/backend/src/trpc/context.ts)

### Authentication Flow
- JWT tokens generated with 90-day expiration via `generateToken` in [packages/backend/src/utils/helper.ts](packages/backend/src/utils/helper.ts)
- `authenticate` middleware in [packages/backend/src/utils/helper.ts](packages/backend/src/utils/helper.ts) verifies tokens
- Whitelist paths: `/auth/login`, `/auth/register`, `/echo`, `/properties/search`, `/property-stats`
- Frontend stores tokens in localStorage and sends via Authorization header

### Database Access
- All database operations use Prisma client from `@qrent/shared`
- Migrations managed via `prisma db push` (no formal migrations yet)
- Seeding available via `pnpm db:seed` in shared package

### Testing Strategy
- Backend: Jest for unit tests
- Frontend: Vitest with separate unit/integration test directories
- Integration tests include full tRPC client setup

### Code Quality
- ESLint configured for TypeScript with strict rules in [eslint.config.mjs](eslint.config.mjs)
- Prettier for code formatting
- TypeScript strict mode enabled across all packages
- Backend allows console logs, frontend warns on console usage

## Migration Notes
- System is transitioning from REST endpoints to tRPC
- Some REST routes still exist for compatibility (e.g., rental letter generation at `/api/generate-rental-letter`)
- tRPC router structure in [packages/backend/src/trpc/routers/index.ts](packages/backend/src/trpc/routers/index.ts)
