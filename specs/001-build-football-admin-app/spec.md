# Feature Specification: Modern Football Tournament Administration App

**Feature Branch**: `001-build-football-admin-app`  
**Created**: 2025-11-05  
**Last Updated**: 2025-11-05  
**Status**: Draft – 0 open clarifications

**Input (original brief)**: “Build a new football tournament administration application based on the legacy Laravel app in `/laravel`, using the existing Next.js starter as the foundation.”  
**Additional Direction**:
- Reference implementation patterns from https://github.com/kennethaasan/mattis.
- Retain functional parity with the Laravel app (tournaments, teams, players, matches, goals, leaderboard, scoreboard view).
- Deliver a modern UI (React + Tailwind CSS + Shadcn), authentication/authorization with better-auth, UUID v7 identifiers, and Norwegian Bokmål UI text (English code/logs).  
- Add new capabilities: multi-format tournaments, self-service team onboarding, improved scheduling, configurable big-screen display, and real-time updates via polling.

---

## Clarifications

### Session 2025-11-05
- Q: Do tournaments require integration with payment providers to reconcile the “paid” flag, or is manual tracking sufficient? → A: Remove the paid flag from phase one and revisit in a later release.
- Q: Are referee assignments in scope for phase one, or should the data model reserve space for future expansion? → A: Exclude referee data entirely in phase one; future releases can introduce it.
- Q: What is the expected ceiling for concurrent tournaments to ensure sizing of polling and caching layers? → A: 2 concurrent tournaments.
- Q: Should the platform support automated email/SMS delivery for notifications beyond basic email (e.g., SMS for urgent schedule changes)? → A: Stick to in-app + email notifications; defer SMS entirely.
- Q: What uptime target should the platform meet in phase one? → A: 99.0% monthly uptime (≤7h18m downtime).

---

## User Scenarios & Testing _(mandatory)_

### Primary User Stories

1. **Global Admin**: wants to create tournaments, assign tournament administrators, and oversee platform health.
2. **Tournament Administrator**: wants to configure tournament formats, schedule matches quickly, manage results, and control the public scoreboard.
3. **Team Manager**: wants to register a team, manage the squad, and stay informed about schedules and score updates.
4. **Spectator / Venue Staff**: wants a real-time big-screen experience showing live scores, upcoming matches, and top scorers without needing to log in.

### Acceptance Scenarios

1. **Invite Role Peer**: Given an authenticated user with role `tournament_admin` on Tournament A, when they invite a colleague by email, then the colleague receives an invitation, accepts it, and is granted the `tournament_admin` role for Tournament A only.
2. **Tournament Creation**: Given a global admin, when they create a tournament with name, slug, timezone, registration window, and scoreboard theme, then the tournament appears in the admin list with default phases (empty) and the public landing page is reachable via its slug.
3. **Round-Robin Wizard**: Given a tournament configured for group stage play, when the tournament admin selects teams, time slots, and fields, then the wizard generates a full round-robin schedule that can be reviewed, edited, and published in one action.
4. **Knockout Bracket**: Given a hybrid tournament with completed group standings, when the admin seeds the top teams into a knockout bracket, then the bracket auto-populates quarterfinals/semifinals/final (supporting byes) and future round placeholders reference winners of prior matches.
5. **Team Registration Flow**: Given a team manager with a platform account, when they submit a team registration for an open tournament, then the submission enters “pending” status and the tournament admin is notified to approve or reject it.
6. **Roster Management**: Given a team manager, when they add players with jersey numbers, then the roster shows validation errors for duplicate numbers and saves player details without requiring payment tracking.
7. **Live Scoring**: Given a tournament admin viewing a live match, when they record goals and cards with player attribution, then the live score, standings, and top-scorer list update immediately after the next poll cycle.
8. **Score Confirmation**: Given a team manager, when a match they participated in is marked final, then they can submit a confirmation (or dispute) that the tournament admin sees in their review queue.
9. **Schedule Change Notification**: Given a match is rescheduled, when the tournament admin publishes the new kickoff time, then affected team managers receive an in-app notification (and email if opted-in) within one poll cycle.
10. **Public Scoreboard Configuration**: Given a tournament admin editing display settings, when they adjust background and font colors and toggle modules (standings, upcoming matches, top scorers), then the public scoreboard updates within 5 seconds and respects accessibility contrast thresholds.
11. **Big-Screen Mode**: Given venue staff opening the scoreboard on a large display, when they enable auto-rotate between sections, then the screen cycles at the configured interval and highlights live matches distinctly from completed ones.
12. **UUID Compliance**: Given a developer inspects API responses for tournaments, matches, teams, players, or users, then all identifiers are UUID v7 strings without sequential integer IDs exposed.

### Edge Cases

