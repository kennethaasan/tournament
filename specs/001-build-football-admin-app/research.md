# Phase 0: Research & Technical Decisions

**Status**: Completed (2025-11-05)

This document captures technology choices and architectural direction for the modern football competition administration platform. Decisions align with stakeholder requirements, the legacy Laravel feature set, and patterns proven in the `mattis` modernization.

---

## 1. Frontend Framework

- **Decision**: Next.js 16 (App Router) with React 19 server/client components.
- **Rationale**: Matches the existing starter, delivers hybrid rendering (SSG/SSR) for public pages (scoreboard, competition/edition hubs) and client-side interactivity for admin dashboards. Server Components reduce client bundle size for data-heavy views (standings, schedules).
- **Alternatives Considered**:
  - *Vite + React*: Faster local builds but lacks integrated routing/data-fetching and server rendering required for public scoreboard performance.

## 2. Styling & UI Components

- **Decision**: Tailwind CSS v4 with Shadcn UI primitives.
- **Rationale**: Tailwind accelerates building responsive layouts; Shadcn provides accessible, headless components adaptable to Norwegian Bokmål copy. Matches stakeholder mandate.
- **Accessibility Considerations**: Enforce contrast checks for configurable scoreboard themes, integrate Tailwind’s `@apply` with custom CSS variables to keep dynamic themes within WCAG 2.2 AA.

## 3. State Management & Data Fetching

- **Decision**: Lean on Next.js server actions and RSC data fetching for authenticated dashboards; use React Query (TanStack Query) for client-side polling of live data (matches, notifications).
- **Rationale**: Server actions simplify mutations with automatic revalidation; React Query handles polling intervals and caching for live updates with retry/backoff support.
- **Alternatives Considered**:
  - `SWR`: Lightweight but lacks built-in mutation orchestration and cache invalidation patterns required for complex competition data flows.

## 4. Authentication & Authorization

- **Decision**: better-auth for email+password flows, session management, and invite-based onboarding.
- **Rationale**: Stakeholder requirement; better-auth provides RBAC primitives, device/session inspection, and MFA readiness. Integrates with Next.js (middleware) and Drizzle (adapter).
- **Role Model**: Implement scoped role assignments (global, competition, edition, team) via database-backed policies, enforced at API layer and server components.

## 5. Data Layer & Persistence

- **Decision**: PostgreSQL with Drizzle ORM.
- **Rationale**: Relational data suits competitions and editions (entities with strong relationships). Drizzle offers type-safe schema definitions, migrations, and easy UUID v7 support. PostgreSQL handles complex queries (standings, leaderboards) efficiently.
- **Alternatives Considered**:
  - MySQL: Comparable but lacks native support for some advanced features (CTEs) used for standings calculations.
  - DynamoDB: Not a natural fit for relational scheduling data.

## 6. Real-Time Updates & Notifications

- **Decision**: Polling-based updates backed by incremental event feeds.
- **Rationale**: Stakeholder explicitly allows polling. Implement `/api/events?cursor=` endpoints returning deltas since last poll, plus ETag support for scoreboard data. Future WebSocket upgrade feasible but not required.
- **Polling Targets**:
  - Scoreboard modules (matches, standings, top scorers) – default 5 s interval, configurable per edition.
  - Notification center for managers/admins – default 15 s interval.
  - Background workers emit consolidation events to keep payloads lean.

## 7. Notifications & Messaging

- **Decision**: In-app notification center with optional email dispatch via background job (Node worker or edge function).
- **Rationale**: Keeps initial scope manageable while meeting requirement for timely updates. Email optional but recommended for schedule changes; SMS defer until stakeholder confirms.
- **Implementation Notes**: Store notifications in Postgres, expose them via event feed. Use bullmq/Redis if queueing becomes necessary.

## 8. Scheduling & Computation

- **Decision**: Dedicated scheduling service module generating round-robin fixtures and knockout brackets.
- **Rationale**: Encapsulates scheduling algorithms (circle method for round robin, seeded bracket generation) enabling unit testing and reuse. Results stored in `matches` table scoped to editions with draft status until published.

## 9. Internationalization

- **Decision**: `next-intl` (or native Next.js i18n routing) with translation files keyed in US English, values in Norwegian Bokmål.
- **Rationale**: Allows UI copy to live in resource files while keeping code in English. Supports runtime editing by loading competition/edition-specific overrides from the database.

## 10. Logging & Observability

- **Decision**: Pino for structured logging; OpenTelemetry instrumentation for critical flows.
- **Rationale**: Pino meets performance and project standards (see AGENTS.md). OpenTelemetry enables tracing across API calls and background jobs, important for diagnosing schedule generation and scoreboard latency.
- **Metrics Targets**: Response time percentiles for polling endpoints, queue depth for notifications, match update latency.

## 11. Testing & Quality Gates

- **Decision**: Vitest (unit/integration), Playwright (E2E), Spectral (OpenAPI lint), Biome (lint/format).
- **Rationale**: Aligns with project tooling; ensures contracts, roles, and accessibility regressions are caught early. Reuse testing patterns from `mattis` repo.

---

All critical architectural choices now align with stakeholder expectations and legacy feature parity. No open research items remain.
