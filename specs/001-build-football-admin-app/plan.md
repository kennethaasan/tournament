# Implementation Plan: Modern Football Tournament Administration App

**Branch**: `001-build-football-admin-app` | **Date**: 2025-11-05 | **Spec**: [./spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-build-football-admin-app/spec.md`

---

## Execution Flow (Spec-kit `/plan` Scope)

```
1. Load feature specification.
2. Confirm guardrails from AGENTS.md and instructions/ (Tailwind, Shadcn, Biome, TypeScript 5, Node 22, UUID v7).
3. Produce research decisions (this document references /research.md).
4. Finalize data model outline (see /data-model.md).
5. Draft quickstart expectations (see /quickstart.md).
6. Identify implementation phases & dependencies (below).
7. Stop – ready for `/tasks` once build phase begins.
```

---

## Summary

Rewrite the 2014 Laravel + Angular tournament admin into a modern Next.js TypeScript application with multi-format scheduling, self-service onboarding, configurable scoreboard, and real-time polling. Scope includes end-to-end experience for admins, tournament admins, team managers, and public spectators while maintaining Norwegian Bokmål UI and English code/logging.

---

## Technical Context

- **Language/Runtime**: TypeScript (ES2022), Node.js 22 (per `.nvmrc`).
- **Frameworks**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Shadcn.
- **Auth**: better-auth (email invite, password, MFA-ready).
- **Database**: PostgreSQL + Drizzle ORM, UUID v7 primary keys.
- **Tooling**: Biome (lint/format), Vitest, Playwright, Spectral, pino logging.
- **Deployment Target**: TBD (likely Vercel/AWS); plan accommodates serverless or containerized hosting.
- **Internationalization**: Norwegian Bokmål UI strings via resource files; English API/logs.
- **Real-time**: Polling endpoints with delta feeds.

---

## Compliance / Guardrails Check

- ✅ **Style & Formatting**: Biome enforced; 2-space indentation.
- ✅ **Imports**: Type-only imports, grouped ordering.
- ✅ **Error Handling**: No swallowed errors; use `Result`/throw with actionable messages; log via pino (no `console`).
- ✅ **Secrets**: `.env` pattern respected; `.env.example` maintained.
- ✅ **Generated Code**: Avoid editing `dist/`, `.next/`, `reports/`, migrations.
- ✅ **Legacy Folder**: `/laravel` remains untouched.
- ✅ **UUID v7**: Mandated in data model.
- ✅ **Localization**: NB UI text; English code/logs.

No blockers identified; proceed to implementation phases when ready.

---

## Phase Outline

1. **Foundation**
   - Initialize Tailwind/Shadcn (if not already).
   - Configure better-auth, Drizzle Postgres client, and pino logger.
   - Establish app layout, localization plumbing, and design tokens (including scoreboard theme variables).

2. **Domain & API (Backend-first)**
   - Implement Drizzle schema + migrations for core tables.
   - Expose OpenAPI-spec’d endpoints for tournaments, teams, players, matches, match events, registrations, notifications, scoreboard.
   - Integrate role-based guards with better-auth.
   - Seed scripts for demo data.

3. **Scheduling & Statistics Engines**
   - Build round-robin generator and knockout bracket services.
   - Implement standings/top-scorer calculators with Vitest coverage.
   - Wire event feed mechanism (delta cursor).

4. **Admin Interfaces (Authenticated UI)**
   - Global admin dashboard (tournaments list, role management).
   - Tournament admin workspace (phases, field config, match editor, scoreboard settings).
   - Score confirmation review queue.

5. **Team Manager Experience**
   - Team registration flow.
   - Roster management (players CRUD, payment status, availability).
   - Schedule/results views with notifications.

6. **Public Surfaces**
   - Tournament landing page (schedule, standings, top scorers).
   - Big-screen scoreboard with configurable modules, polling, auto-rotate.

7. **Quality Gates**
   - Contract tests (OpenAPI), integration tests (Vitest), E2E (Playwright).
   - Accessibility audits (axe, Playwright).
   - Performance checks for polling endpoints.

8. **Observability & Ops**
   - Monitoring dashboard (metrics/events).
   - Audit log viewer.
   - CI/CD pipelines (lint, test, build).

---

## Dependencies & Sequencing Notes

- Schema & migrations (Phase 2) block all downstream implementation.
- Role-based auth must be in place before UI routes (Phases 4/5).
- Scheduling services needed prior to match UI to avoid rework.
- Event feed must be stable before scoreboard and notification features.
- Localization resources should be set early to avoid English hardcoding.

---

Implementation tasks will be enumerated once `/tasks` is invoked, reusing patterns from the `mattis` modernization.