- Team registration submitted after the registration window closes → reject with actionable messaging.
- Attempt to invite a user to a role they already possess → return success with idempotent response (no duplicate invitations).
- Match result submitted with a goal for a player not on the participating teams’ rosters → block and surface validation errors.
- Adjusting a group’s tie-break rules after matches are complete → re-rank standings immediately using the new order.
- Removing or reassigning a team after the schedule is published → require admin override and revalidation of affected matches.
- Scoreboard theme configured with insufficient contrast → warn and prevent publication until contrast passes WCAG 2.2 AA.
- Polling endpoint requested with stale cursor → return full payload up to maximum window rather than error.
- Tournament admin tries to delete a match that has dependent knockout references → block or require bracket detachment first.

---

## Requirements _(Functional)_

### Authentication & Roles

- **FR-001**: The system MUST support invite-based onboarding with email verification for the roles `admin`, `tournament_admin`, and `team_manager`.
- **FR-002**: Users MUST be able to invite additional users into the same role they hold (scope-aware): global admins invite admins, tournament admins invite peers for tournaments they manage, and team managers invite co-managers for their teams.
- **FR-003**: Role-based access control MUST restrict data visibility and actions to the appropriate scope (global for admins, per-tournament for tournament admins, per-team for team managers).
- **FR-004**: The platform MUST enforce session management with automatic sign-out on credential revocation and provide device/session listings for administrators.

### Tournament Setup & Formats

- **FR-010**: Administrators MUST be able to create and edit tournaments capturing name, slug, timezone, location, registration window, contact info, and status (draft, published, archived).
- **FR-011**: Tournaments MUST support configurable phases, including round-robin groups, knockout brackets, or hybrids (group -> knockout), with customizable ordering.
- **FR-012**: Tournament admins MUST assign teams to groups or knockout seeds and update assignments until the phase is locked.
- **FR-013**: A scheduling wizard MUST generate round-robin fixtures based on selected teams, groups, fields, start times, and interval lengths, allowing manual adjustments before publish.
- **FR-014**: The system MUST provide a knockout bracket builder that supports configurable bracket sizes, byes, third-place matches, and automatic progression of winners.
- **FR-015**: Tournament admins MUST manage playing fields/courts with labels, capacity notes, and availability slots to drive scheduling decisions.
- **FR-016**: Tournament settings MUST include configurable scoreboard themes (primary/secondary background, accent, font colors, optional background image) with validation against accessibility contrast rules.

### Team Registration & Management

- **FR-020**: Team managers MUST be able to submit team registrations to tournaments during open periods, including team metadata (name, short name, colors, category) and manager contact details.
- **FR-021**: Tournament admins MUST review registration requests, approve or reject them with rationale, and the system SHALL notify the submitting manager of the outcome.
- **FR-022**: The system MUST allow multiple team managers per team and provide quick context switching between teams they manage.
- **FR-023**: Tournament admins MUST be able to freeze team registrations once scheduling begins to prevent structural drift.

### Player Management

- **FR-030**: Team managers MUST manage player rosters, capturing first name, last name, display name, jersey number (unique per team), position, and date of birth (optional).
- **FR-031**: The system MUST present accessible validation feedback for roster issues (e.g., duplicate jersey numbers, missing names).
- **FR-032**: Team managers SHOULD be able to track player availability (available, doubtful, injured, suspended) for internal planning.
- **FR-033**: Tournament admins MUST have read-only access to all team rosters and export them (CSV/Excel) for operational use.
- **FR-034**: Payment tracking is deferred for phase one; no paid flag or fee reconciliation is exposed in roster or registration flows.

### Match Scheduling & Results

- **FR-040**: Tournament admins MUST manage match details (phase, group code, round, kickoff timestamp, field, status) with versioning to track changes.
- **FR-041**: Match codes (e.g., A, B, Q1, F) MUST remain configurable per tournament while providing sensible defaults matching the legacy app.
- **FR-042**: The system MUST support recording regulation scores, extra-time scores, penalty shootouts, and special outcomes (forfeit, cancelled, postponed) with administrative notes.
- **FR-043**: Live match events (goal, own goal, penalty goal, assist, yellow/red card) MUST be captured with player attribution, minute, and stoppage time.
- **FR-044**: Standings, statistics, and advancement logic MUST recalculate immediately whenever match scores or events change.
- **FR-045**: Team managers MUST be able to submit score confirmations or disputes that queue for tournament admin review before finalization.
- **FR-046**: The system SHOULD generate printable and shareable schedule views by team, by field, and by day.
- **FR-047**: Phase-one implementation omits referee assignments entirely; data model and UI MUST not surface referee fields until a later release.

### Statistics & Public Display

