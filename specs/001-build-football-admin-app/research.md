# Phase 0 Research: Modern Football Tournament Administration App

**Status**: Completed (2025-11-06)

This document captures the research activities required by the implementation plan. Each section
covers either an unknown from the technical context, a key dependency, or an integration pattern
and records the chosen direction alongside rationale and alternatives. Findings incorporate
lessons from the `mattis` reference application (e.g., `/tmp/mattis/src/lib/*`, `/tmp/mattis/src/app/*`).

---

## 1. Architecture & Module Layout

- **Decision**: Adopt a feature-first module layout (`src/modules/*`, `src/server/*`, `src/ui/*`) with
  route groups under `src/app/(public|dashboard)` mirroring the separation used in `mattis`.
- **Rationale**: Keeps domain logic isolated from transport/UI, enables strict typing boundaries,
  and mirrors proven patterns (`mattis/src/lib/api`, `mattis/src/components/layout`) for reuse. The
  layout supports clear ownership for competitions, editions, matches, notifications, and teams.
- **Alternatives considered**: Flat `src/app` folder with colocated logic (risks duplicated
  business rules); monolithic `services/` folder (harder to enforce domain boundaries).

## 2. Frontend Framework

- **Decision**: Use Next.js 16 (App Router) with React 19 server and client components.
- **Rationale**: Aligns with existing starter, supports streaming for public scoreboard pages, and
  server actions for admin mutations. `mattis` demonstrates workable patterns for domain-specific
  layouts (`mattis/src/app/leaderboard`).
- **Alternatives considered**: Vite + React (lacks integrated SSR and route conventions);
  Remix (strong data APIs but diverges from stakeholder tooling requirements).

## 3. Styling & Component System

- **Decision**: Tailwind CSS v4 with Shadcn UI primitives extended with design tokens and layout
  scaffolds modelled after `mattis/src/components/ui`.
- **Rationale**: Tailwind accelerates responsive Norwegian Bokmål UI, while Shadcn’s headless
  components simplify accessible interactions. Using composable layout primitives ensures DRY
  reuse across dashboards and scoreboard overlays.
- **Alternatives considered**: CSS Modules + Radix UI (heavier manual theming); Chakra UI (faster
  but less aligned with Tailwind tokens mandated by stakeholders).

## 4. State Management & Data Fetching

- **Decision**: Fetch data via server components/server actions where possible; use TanStack Query
  for client-side polling of live resources (matches, notifications, scoreboard) with stale-time and
  refetch intervals.
- **Rationale**: Server components minimize client bundle size and keep data fetching close to the
  backend. TanStack Query offers robust polling/backoff, mirroring `mattis` usage of SWR-like
  caching for leaderboards.
- **Alternatives considered**: SWR (lighter but fewer mutation primitives); Redux Toolkit (powerful
  but overkill for mostly server-rendered flows).

## 5. Authentication & Authorization

- **Decision**: Integrate better-auth for session + invite flows, pairing with middleware guards and
  Drizzle-backed role assignments (global, competition, edition, team scopes).
- **Rationale**: better-auth satisfies stakeholder requirement, offers MFA readiness, and integrates
  with Next middleware. RBAC alignment will mirror `mattis/src/lib/auth` patterns where policies are
  enforced close to server handlers.
- **Alternatives considered**: NextAuth (popular but lacks first-class RBAC without custom adapters);
  Clerk (adds cost and diverges from open-source mandate).

## 6. Persistence & Data Modeling

- **Decision**: PostgreSQL with Drizzle ORM, using UUID v7 primary keys and relational schemas for
  competitions, editions, stages, groups, matches, teams, people, squads, and audit trails.
- **Rationale**: PostgreSQL handles complex joins for standings and leaderboards; Drizzle provides
  type-safe migrations and mirrors `mattis/drizzle` folder structure for maintainability.
- **Alternatives considered**: Prisma (rich tooling but heavier runtime); MySQL (comparable but
  weaker support for recursive CTEs needed for bracket/standings calculations).

## 7. API Contract Strategy

