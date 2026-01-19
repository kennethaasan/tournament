---
description: "Task list template for feature implementation"
---

# Tasks: Modern Football Tournament Administration App

**Input**: Design documents from `/specs/001-build-football-admin-app/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Create Vitest contract/integration suites and Playwright E2E journeys for every user story; you may create tests after implementation if that sequence is easier.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align local tooling and environment baselines required by quickstart.md.

- [X] T001 Create environment template with required placeholders in `.env.example`.
- [X] T002 Expand Docker compose with Postgres 17 service plus persistent volumes in `compose.yaml`.
- [X] T003 Update npm scripts for linting, type-checking, testing, contracts, database, and seeding workflows in `package.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

- [X] T004 Generate Drizzle configuration targeting the Postgres container and migrations output in `drizzle.config.ts`.
- [X] T005 Implement reusable Postgres client and transaction helpers in `src/server/db/client.ts`.
- [X] T006 [P] Define shared database enums, timestamp helpers, and base schema utilities in `src/server/db/schema/shared.ts`.
- [X] T007 Configure structured logging with correlation context in `src/lib/logger/powertools.ts`.
- [X] T008 Add ProblemDetails error types and Result helper utilities in `src/lib/errors/problem.ts`.
- [X] T009 Build API handler wrapper enforcing auth, logging, and RFC 9457 error translation in `src/server/api/handler.ts`.
- [X] T010 [P] Scaffold better-auth server configuration with role guards in `src/server/auth/index.ts`.
- [X] T011 [P] Add OpenAPI type generation pipeline using `openapi-typescript` (https://openapi-ts.dev/introduction) to produce shared types for API handlers and UI clients, integrating `openapi-fetch` and Zod validation in `src/lib/api/client.ts`.
- [X] T012 Raise Vitest coverage thresholds to ≥85% and align reporters in `vitest.config.ts`.

**Checkpoint**: Foundation ready—user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 – Competition Organizer Onboarding (Priority: P1) MVP

**Goal**: Allow a new organizer to create an account, launch a competition, receive scoped admin access, and configure the first edition baseline.

**Independent Test**: From a clean database, run organizer signup → competition creation → edition creation; verify the organizer gains `competition_admin` role, edition settings persist, and the public landing page renders.

### Tests for User Story 1 (Required)

- [X] T013 [P] [US1] Add contract tests for invitations and competition creation in `src/modules/identity/__tests__/contracts/invitations.contract.test.ts`.
- [X] T013b [P] [US1] Add contract tests for invitation acceptance in `src/modules/identity/__tests__/contracts/accept-invitation.contract.test.ts`.
- [X] T014 [P] [US1] Add integration test covering self-service competition onboarding in `src/modules/competitions/__tests__/integration/organizer-self-service.test.ts`.

### Implementation for User Story 1

- [X] T015 [P] [US1] Implement identity tables (`users`, `role_invitations`, `user_roles`) in `src/server/db/schema/identity.ts`.
- [X] T016 [P] [US1] Implement competition tables (`competitions`, `editions`, `edition_settings`, `venues`) in `src/server/db/schema/competitions.ts`.
- [X] T017 [US1] Build invite acceptance and role assignment services in `src/modules/identity/service.ts`.
- [X] T018 [US1] Build competition and edition domain services with scoreboard validation in `src/modules/competitions/service.ts`.
- [X] T019 [US1] Implement `POST /api/auth/invitations` handler in `src/app/api/auth/invitations/route.ts`.
- [X] T019b [US1] Implement `POST /api/auth/invitations/accept` handler in `src/app/api/auth/invitations/accept/route.ts`.
- [X] T020 [US1] Implement `POST /api/competitions` handler in `src/app/api/competitions/route.ts`.
- [X] T021 [US1] Implement `POST /api/competitions/[competitionId]/editions` handler in `src/app/api/competitions/[competitionId]/editions/route.ts`.
- [X] T022 [US1] Build organizer signup page and invite acceptance flow in `src/app/(public)/auth/organizer-signup/page.tsx`.
- [X] T022b [US1] Build invitation acceptance page in `src/app/(public)/auth/invitations/[token]/page.tsx`.
- [X] T023 [US1] Build competition creation dashboard surface in `src/app/dashboard/competitions/new/page.tsx`.
- [X] T023b [US1] Build invitations dashboard surface in `src/app/(dashboard)/dashboard/invitations/page.tsx`.
- [X] T023c [US1] Add scope-aware invite helper lists and dashboard autocomplete in `src/app/api/competitions/route.ts`, `src/app/api/teams/route.ts`, and `src/app/(dashboard)/dashboard/invitations/invitations-panel.tsx`.
- [X] T023d [US1] Send invitation emails via Amazon SES from `src/app/api/auth/invitations/route.ts` and `src/server/email/invitations.ts`.
- [X] T024 [US1] Implement scoreboard theme form component with WCAG validation in `src/ui/components/scoreboard/theme-form.tsx`.
- [X] T025 [US1] Build edition creation dashboard page integrating scoreboard settings in `src/app/dashboard/competitions/[competitionId]/editions/new/page.tsx`.

**Checkpoint**: Self-service competition onboarding is fully functional and independently testable.

---

## Phase 4: User Story 2 – Global Admin Oversight (Priority: P2)

**Goal**: Enable global admins to review competitions, manage scoped roles, audit sensitive actions, and monitor platform health indicators.

**Independent Test**: As a global admin, view the admin overview dashboard, inspect audit log filters, and confirm metric panels populate without touching organizer flows.

### Tests for User Story 2 (Required)

 - [X] T026 [P] [US2] Add contract tests for `GET /api/competitions/{competition_id}` enforcing admin scope in `src/modules/admin/__tests__/contracts/competition-detail.contract.test.ts`.
 - [X] T027 [P] [US2] Add integration test for global admin dashboard data aggregation in `src/modules/admin/__tests__/integration/global-admin-dashboard.test.ts`.

### Implementation for User Story 2

 - [X] T028 [P] [US2] Implement audit and notification schema slices in `src/server/db/schema/audit.ts`.
 - [X] T029 [US2] Build global admin service aggregating competitions, roles, and metrics in `src/modules/admin/service.ts`.
 - [X] T030 [US2] Implement admin competition detail handler (`GET`) in `src/app/api/competitions/[competitionId]/route.ts`.
 - [X] T031 [US2] Build global admin overview dashboard in `src/app/dashboard/admin/overview/page.tsx`.
 - [X] T032 [US2] Build audit log review surface with filters in `src/app/dashboard/admin/audit/page.tsx`.
 - [X] T033 [US2] Emit analytics events for admin use cases in `src/server/observability/events.ts`.

**Checkpoint**: Global admin oversight works independently once US1 foundation exists.

---

## Phase 5: User Story 3 – Edition Administration & Scheduling (Priority: P3)

**Goal**: Allow edition admins to configure stages, generate schedules, manage results, and control scoreboard overlays.

**Independent Test**: As an edition admin, create stages, run the scheduling wizard, edit match results, and update scoreboard overlays while verifying standings and leaderboards refresh.

### Tests for User Story 3 (Required)

- [X] T034 [P] [US3] Add contract tests for `POST /api/editions/{edition_id}/stages` in `src/modules/editions/__tests__/contracts/create-stage.contract.test.ts`.
- [X] T035 [P] [US3] Add integration test for the round-robin scheduling wizard in `src/modules/scheduling/__tests__/integration/round-robin-wizard.test.ts`.

### Implementation for User Story 3

- [X] T036 [P] [US3] Add stage, group, bracket, and round schemas in `src/server/db/schema/stages.ts`.
- [X] T037 [P] [US3] Add match and match event schemas in `src/server/db/schema/matches.ts`.
- [X] T038 [US3] Implement round-robin scheduling service in `src/modules/scheduling/round-robin-service.ts`.
- [X] T039 [US3] Implement knockout bracket builder service in `src/modules/scheduling/bracket-service.ts`.
- [X] T040 [US3] Implement `POST /api/editions/[editionId]/stages` handler in `src/app/api/editions/[editionId]/stages/route.ts`.
- [X] T041 [US3] Implement `POST /api/editions/[editionId]/matches/bulk` handler in `src/app/api/editions/[editionId]/matches/bulk/route.ts`.
- [X] T042 [US3] Implement `PATCH /api/matches/[matchId]` handler for results in `src/app/api/matches/[matchId]/route.ts`.
- [X] T043 [US3] Build scheduling dashboard with stage builder UI in `src/app/dashboard/editions/[editionId]/schedule/page.tsx`.
- [X] T044 [US3] Build scoreboard control panel with highlight overlays in `src/app/dashboard/editions/[editionId]/scoreboard/page.tsx`.
- [X] T044b [US3] Add entry submission lock controls to the schedule dashboard in `src/app/(dashboard)/dashboard/editions/[editionId]/schedule/schedule-dashboard.tsx`.

**Checkpoint**: Edition administration flows are independently testable once US1 is available.

---

## Phase 6: User Story 4 – Team Manager Operations (Priority: P4)

**Goal**: Provide team managers with reusable rosters, edition entry submission, squad management, disputes, and notifications.

**Independent Test**: As a team manager, manage roster, submit an entry, assemble a squad with validation, file a dispute, and confirm notification delivery without touching admin dashboards.

### Tests for User Story 4 (Required)

- [X] T045 [P] [US4] Add contract tests for `POST /api/teams/{team_id}/entries` in `src/modules/teams/__tests__/contracts/team-entry.contract.test.ts`.
- [X] T046 [P] [US4] Add integration test for team manager dashboard flows in `src/modules/teams/__tests__/integration/team-manager-dashboard.test.ts`.

### Implementation for User Story 4

- [X] T047 [P] [US4] Implement team, person, and membership schemas in `src/server/db/schema/teams.ts`.
- [X] T048 [P] [US4] Implement entry and squad schemas in `src/server/db/schema/entries.ts`.
- [X] T049 [US4] Build team roster service (teams, persons, memberships) in `src/modules/teams/service.ts`.
- [X] T050 [US4] Build entry and squad service with validation in `src/modules/entries/service.ts`.
- [X] T051 [US4] Implement `POST /api/teams` handler in `src/app/api/teams/route.ts`.
- [X] T052 [US4] Implement `POST /api/teams/[teamId]/entries` handler in `src/app/api/teams/[teamId]/entries/route.ts`.
- [X] T053 [US4] Implement `PUT /api/entries/[entryId]/squads` handler in `src/app/api/entries/[entryId]/squads/route.ts`.
- [X] T054 [US4] Implement `POST /api/squads/[squadId]/members` handler in `src/app/api/squads/[squadId]/members/route.ts`.
- [X] T055 [US4] Implement `POST /api/matches/[matchId]/disputes` handler in `src/app/api/matches/[matchId]/disputes/route.ts`.
- [X] T056 [US4] Build team roster management UI in `src/app/dashboard/teams/[teamId]/roster/page.tsx`.
- [X] T057 [US4] Build edition entry and squad UI in `src/app/dashboard/teams/[teamId]/entries/page.tsx`.
- [X] T058 [US4] Build notification center with poll-based feed in `src/app/dashboard/notifications/page.tsx`.
- [X] T058b [US4] Add edition entry review endpoint and admin UI in `src/app/api/editions/[editionId]/entries/route.ts` and `src/app/(dashboard)/dashboard/editions/[editionId]/schedule/schedule-dashboard.tsx`.

**Checkpoint**: Team manager workflows are independently testable with previously delivered stories.

---

## Phase 7: User Story 5 – Public Scoreboard & Venue Display (Priority: P5)

**Goal**: Deliver an accessible, real-time public scoreboard and event feed for spectators and venue staff.

**Independent Test**: Load the public scoreboard page for a seeded edition, observe polling-driven updates, verify contrast/accessibility, and confirm event feed delivers incremental payloads without authentication.

### Tests for User Story 5 (Required)

- [X] T059 [P] [US5] Add contract tests for `GET /api/public/editions/{edition_slug}/scoreboard` in `src/modules/public/__tests__/contracts/scoreboard.contract.test.ts`.
- [X] T060 [P] [US5] Add integration test for event feed polling in `src/modules/public/__tests__/integration/event-feed.test.ts`.
- [X] T060b [P] [US5] Add landing view render test in `src/ui/__tests__/scoreboard-landing.test.tsx`.

### Implementation for User Story 5

- [X] T061 [P] [US5] Implement scoreboard query service aggregating standings and leaders in `src/modules/public/scoreboard-service.ts`.
- [X] T062 [US5] Implement `GET /api/public/editions/[editionSlug]/scoreboard` handler in `src/app/api/public/editions/[...editionSlug]/scoreboard/route.ts`.
- [X] T063 [US5] Implement `GET /api/public/events` handler in `src/app/api/public/events/route.ts`.
- [X] T064 [US5] Build public scoreboard page with streaming sections in `src/app/(public)/competitions/[competitionSlug]/[editionSlug]/scoreboard/page.tsx`.
- [X] T065 [US5] Build reusable scoreboard layout components in `src/ui/components/scoreboard/scoreboard-layout.tsx`.
- [X] T066 [US5] Implement TanStack Query polling hook in `src/ui/hooks/useScoreboardPoll.ts`.
- [X] T066b [US5] Expand scoreboard route into landing view with UI toggle for big-screen mode in `src/ui/components/scoreboard/scoreboard-layout.tsx`.
- [X] T066c [US5] Add scoreboard module configuration and venue display support across `src/modules/public/scoreboard-service.ts`, `src/ui/components/scoreboard/scoreboard-layout.tsx`, and `src/app/(dashboard)/dashboard/editions/[editionId]/scoreboard/scoreboard-control.tsx`.
- [X] T066d [US5] Apply head-to-head and fair play tie-breakers in `src/modules/public/scoreboard-service.ts`.

**Checkpoint**: Public scoreboard experience is independently testable and deployable once upstream stories exist.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, documentation, and quality gates after story delivery.

- [X] T067 Implement idempotent seed runner for competitions, editions, teams, and matches in `scripts/seed.ts`.
- [X] T068 [P] Add Playwright scoreboard scenario covering polling and overlays in `e2e/specs/scoreboard.spec.ts`.
- [X] T069 [P] Add Playwright organizer onboarding journey in `e2e/specs/organizer-onboarding.spec.ts`.
- [X] T070 Refresh quickstart instructions with final commands in `specs/001-build-football-admin-app/quickstart.md`.
- [X] T071 Add accessibility regression tests using Pa11y in `src/ui/__tests__/accessibility.test.tsx` and configure `pa11y-ci` to run inside GitHub Actions.
- [X] T072 Add performance budget verification script for polling endpoints in `scripts/check-performance.ts`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → prerequisite for Foundational.
- **Foundational (Phase 2)** → prerequisite for all user stories.
- **User Story Order**: US1 → US2 → US3 → US4 → US5. Later stories rely on data structures and services established by earlier priorities.
- **Polish Phase** runs after all targeted user stories complete or when stabilization is scheduled.

## User Story Dependencies

- **US1**: Depends on Foundational only. Unlocks competition creation flows consumed by later stories.
- **US2**: Depends on US1 for competition data; otherwise independent.
- **US3**: Depends on US1 for editions and venues.
- **US4**: Depends on US1 for competitions and US3 for schedules; disputes interact with matches.
- **US5**: Depends on US3 for matches/results and US4 for squads/entries to render standings.

## Parallel Execution Examples

- **US1**: Run T013 and T014 together while T015 and T016 define schemas in parallel.
- **US2**: T026 and T027 can proceed while T028 builds audit schema independently.
- **US3**: T036 and T037 can execute concurrently before wiring services (T038, T039).
- **US4**: T047 and T048 can ship simultaneously before API handlers (T051–T055).
- **US5**: T059 and T060 run in parallel while T061 prepares services for API handlers.

## Implementation Strategy

1. **MVP First**: Complete Phases 1–2, then deliver US1 to unlock organizer onboarding as the minimum deployable slice.
2. **Incremental Delivery**: Layer US2–US5 sequentially, validating each story through its independent tests before moving forward.
3. **Parallel Staffing**: After Foundational, multiple contributors can tackle different user stories using the `[P]` tasks to avoid file conflicts.