- **FR-050**: Group standings MUST follow the ranking order: points (3/1/0), goal differential, goals scored, head-to-head mini-table, and fair play (yellow/red cards) as a final tiebreaker.
- **FR-051**: Top-scorer leaderboards MUST list at least the top 25 players with ties handled alphabetically, and support filters by group or knockout stage.
- **FR-052**: Team dashboards MUST summarize results, upcoming matches, and cumulative stats (wins, draws, losses, goals for/against, points).
- **FR-053**: Each tournament MUST expose a public landing page with schedule, results, standings, top scorers, and venue information, accessible without authentication.
- **FR-054**: The big-screen scoreboard MUST allow configurable sections (e.g., rotating between live matches, upcoming fixtures, standings, top scorers) and display time since last refresh.
- **FR-055**: Tournament admins MUST be able to trigger highlight overlays (e.g., “Finale starter nå”) for the scoreboard, lasting a configurable duration.

### Notifications & Collaboration

- **FR-060**: A poll-based feed endpoint MUST return match, schedule, and registration changes since a provided cursor to power dashboards and the scoreboard.
- **FR-061**: Team managers MUST receive in-app notifications (and optional email digests) for match schedule changes, score finalizations, and disputed results resolutions.
- **FR-062**: Tournament admins SHOULD receive alerts when score confirmations remain unreviewed beyond a configurable SLA.
- **FR-063**: SMS delivery is out of scope for phase one; notification channels are limited to in-app and email.

### Audit & Compliance

- **FR-070**: The system MUST maintain an immutable audit log for critical actions (role assignments, schedule edits, result changes, scoreboard configuration updates) including actor, timestamp, and before/after snapshots.
- **FR-071**: Audit trails MUST be filterable by tournament, entity type, and actor, with export capability for compliance reviews.

### Localization & Accessibility

- **FR-080**: UI text presented to end users MUST be Norwegian Bokmål, while database fields, code, logging, and API responses remain US English.
- **FR-081**: The system MUST support editing localized strings for tournament-specific terminology (e.g., custom scoreboard section titles) without touching source code.
- **FR-082**: All interactive surfaces, including the scoreboard, MUST comply with WCAG 2.2 AA (keyboard navigation, focus management, contrast).
- **FR-083**: Error messages surfaced to users MUST be localized (Norwegian), while API error payloads use English messages for developer clarity.

---

## Non-Functional Requirements

- **NFR-001**: The application MUST use Next.js (App Router) with React 19 and Node.js 22, written in TypeScript (ES2022 target).
- **NFR-002**: Styling MUST rely on Tailwind CSS (v4) with Shadcn UI for accessible, composable components.
- **NFR-003**: Authentication MUST integrate with better-auth to provide secure session handling, MFA readiness, and role-aware invitations.
- **NFR-004**: All persistent identifiers (users, tournaments, teams, players, matches, events, notifications) MUST be UUID v7.
- **NFR-005**: APIs MUST be described in an OpenAPI 3.1 contract, validated via Spectral, and surfaced through a typed client consumed by the frontend.
- **NFR-006**: Polling endpoints MUST respond within 200 ms at p95 under expected tournament load (≤ 10 active matches) and support ETag/If-None-Match for caching.
- **NFR-007**: Logging MUST use structured logs (pino) with correlation IDs across API boundaries; audit events must emit to a dedicated channel.
- **NFR-008**: Automated testing MUST cover unit/integration scenarios with Vitest, E2E flows with Playwright, and maintain ≥ 85 % statement coverage.
- **NFR-009**: Continuous integration MUST run linting (Biome), type-checking, contract validation, and tests on every push; deploy pipelines MUST use concurrency controls.
- **NFR-010**: Data seeding MUST provide sample tournaments, teams, and matches for local development without conflicting with production IDs.
- **NFR-011**: Localization infrastructure MUST allow serving Norwegian UI strings from resource files without rebuild and fall back to English keys if missing.
- **NFR-012**: Scoreboard polling interval MUST be configurable (default 5 s) with safeguards preventing values below 2 s.
- **NFR-013**: Infrastructure sizing assumptions MUST target support for up to 2 concurrent active tournaments without performance degradation.
- **NFR-014**: The hosted platform MUST achieve ≥ 99.0 % uptime per calendar month (≤ 7 h 18 m downtime) with documented incident response procedures.

---

## Analytics & Observability

- **AO-001**: Instrument key lifecycle events (`UserInvited`, `TournamentPublished`, `ScheduleGenerated`, `MatchStarted`, `MatchFinalized`, `ScoreDisputed`, `ScoreboardViewed`) with metadata for dashboards.
- **AO-002**: Capture metrics for queue depths (score confirmations pending), scoreboard poll counts, average schedule lead time, and top API latencies.
- **AO-003**: Provide health endpoints for database, background workers (notifications), and polling freshness to surface on admin dashboards.

---

## Open Questions / Follow-Ups
