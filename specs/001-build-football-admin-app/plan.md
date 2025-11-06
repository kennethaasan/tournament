# Implementation Plan: Modern Football Tournament Administration App

**Branch**: `001-build-football-admin-app` | **Date**: 2025-11-06 | **Spec**: [/specs/001-build-football-admin-app/spec.md](/specs/001-build-football-admin-app/spec.md)
**Input**: Feature specification from `/specs/001-build-football-admin-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Next.js 16 (App Router) platform that replaces the legacy Laravel administration tool with modular domain slices (competitions, editions, teams, matches, notifications) modeled after the `mattis` reference architecture. Leverage server components for public surfaces, secure dashboards behind better-auth RBAC, and encapsulate scheduling, statistics, and polling workflows in dedicated service layers to keep UI flows thin and reusable.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 with React 19 server/client components  
**Primary Dependencies**: Next.js 16 App Router, Tailwind CSS 4, Shadcn UI, better-auth, Drizzle ORM, pino, OpenAPI tooling (openapi-fetch), TanStack Query (polling), Vitest/Playwright stack  
**Storage**: PostgreSQL via Drizzle ORM with UUID v7 identifiers  
**Testing**: Vitest (unit/integration), Playwright (E2E), Spectral (OpenAPI), Biome (lint/format), npm scripts (`npm run lint`, `npm run tsc`, `npm run test`, `npm run build`)  
**Target Platform**: Web (Next.js server + edge-friendly APIs) deployed to Node 22 environment  
**Project Type**: Web application (Next.js repo with shared domain modules)  
**Performance Goals**: Polling endpoints ≤200 ms p95 with ≤10 active matches; public pages <2 s LCP; 99.0 % uptime budget  
**Constraints**: Enforce WCAG 2.2 AA, avoid console logging, maintain RFC 9457 error payloads, UI copy in Norwegian Bokmål  
**Scale/Scope**: Support up to 2 concurrent editions, multi-stage tournaments, self-service onboarding, scoreboard display module, notifications center

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Quality-Driven TypeScript Craft** — Scope covers domain modules under `src/modules/*`, API handlers in `src/server/api`, and UI routes in `src/app/(dashboard|public)`. Mandatory `npm run lint`, `npm run tsc`, and `npm run build` before review; propagate failures through typed `Result` helpers or thrown `Error` instances logged via pino. Data contracts captured in `/specs/001-build-football-admin-app/contracts/openapi.yaml` align with Drizzle schemas in `data-model.md`.
- [x] **Evidence-Backed Testing Discipline** — Plan includes Vitest suites alongside modules (`src/modules/**/__tests__`), integration checks for scheduling/statistics services, Playwright specs for onboarding/scheduling/scoreboard, and Spectral + contract tests for OpenAPI changes; `research.md` and `data-model.md` enumerate seeding assumptions so `npm run seed` prepares fixtures before integration/E2E runs.
- [x] **Inclusive, Consistent Experience** — Reuse mattis-inspired layout primitives in `src/ui/components`, adhere to Tailwind tokens, enforce keyboard navigation and screen-reader announcements for dashboards and scoreboard overlays, centralize Bokmål copy helpers to avoid drift. Accessibility touchpoints are embedded in scoreboard payload definitions and quickstart guidance.
- [x] **Performance-Conscious Delivery** — Budgets: admin dashboards <500 ms TTFB, scoreboard polling ≤200 ms p95 with ETag caching, bundle budgets tracked via Next.js analyzer; rollback strategy relies on feature flags per module and configurable polling intervals if targets slip, with metrics surfaced via OpenTelemetry (see `research.md`).

## Project Structure

### Documentation (this feature)

```text
specs/001-build-football-admin-app/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI slices)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)
```text
src/
├── app/
│   ├── (public)/         # Edition landing, scoreboard, registration
│   ├── (dashboard)/      # Authenticated admin + team manager flows
│   └── api/              # Route handlers delegating to server services
├── modules/
│   ├── competitions/
│   ├── editions/
│   ├── matches/
│   ├── notifications/
│   ├── teams/
│   └── users/
├── server/
│   ├── api/
│   ├── auth/
│   ├── db/
│   └── services/
├── ui/
│   ├── components/
│   ├── hooks/
│   └── layouts/
├── lib/
│   ├── configs/
│   ├── logger/
│   └── utils/
```

Vitest suites live in `__tests__` directories colocated with their source modules (for example `src/modules/matches/__tests__`).

```text
e2e/
└── specs/
```

**Structure Decision**: Single Next.js workspace with feature-first domain modules mirroring `mattis` layering. `src/modules/*` encapsulates business logic, `src/server` centralizes adapters (auth, db, api), and `src/ui` hosts reusable presentation primitives shared across route groups in `src/app`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
