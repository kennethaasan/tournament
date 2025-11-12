# Phase 1: Quickstart Guide

**Status**: Updated (2025-11-06)

This guide outlines the expected local development workflow for the modern football competition administration application once implementation aligns with the specification.

---

## Prerequisites

- **Node.js 22.x** (project ships with `.nvmrc`; run `nvm use`).
- **npm** (bundled with Node 22).
- **Docker** (for local PostgreSQL and ancillary services).
- **Better-auth CLI** (optional) for managing test credentials.

---

## 1. Repository Setup

```bash
git clone <repo-url> tournament
cd tournament
npm install
cp .env.example .env
```

Populate `.env` with local secrets. Expected keys (non-exhaustive):

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tournament_app"
BETTER_AUTH_SECRET="<generate-random>"
BETTER_AUTH_EMAIL_SENDER="no-reply@example.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 2. Start Local Infrastructure

Use the provided Compose file (to be added alongside implementation) or spin up PostgreSQL manually:

```bash
docker compose up -d postgres
# or
docker run --name tournament-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=tournament_app \
  -p 5432:5432 \
  -d postgres:16
```

---

## 3. Database Migration & Seed

```bash
npm run db:generate   # drizzle-kit generate (placeholder)
npm run db:migrate    # apply latest migrations
npm run seed          # seed sample competitions, editions, teams, matches (idempotent)
```

The seed should create:
- One competition with both a draft and a published edition for admin flows.
- Sample entries, squads, and matches tied to the published edition for scoreboard testing.
- Default users (global admin, edition admin, team manager) with known credentials.
- A public scoreboard demo available at `http://localhost:3000/competitions/oslo-cup/2025/scoreboard`.

---

## 4. Development Server

```bash
npm run dev
```

- App routes available at `http://localhost:3000`.
- Public scoreboard example at `http://localhost:3000/competitions/{competitionSlug}/{editionSlug}/scoreboard`.
- API endpoints under `/api/*` (protected as appropriate).

---

## 5. Testing

```bash
npm run lint         # biome + typegen
npm run tsc          # standalone type check (if separate script added)
npm test             # Vitest unit/integration (with coverage)
npx playwright test  # Playwright E2E suite
npm run test:accessibility # Pa11y CI against organizer + scoreboard
npm run spectral     # OpenAPI 3.2 contract lint (Problem Details & project rules)
```

## 6. Performance Budgets

Validate polling budgets with:

```bash
npm run check-performance
```

By default this hits the scoreboard (`/api/public/editions/oslo-cup/2025/scoreboard`) and event feed (`/api/public/events`) endpoints three times each, ensuring the worst request stays within 250 ms and 200 ms respectively. Override the base URL or budgets with `PERF_*` env vars when testing against other environments. Use CLI flags for more control, e.g. `npm run check-performance -- --runs=5 --json`.

---

## 6. Useful Demo Credentials (per seed)

- Global Admin: `admin@example.com` / `Password123!`
- Edition Admin: `edition-admin@example.com` / `Password123!`
- Team Manager: `lagleder@example.com` / `Password123!`

Seeding also provisions Oslo Cup (2025 published, 2026 draft), four demo teams with rosters, staged matches for the scoreboard, and an active highlight overlay so the Pa11y/Playwright checks can observe live changes.

---

## 7. Housekeeping

- Run `npm run format` before commits to apply Biome formatting.
- Use `npm run test:watch` (to be added) for iterative Vitest runs.
- Use `npm run test:e2e` for Playwright UI validation.
- Regenerate OpenAPI clients via `npm run openapi:generate` after contract changes.
- Norwegian Bokmål copy is hard-coded in source for now; text updates require code changes.

---

Future updates to this guide should reference concrete script names as the implementation matures.