- **Decision**: Document REST APIs in `/openapi.yaml` with OpenAPI 3.2, run Spectral via
  `npm run spectral`, generate typed clients through `npm run openapi:generate`, and consume them via
  `@/lib/api/client` (openapi-fetch).
- **Rationale**: Maintains single source of truth, enables type-safe client usage, and mirrors
  `mattis/src/lib/api` patterns. Contracts will cover admin dashboards, scoreboard polling, and
  notification feeds.
- **Alternatives considered**: GraphQL (flexible but adds schema duplication and caching concerns);
  manual fetch wrappers (faster initially but error-prone without typed contracts).

## 8. Scheduling & Match Computation

- **Decision**: Encapsulate scheduling algorithms (round-robin, knockout bracket generation) and
  recalculation of standings/statistics inside `src/modules/scheduling` and `src/modules/statistics`
  services with deterministic unit tests.
- **Rationale**: Keeps complex math separated from UI, simplifies testing, and aligns with the way
  `mattis/src/contexts` isolates competition logic.
- **Alternatives considered**: Ad-hoc scheduling inside API routes (hard to test, violates SRP);
  external scheduling service (overhead for phase one).

## 9. Real-Time Updates & Polling

- **Decision**: Provide a poll-based event feed (`GET /api/events?cursor=`) plus specific read
  endpoints (scoreboard, standings) with ETag support; default intervals 5 s for scoreboard, 15 s for
  notifications, with validation to prevent values <2 s.
- **Rationale**: Meets explicit spec requirement, minimizes infra complexity, and allows caching at
  CDN edge. Pattern follows `mattis`’ scoreboard update loop but introduces formal event cursors.
- **Alternatives considered**: WebSockets (future-friendly but unnecessary now); server-sent events
  (simpler than websockets but still more infra than required).

## 10. Notifications & Messaging

- **Decision**: Store notifications in Postgres, expose them via the polling feed, and trigger email
  digests through Amazon Simple Email Service (Amazon SES).
- **Rationale**: Provides immediate in-app feedback with optional email, aligns with deferring SMS,
  and mirrors `mattis/tests/integration/notifications` coverage expectations.
- **Alternatives considered**: Direct email-only notifications (fails in-app requirement);
  real-time push (exceeds phase-one scope).

## 11. Localization & Accessibility

- **Decision**: Hard-code Norwegian Bokmål strings in modules, centralized through helper utilities
  (`src/lib/i18n`) so future extraction to `next-intl` is straightforward; enforce WCAG 2.2 AA across
  scoreboard themes using Tailwind tokens.
- **Rationale**: Matches spec deferring runtime localization, keeps copy organized, and mirrors
  `mattis/src/lib/utils/locale` approach.
- **Alternatives considered**: Immediate adoption of `next-intl` (overhead + deviates from mandate);
  scattered inline strings (risk of inconsistent copy and translation debt).

## 12. Logging, Metrics & Auditing

- **Decision**: Use pino for structured logging with correlation IDs, emit audit events to a
  dedicated channel/table, and record metrics via OpenTelemetry instrumentation exported to the
  monitoring stack.
- **Rationale**: Aligns with constitution expectations and `mattis/src/lib/observability` structure;
  supports incident response and the required audit log filters.
- **Alternatives considered**: console logging (forbidden); Winston (flexible but heavier, less
  performant for high-volume polling endpoints).

## 13. Testing & Quality Gates

- **Decision**: Expand Vitest unit/integration coverage per module, Playwright E2E specs for user
  journeys (onboarding, scheduling, scoreboard, disputes), Spectral for contract linting, and ensure
  coverage ≥85 % with reports under `./reports`.
- **Rationale**: Enforces constitution’s evidence-backed discipline and mirrors `mattis/tests`
  distribution (unit vs integration vs e2e). Ensures scoreboard polling and scheduling logic remain
  regression-safe.
- **Alternatives considered**: Cypress for E2E (solid but Playwright already standardized);
  ad-hoc manual testing (insufficient for CI requirements).

---

All open questions from the technical context are resolved; no `NEEDS CLARIFICATION` items remain.
